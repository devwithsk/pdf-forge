const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Analytics = require('../models/Analytics');
const ErrorLog = require('../models/ErrorLog');
const PQueueModule = require('p-queue');
const PQueue = PQueueModule.default || PQueueModule;
const { createDownloadToken } = require('../utils/downloadStore');

// Helper to isolate uploaded files inside request-specific job directories
const moveFileToJobDir = (file, jobDir) => {
  if (!file || !file.path) return '';
  const newPath = path.join(jobDir, path.basename(file.path));
  fs.renameSync(file.path, newPath);
  file.path = newPath;
  return newPath;
};

const moveFilesToJobDir = (files, jobDir) => {
  if (!files || files.length === 0) return [];
  return files.map(file => moveFileToJobDir(file, jobDir));
};

// Initialize queue with specified concurrency limit
const queue = new PQueue({ concurrency: Number(process.env.PYTHON_CONCURRENCY || 2) });

// Resolve the Python executable dynamically
const getPythonPath = () => {
  const winVenv = path.join(__dirname, '../../python-engine/venv/Scripts/python.exe');
  const nixVenv = path.join(__dirname, '../../python-engine/venv/bin/python');
  
  if (fs.existsSync(winVenv)) return winVenv;
  if (fs.existsSync(nixVenv)) return nixVenv;
  return 'python'; // Fallback to system path
};

// Spawn Python process and communicate via standard input/output
const executePython = (scriptName, payload, timeoutMs = 120000) => {
  return queue.add(() => new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    const scriptPath = path.join(__dirname, '../../python-engine/modules', scriptName);
    
    if (!fs.existsSync(scriptPath)) {
      return reject(new Error(`Python script not found: ${scriptPath}`));
    }
    
    const pyProcess = spawn(pythonPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
    
    const timer = setTimeout(() => {
      pyProcess.kill('SIGKILL');
      reject(new Error('Processing timed out. Try a smaller file.'));
    }, timeoutMs);
    
    let stdout = '';
    let stderr = '';
    let killedDueToSize = false;
    
    pyProcess.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    
    pyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      if (stdout.length > 1048576) {
        killedDueToSize = true;
        pyProcess.kill('SIGKILL');
      }
    });
    
    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      if (stderr.length > 1048576) {
        killedDueToSize = true;
        pyProcess.kill('SIGKILL');
      }
    });
    
    pyProcess.on('close', (code) => {
      clearTimeout(timer);
      if (killedDueToSize) {
        return reject(new Error('Python processing exceeded output limits.'));
      }
      
      if (code !== 0) {
        return reject(new Error(`Python script error (code ${code}): ${stderr || 'Unknown script crash'}`));
      }
      try {
        const response = JSON.parse(stdout.trim());
        if (response.success) {
          resolve(response.output);
        } else {
          reject(new Error(response.error || 'Python processing failed'));
        }
      } catch (err) {
        reject(new Error(`Invalid JSON output from Python script: ${stdout.substring(0, 500)}. Error: ${err.message}`));
      }
    });
    
    pyProcess.stdin.write(JSON.stringify(payload));
    pyProcess.stdin.end();
  }));
};

