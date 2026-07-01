const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Analytics = require('../models/Analytics');
const ErrorLog = require('../models/ErrorLog');

// Resolve the Python executable dynamically
const getPythonPath = () => {
  const winVenv = path.join(__dirname, '../../python-engine/venv/Scripts/python.exe');
  const nixVenv = path.join(__dirname, '../../python-engine/venv/bin/python');
  
  if (fs.existsSync(winVenv)) return winVenv;
  if (fs.existsSync(nixVenv)) return nixVenv;
  return 'python'; // Fallback to system path
};

// Spawn Python process and communicate via standard input/output
const executePython = (scriptName, payload) => {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath();
    const scriptPath = path.join(__dirname, '../../python-engine/modules', scriptName);
    
    if (!fs.existsSync(scriptPath)) {
      return reject(new Error(`Python script not found: ${scriptPath}`));
    }
    
    const pyProcess = spawn(pythonPath, [scriptPath]);
    
    let stdout = '';
    let stderr = '';
    
    pyProcess.stdin.write(JSON.stringify(payload));
    pyProcess.stdin.end();
    
    pyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pyProcess.on('close', (code) => {
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
  });
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

// Core Handlers
exports.mergePDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.files || req.files.length < 2) {
    return res.status(400).json({ success: false, error: 'Please upload at least 2 PDF files to merge.' });
  }
  
  const filePaths = req.files.map(f => f.path);
  const totalSize = req.files.reduce((sum, f) => sum + f.size, 0);
  const outputFileName = `merged-${uuidv4()}.pdf`;
  const outputPath = path.join(__dirname, '../processed', outputFileName);
  
  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'merge',
      files: filePaths,
      output: outputPath
    });
    
    await logAnalytics('merge', filePaths.length, totalSize, 'success', startTime);
    cleanUpFiles(filePaths); // Clean input uploads
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('merge', filePaths.length, totalSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles(filePaths);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.splitPDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file to split.' });
  }
  
  const { splitMode, range } = req.body; // 'all' or 'range'
  const fileSize = req.file.size;
  const outputDir = path.join(__dirname, '../processed');
  
  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'split',
      file: req.file.path,
      output_dir: outputDir,
      split_mode: splitMode || 'all',
      range: range || ''
    });
    
    const outputFileName = path.basename(resultPath);
    
    await logAnalytics('split', 1, fileSize, 'success', startTime);
    cleanUpFiles([req.file.path]);
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('split', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles([req.file.path]);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.rotatePDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file to rotate.' });
  }
  
  const degrees = parseInt(req.body.degrees) || 90;
  const fileSize = req.file.size;
  const outputFileName = `rotated-${uuidv4()}.pdf`;
  const outputPath = path.join(__dirname, '../processed', outputFileName);
  
  try {
    const resultPath = await executePython('basic_manipulation.py', {
      action: 'rotate',
      file: req.file.path,
      output: outputPath,
      degrees: degrees
    });
    
    await logAnalytics('rotate', 1, fileSize, 'success', startTime);
    cleanUpFiles([req.file.path]);
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('rotate', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles([req.file.path]);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.protectPDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file to protect.' });
  }
  
  const { password } = req.body;
  if (!password) {
    cleanUpFiles([req.file.path]);
    return res.status(400).json({ success: false, error: 'Password is required to encrypt the PDF.' });
  }
  
  const fileSize = req.file.size;
  const outputFileName = `protected-${uuidv4()}.pdf`;
  const outputPath = path.join(__dirname, '../processed', outputFileName);
  
  try {
    const resultPath = await executePython('security.py', {
      action: 'protect',
      file: req.file.path,
      output: outputPath,
      password: password
    });
    
    await logAnalytics('protect', 1, fileSize, 'success', startTime);
    cleanUpFiles([req.file.path]);
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('protect', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles([req.file.path]);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.unlockPDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file to unlock.' });
  }
  
  const { password } = req.body;
  const fileSize = req.file.size;
  const outputFileName = `unlocked-${uuidv4()}.pdf`;
  const outputPath = path.join(__dirname, '../processed', outputFileName);
  
  try {
    const resultPath = await executePython('security.py', {
      action: 'unlock',
      file: req.file.path,
      output: outputPath,
      password: password || ''
    });
    
    await logAnalytics('unlock', 1, fileSize, 'success', startTime);
    cleanUpFiles([req.file.path]);
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('unlock', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles([req.file.path]);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.watermarkPDF = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }
  
  const { text, fontSize, opacity, color } = req.body;
  const fileSize = req.file.size;
  const outputFileName = `watermarked-${uuidv4()}.pdf`;
  const outputPath = path.join(__dirname, '../processed', outputFileName);
  
  try {
    const resultPath = await executePython('security.py', {
      action: 'watermark',
      file: req.file.path,
      output: outputPath,
      text: text || 'CONFIDENTIAL',
      font_size: parseInt(fontSize) || 40,
      opacity: parseFloat(opacity) || 0.3,
      color: color || '#888888'
    });
    
    await logAnalytics('watermark', 1, fileSize, 'success', startTime);
    cleanUpFiles([req.file.path]);
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('watermark', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles([req.file.path]);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.pdfToJpg = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }
  
  const fileSize = req.file.size;
  const outputDir = path.join(__dirname, '../processed');
  
  try {
    const resultPath = await executePython('image_convert.py', {
      action: 'pdf2jpg',
      file: req.file.path,
      output_dir: outputDir
    });
    
    const outputFileName = path.basename(resultPath);
    
    await logAnalytics('pdf2jpg', 1, fileSize, 'success', startTime);
    cleanUpFiles([req.file.path]);
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('pdf2jpg', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles([req.file.path]);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.jpgToPdf = async (req, res) => {
  const startTime = Date.now();
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'Please upload at least one image file.' });
  }
  
  const filePaths = req.files.map(f => f.path);
  const totalSize = req.files.reduce((sum, f) => sum + f.size, 0);
  const outputFileName = `images-${uuidv4()}.pdf`;
  const outputPath = path.join(__dirname, '../processed', outputFileName);
  
  try {
    const resultPath = await executePython('image_convert.py', {
      action: 'jpg2pdf',
      images: filePaths,
      output: outputPath
    });
    
    await logAnalytics('jpg2pdf', filePaths.length, totalSize, 'success', startTime);
    cleanUpFiles(filePaths);
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('jpg2pdf', filePaths.length, totalSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles(filePaths);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.wordToPdf = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a Word file (.docx).' });
  }
  
  const fileSize = req.file.size;
  const outputFileName = `docx-${uuidv4()}.pdf`;
  const outputPath = path.join(__dirname, '../processed', outputFileName);
  
  try {
    const resultPath = await executePython('doc_convert.py', {
      action: 'word2pdf',
      file: req.file.path,
      output: outputPath
    });
    
    await logAnalytics('word2pdf', 1, fileSize, 'success', startTime);
    cleanUpFiles([req.file.path]);
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('word2pdf', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles([req.file.path]);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.excelToPdf = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload an Excel file (.xlsx).' });
  }
  
  const fileSize = req.file.size;
  const outputFileName = `xlsx-${uuidv4()}.pdf`;
  const outputPath = path.join(__dirname, '../processed', outputFileName);
  
  try {
    const resultPath = await executePython('doc_convert.py', {
      action: 'excel2pdf',
      file: req.file.path,
      output: outputPath
    });
    
    await logAnalytics('excel2pdf', 1, fileSize, 'success', startTime);
    cleanUpFiles([req.file.path]);
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('excel2pdf', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles([req.file.path]);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.pdfToWord = async (req, res) => {
  const startTime = Date.now();
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Please upload a PDF file.' });
  }
  
  const fileSize = req.file.size;
  const outputFileName = `converted-${uuidv4()}.docx`;
  const outputPath = path.join(__dirname, '../processed', outputFileName);
  
  try {
    const resultPath = await executePython('doc_convert.py', {
      action: 'pdf2word',
      file: req.file.path,
      output: outputPath
    });
    
    await logAnalytics('pdf2word', 1, fileSize, 'success', startTime);
    cleanUpFiles([req.file.path]);
    
    res.json({
      success: true,
      downloadUrl: `/processed/${outputFileName}`,
      fileName: outputFileName,
      size: fs.statSync(resultPath).size
    });
  } catch (err) {
    await logAnalytics('pdf2word', 1, fileSize, 'failed', startTime, err.message, err.stack);
    cleanUpFiles([req.file.path]);
    res.status(500).json({ success: false, error: err.message });
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
    
    cleanDir(processedDir);
    cleanDir(uploadsDir);
  }, 15 * 60 * 1000); // Check every 15 minutes
};