// Spawn Python process with command-line arguments and communicate via stdout/stderr
const spawnPythonArgs = (scriptName, args, timeoutMs = 120000) => {
  return queue.add(() => new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    const scriptPath = path.join(__dirname, '../../python-engine/modules', scriptName);
    
    if (!fs.existsSync(scriptPath)) {
      return reject(new Error(`Python script not found: ${scriptPath}`));
    }
    
    console.log(`[spawnPythonArgs] Running: ${pythonPath} ${scriptPath} ${args.join(' ')}`);
    const pyProcess = spawn(pythonPath, [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
    
    const timer = setTimeout(() => {
      pyProcess.kill('SIGKILL');
      reject(new Error('Processing timed out. Try a smaller file.'));
    }, timeoutMs);
    
    let stdout = '';
    let stderr = '';
    let killedDueToSize = false;
    
    pyProcess.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    
    pyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      if (stdout.length > 1048576) {
        killedDueToSize = true;
        pyProcess.kill('SIGKILL');
      }
    });
    
    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      if (stderr.length > 1048576) {
        killedDueToSize = true;
        pyProcess.kill('SIGKILL');
      }
    });
    
    pyProcess.on('close', (code) => {
      clearTimeout(timer);
      if (killedDueToSize) {
        return reject(new Error('Python processing exceeded output limits.'));
      }
      
      if (code !== 0) {
        return reject(new Error(`Python script error (code ${code}): ${stderr || 'Unknown script crash'}`));
      }
      try {
        const response = JSON.parse(stdout.trim());
        if (response.success) {
          resolve(response.output);
        } else {
          reject(new Error(response.error || 'Python processing failed'));
        }
      } catch (err) {
        reject(new Error(`Invalid JSON output from Python script: ${stdout.substring(0, 500)}. Error: ${err.message}`));
      }
    });
  }));
};

// Clean user-facing error messages by removing technical prefixes and absolute file path names
const sanitizeErrorMessage = (message, req) => {
  if (!message) return 'An error occurred during processing.';
  
  let cleanMessage = message;
  
  // Replace absolute file paths with just the basename
  if (req.file && req.file.path) {
    const fullPath = req.file.path;
    const baseName = path.basename(fullPath);
    cleanMessage = cleanMessage.split(fullPath).join(baseName);
    const altPath = fullPath.replace(/\\/g, '/');
    cleanMessage = cleanMessage.split(altPath).join(baseName);
  }
  
  if (req.files) {
    req.files.forEach(f => {
      const fullPath = f.path;
      const baseName = path.basename(fullPath);
      cleanMessage = cleanMessage.split(fullPath).join(baseName);
      const altPath = fullPath.replace(/\\/g, '/');
      cleanMessage = cleanMessage.split(altPath).join(baseName);
    });
  }
  
  // Simplify decryption password error
  if (cleanMessage.toLowerCase().includes('password') && (cleanMessage.toLowerCase().includes('decrypt') || cleanMessage.toLowerCase().includes('incorrect') || cleanMessage.toLowerCase().includes('invalid'))) {
    return 'Failed to decrypt PDF: invalid password';
  }
  
  // Remove technical prefixes like "Python script error (code 1): ValueError: "
  cleanMessage = cleanMessage.replace(/^Python script error \(code \d+\): \w+Error: /, '');
  cleanMessage = cleanMessage.replace(/^Python script error \(code \d+\): /, '');
  
  return cleanMessage.trim();
};

// Log analytics to MongoDB (with try-catch to keep running if MongoDB connection is missing)
const logAnalytics = async (toolName, filesCount, totalSize, status, startTime, errorMessage = null, stackTrace = null) => {
  const duration = Date.now() - startTime;
  try {
    const analytic = new Analytics({
      toolName,
      filesCount,
      totalSize,
      status,
      processingTimeMs: duration
    });
    await analytic.save();
    
    if (status === 'failed' && errorMessage) {
      const errorLog = new ErrorLog({
        toolName,
        errorMessage,
        stackTrace
      });
      await errorLog.save();
    }
  } catch (err) {
    console.error(`[Analytics Log Error] ${err.message}`);
  }
};

// Delete files asynchronously
const cleanUpFiles = (filePaths) => {
  filePaths.forEach(filePath => {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`[Cleanup Error] Failed to delete ${filePath}:`, err.message);
      });
    }
  });
};

// Helper to initialize job directory and move uploaded files
const initJob = (req) => {
  const jobId = uuidv4();
  const jobDir = path.join(__dirname, '../jobs', jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  
  let inputPaths = [];
  if (req.file) {
    const newPath = moveFileToJobDir(req.file, jobDir);
    inputPaths.push(newPath);
  }
  if (req.files) {
    const newPaths = moveFilesToJobDir(req.files, jobDir);
    inputPaths.push(...newPaths);
  }
  
  return { jobId, jobDir, inputPaths };
};

// Helper to clean up job directory: deletes input uploads on success, deletes entire folder on failure
const cleanupJob = (jobDir, inputPaths, success = true) => {
  if (success) {
    inputPaths.forEach(fp => {
      if (fp && fs.existsSync(fp)) {
        try { fs.unlinkSync(fp); } catch (e) {}
      }
    });
  } else {
    if (jobDir && fs.existsSync(jobDir)) {
      try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch (e) {}
    }
  }
};

// Core Handlers
exports.mergePDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.files || req.files.length < 2) {
    return res.status(400).json({ success: false, error: 'Please upload at least 2 PDF files to merge.' });
  }
  
  const { jobDir, inputPaths } = initJob(req);
  const totalSize = req.files.reduce((sum, f) => sum + f.size, 0);
  const outputFileName = `merged-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  const addBlankPage = settings.addBlankPage === true;
  const compress = settings.compress === true;
  
  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'merge',
      files: inputPaths,
      output: outputPath,
      add_blank_page: addBlankPage,
      compress: compress
    });
    
    await logAnalytics('merge', inputPaths.length, totalSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('merge', req.files.length, totalSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.splitPDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file to split.' });
  }
  
  const { splitMode, range } = req.body; // 'all' or 'range'
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  
  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'split',
      file: inputPaths[0],
      output_dir: jobDir,
      split_mode: splitMode || 'all',
      range: range || ''
    });
    
    const outputFileName = path.basename(resultPath);
    
    await logAnalytics('split', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('split', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.rotatePDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file to rotate.' });
  }
  
  const degrees = parseInt(req.body.degrees) || 90;
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `rotated-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'rotate',
      file: inputPaths[0],
      output: outputPath,
      degrees: degrees
    });
    
    await logAnalytics('rotate', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('rotate', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.compressPDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file to compress.' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `compressed-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  const compressionLevel = settings.compressionLevel || 'recommended';
  
  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'compress',
      file: inputPaths[0],
      output: outputPath,
      compression_level: compressionLevel
    });
    
    await logAnalytics('compress', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('compress', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.repairPDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file to repair.' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `repaired-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'repair',
      file: inputPaths[0],
      output: outputPath
    });
    
    await logAnalytics('repair', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('repair', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.protectPDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file to protect.' });
  }
  
  const { password } = req.body;
  if (!password) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(400).json({ success: false, error: 'Password is required to encrypt the PDF.' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `protected-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  try {
    const resultPath = await executePython('security.py', {
      action: 'protect',
      file: inputPaths[0],
      output: outputPath,
      password: password
    });
    
    await logAnalytics('protect', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('protect', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.unlockPDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file to unlock.' });
  }
  
  const { password } = req.body;
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `unlocked-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  try {
    const resultPath = await executePython('security.py', {
      action: 'unlock',
      file: inputPaths[0],
      output: outputPath,
      password: password || ''
    });
    
    await logAnalytics('unlock', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('unlock', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    const friendlyError = sanitizeErrorMessage(err.message, req);
    res.status(500).json({ success: false, error: friendlyError });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.watermarkPDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }
  
  const { text, fontSize, opacity, color } = req.body;
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `watermarked-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  try {
    const resultPath = await executePython('security.py', {
      action: 'watermark',
      file: inputPaths[0],
      output: outputPath,
      text: text || 'CONFIDENTIAL',
      font_size: parseInt(fontSize) || 40,
      opacity: parseFloat(opacity) || 0.3,
      color: color || '#888888'
    });
    
    await logAnalytics('watermark', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('watermark', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.addPageNumbers = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `numbered-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  const position = settings.position || 'bottom_center';
  const startingNumber = parseInt(settings.startingNumber) || 1;
  
  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'numbers',
      file: inputPaths[0],
      output: outputPath,
      position: position,
      starting_number: startingNumber
    });
    
    await logAnalytics('numbers', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('numbers', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.pdfToJpg = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  const format = settings.format || 'jpg';
  const dpi = parseInt(settings.dpi) || 120;
  const quality = parseInt(settings.quality) || 82;
  
  try {
    const resultPath = await executePython('image_convert.py', {
      action: 'pdf2jpg',
      file: inputPaths[0],
      output_dir: jobDir,
      format: format,
      dpi: dpi,
      quality: quality
    });
    
    const outputFileName = path.basename(resultPath);
    
    await logAnalytics('pdf2jpg', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('pdf2jpg', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.jpgToPdf = async (req, res) => {
  const startTime = Date.now();
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'Please upload at least one image file.' });
  }
  
  const { jobDir, inputPaths } = initJob(req);
  const totalSize = req.files.reduce((sum, f) => sum + f.size, 0);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  const paperSize = settings.paperSize || 'A4';
  const orientation = settings.orientation || 'portrait';
  const mergeMode = settings.mode || 'merge';
  
  const outputFileName = mergeMode === 'individual' ? `images-${uuidv4()}.zip` : `images-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  try {
    const resultPath = await spawnPythonArgs('image_convert.py', [
      'jpg2pdf',
      inputPaths.join(','),
      outputPath,
      paperSize,
      orientation,
      mergeMode
    ]);
    
    await logAnalytics('jpg2pdf', inputPaths.length, totalSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('jpg2pdf', req.files.length, totalSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.wordToPdf = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a Word file (.docx).' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `docx-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  try {
    const resultPath = await executePython('doc_convert.py', {
      action: 'word2pdf',
      file: inputPaths[0],
      output: outputPath,
      settings: settings
    });
    
    await logAnalytics('word2pdf', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('word2pdf', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.excelToPdf = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload an Excel file (.xlsx).' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `xlsx-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  try {
    const resultPath = await executePython('doc_convert.py', {
      action: 'excel2pdf',
      file: inputPaths[0],
      output: outputPath,
      settings: settings
    });
    
    await logAnalytics('excel2pdf', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('excel2pdf', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.pdfToWord = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `converted-${uuidv4()}.docx`;
  const outputPath = path.join(jobDir, outputFileName);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  try {
    const resultPath = await executePython('doc_convert.py', {
      action: 'pdf2word',
      file: inputPaths[0],
      output: outputPath,
      settings: settings
    });
    
    await logAnalytics('pdf2word', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('pdf2word', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.pdfToExcel = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `excel-${uuidv4()}.xlsx`;
  const outputPath = path.join(jobDir, outputFileName);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  try {
    const resultPath = await executePython('doc_convert.py', {
      action: 'pdf2excel',
      file: inputPaths[0],
      output: outputPath,
      settings: settings
    });
    
    await logAnalytics('pdf2excel', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('pdf2excel', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.pdfToPowerPoint = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `presentation-${uuidv4()}.pptx`;
  const outputPath = path.join(jobDir, outputFileName);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  try {
    const resultPath = await executePython('doc_convert.py', {
      action: 'pdf2ppt',
      file: inputPaths[0],
      output: outputPath,
      settings: settings
    });
    
    await logAnalytics('pdf2ppt', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('pdf2ppt', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.powerpointToPdf = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PowerPoint presentation (.pptx).' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `presentation-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  try {
    const resultPath = await executePython('doc_convert.py', {
      action: 'ppt2pdf',
      file: inputPaths[0],
      output: outputPath,
      settings: settings
    });
    
    await logAnalytics('ppt2pdf', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('ppt2pdf', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.htmlToPdf = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload an HTML document.' });
  }
  
  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `html-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);
  
  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  
  try {
    const resultPath = await executePython('doc_convert.py', {
      action: 'html2pdf',
      file: inputPaths[0],
      output: outputPath,
      settings: settings
    });
    
    await logAnalytics('html2pdf', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);
    
    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('html2pdf', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.removePages = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }

  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `removed-pages-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);

  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }

  const pageOrder = Array.isArray(settings.pageOrder) ? settings.pageOrder.map(Number) : [];
  if (pageOrder.length === 0) {
    cleanupJob(jobDir, inputPaths, false);
    return res.status(400).json({ success: false, error: 'No pages selected. Please keep at least one page.' });
  }

  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'reorder',
      file: inputPaths[0],
      output: outputPath,
      page_order: pageOrder
    });

    await logAnalytics('remove-pages', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);

    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('remove-pages', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

exports.organizePdf = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }

  const fileSize = req.file.size;
  const { jobDir, inputPaths } = initJob(req);
  const outputFileName = `organized-${uuidv4()}.pdf`;
  const outputPath = path.join(jobDir, outputFileName);

  let settings = {};
  if (req.body.settings) {
    try {
      settings = typeof req.body.settings === 'string' ? JSON.parse(req.body.settings) : req.body.settings;
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }

  const pageOrder = Array.isArray(settings.pageOrder) ? settings.pageOrder.map(Number) : [];
  if (pageOrder.length === 0) {
    cleanupJob(jobDir, inputPaths, false);
    return res.status(400).json({ success: false, error: 'No pages in order array. Please provide a valid page order.' });
  }

  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'reorder',
      file: inputPaths[0],
      output: outputPath,
      page_order: pageOrder
    });

    await logAnalytics('organize-pdf', 1, fileSize, 'success', startTime);
    const token = createDownloadToken(resultPath, outputFileName);

    res.json({
      success: true,
      downloadUrl: `/download/${token}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('organize-pdf', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanupJob(jobDir, inputPaths, false);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    cleanupJob(jobDir, inputPaths, true);
  }
};

// API Endpoint to fetch general conversion metrics for frontend visual show
exports.getAnalytics = async (req, res) => {
  try {
    const totalConversions = await Analytics.countDocuments({ status: 'success' });
    const toolBreakdown = await Analytics.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: '$toolName', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      data: {
        totalConversions,
        toolBreakdown: toolBreakdown.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Periodic file cleanup function (run every 15 minutes, deletes processed files older than 30 mins)
exports.startPeriodicCleanup = () => {
  const processedDir = path.join(__dirname, '../processed');
  const uploadsDir = path.join(__dirname, '../uploads');
  const jobsDir = path.join(__dirname, '../jobs');
  const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
  
  setInterval(() => {
    console.log('[Cleanup] Scanning temporary files...');
    const now = Date.now();
    
    const cleanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      fs.readdir(dir, (err, files) => {
        if (err) return console.error('[Cleanup Error]', err.message);
        
        files.forEach(file => {
          if (file === '.gitkeep') return;
          const filePath = path.join(dir, file);
          fs.stat(filePath, (statErr, stats) => {
            if (statErr) return;
            const age = now - stats.mtimeMs;
            if (age > MAX_AGE_MS) {
              fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error(`[Cleanup Error] Failed to delete ${file}:`, unlinkErr.message);
                else console.log(`[Cleanup] Deleted stale file: ${file}`);
              });
            }
          });
        });
      });
    };
    
    const cleanJobsDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      fs.readdir(dir, (err, subdirs) => {
        if (err) return;
        subdirs.forEach(subdir => {
          if (subdir === '.gitkeep') return;
          const subdirPath = path.join(dir, subdir);
          fs.stat(subdirPath, (statErr, stats) => {
            if (statErr) return;
            const age = now - stats.mtimeMs;
            if (age > MAX_AGE_MS) {
              fs.rm(subdirPath, { recursive: true, force: true }, (rmErr) => {
                if (rmErr) console.error(`[Cleanup Error] Failed to delete job dir ${subdir}:`, rmErr.message);
                else console.log(`[Cleanup] Deleted stale job directory: ${subdir}`);
              });
            }
          });
        });
      });
    };
    
    cleanDir(processedDir);
    cleanDir(uploadsDir);
    cleanJobsDir(jobsDir);
  }, 15 * 60 * 1000); // Check every 15 minutes
};
