const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'PDF-Utility-Platform-Security-Audit.pdf');

const report = [
  { type: 'title', text: 'PDF Utility Platform - Security & Architecture Audit' },
  { type: 'meta', text: 'Role: Senior Full-Stack Architect and Lead Security Auditor' },
  { type: 'meta', text: 'Scope: React/Vite frontend, Express/Multer backend, Node-to-Python processing bridge, Python PDF/document engines, Docker runtime, and temp-file lifecycle.' },
  { type: 'h1', text: 'Executive Summary' },
  { type: 'p', text: 'The core architecture is workable and avoids the worst command-injection mistake because Python is spawned with argument arrays instead of shell interpolation. However, the platform is currently vulnerable to resource exhaustion and unsafe file-processing risks. The highest-risk issues are missing server-side file type validation, unbounded Python processing, no child-process timeout/concurrency control, and public static exposure of processed files.' },

  { type: 'h1', text: '1. Security Vulnerabilities' },
  { type: 'h2', text: '[HIGH] Server-side upload validation is extension-only or absent' },
  { type: 'p', text: 'Affected files: backend-api/middlewares/upload.js, backend-api/routes/pdfRoutes.js, frontend/src/components/DragDropZone.jsx.' },
  { type: 'p', text: 'Multer limits file size to 50 MB, but it does not validate MIME type, magic bytes, page count, image dimensions, or file structure. The frontend checks extensions, but client-side checks are bypassable.' },
  { type: 'p', text: 'Risk: an attacker can upload a renamed binary, malformed PDF, image decompression bomb, or Office ZIP bomb and force Python libraries to parse it.' },
  { type: 'code', text: `// backend-api/middlewares/upload.js
const allowed = {
  '.pdf': ['application/pdf'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.html': ['text/html'],
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed[ext] || !allowed[ext].includes(file.mimetype)) {
    return cb(new Error(\`Unsupported file type: \${ext}\`));
  }
  cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 20, fields: 20, parts: 40 },
});` },
  { type: 'code', text: `const { fileTypeFromFile } = require('file-type');

async function assertMagicType(filePath, allowedMime) {
  const detected = await fileTypeFromFile(filePath);
  if (!detected || !allowedMime.includes(detected.mime)) {
    throw new Error('Uploaded file content does not match expected type.');
  }
}` },

  { type: 'h2', text: '[HIGH] PDF/image/document bombs can exhaust CPU and memory' },
  { type: 'p', text: 'Affected files: python-engine/modules/image_convert.py, basic_manipulation.py, doc_convert.py.' },
  { type: 'p', text: 'Examples: convert_from_path(file_path, dpi=150) converts all pages at once. PdfReader loops all pages. pdf2docx converts the whole document. openpyxl and python-pptx parse entire Office files.' },
  { type: 'p', text: 'Risk: a small compressed file can expand into thousands of pages, huge images, or massive XML payloads and crash the Hugging Face Space.' },
  { type: 'code', text: `# python-engine/modules/limits.py
from pypdf import PdfReader
from PIL import Image

MAX_PDF_PAGES = 100
MAX_IMAGE_PIXELS = 40_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

def assert_pdf_limits(file_path, max_pages=MAX_PDF_PAGES):
    reader = PdfReader(file_path, strict=False)
    pages = len(reader.pages)
    if pages > max_pages:
        raise ValueError(f"PDF exceeds {max_pages} page limit.")
    return reader` },

  { type: 'h2', text: '[HIGH] Child processes have no timeout, kill handling, or concurrency cap' },
  { type: 'p', text: 'Affected file: backend-api/controllers/pdfController.js. Each request spawns a Python process without timeout, queue, memory guard, or child error handling. A bad PDF can hang indefinitely and simultaneous users can spawn many workers.' },
  { type: 'code', text: `const { spawn } = require('child_process');
const PQueue = require('p-queue').default;

const queue = new PQueue({ concurrency: Number(process.env.PYTHON_CONCURRENCY || 2) });

function runPython(scriptPath, payload, timeoutMs = 120000) {
  return queue.add(() => new Promise((resolve, reject) => {
    const child = spawn(getPythonPath(), [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('Processing timed out. Try a smaller file.'));
    }, timeoutMs);

    let stdout = '';
    let stderr = '';
    child.on('error', reject);
    child.stdout.on('data', d => { stdout += d.toString(); if (stdout.length > 1048576) child.kill('SIGKILL'); });
    child.stderr.on('data', d => { stderr += d.toString(); if (stderr.length > 1048576) child.kill('SIGKILL'); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error('Python processing failed.'));
      const parsed = JSON.parse(stdout);
      parsed.success ? resolve(parsed.output) : reject(new Error(parsed.error));
    });
    child.stdin.end(JSON.stringify(payload));
  }));
}` },

  { type: 'h2', text: '[MEDIUM] Public /processed directory exposes files by URL' },
  { type: 'p', text: 'Affected file: backend-api/server.js. Converted files are served statically. UUID names are hard to guess, but there is no ownership token, one-time access, request-level expiry, or authorization.' },
  { type: 'code', text: `const crypto = require('crypto');
const downloadTokens = new Map();

function createDownloadToken(fileName) {
  const token = crypto.randomBytes(32).toString('hex');
  downloadTokens.set(token, { fileName, expiresAt: Date.now() + 15 * 60 * 1000 });
  return token;
}

app.get('/download/:token', (req, res) => {
  const record = downloadTokens.get(req.params.token);
  if (!record || record.expiresAt < Date.now()) {
    return res.status(404).json({ success: false, error: 'File expired.' });
  }
  const filePath = path.join(__dirname, 'processed', path.basename(record.fileName));
  res.download(filePath, record.fileName, () => {
    downloadTokens.delete(req.params.token);
    fs.unlink(filePath, () => {});
  });
});` },

  { type: 'h2', text: '[MEDIUM] CORS uses credentials without an auth model' },
  { type: 'p', text: 'Affected file: backend-api/server.js. credentials: true is enabled, but no cookie/session authentication is visible. This increases cross-origin risk surface for no current benefit.' },
  { type: 'code', text: `app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS origin denied'));
  },
  methods: ['GET', 'POST'],
  credentials: false,
  maxAge: 86400,
}));` },

  { type: 'h2', text: '[MEDIUM] Error responses leak internal implementation details' },
  { type: 'p', text: 'Affected file: backend-api/controllers/pdfController.js. Most handlers return err.message directly. Python errors can expose library internals, absolute paths, and processing details.' },
  { type: 'code', text: `function publicError(err) {
  console.error('[Processing Error]', err);
  return 'The file could not be processed. Please verify the file type and try again.';
}

catch (err) {
  await logAnalytics('merge', filePaths.length, totalSize, 'failed', startTime, err.message, err.stack);
  cleanUpFiles([...filePaths, outputPath]);
  res.status(422).json({ success: false, error: publicError(err) });
}` },

  { type: 'h2', text: '[LOW] Path traversal is mostly mitigated, but Python should enforce trusted directories' },
  { type: 'p', text: 'Good: Multer generates filenames and preserves only the extension. Node passes fixed script names, and spawn() does not use a shell. Remaining risk: Python trusts input/output paths from JSON, so future route changes could accidentally expose path traversal.' },
  { type: 'code', text: `# python-engine/modules/path_guard.py
from pathlib import Path

BASE_UPLOADS = Path('/app/backend-api/uploads').resolve()
BASE_PROCESSED = Path('/app/backend-api/processed').resolve()

def require_inside(path, base):
    resolved = Path(path).resolve()
    if base not in resolved.parents and resolved != base:
        raise ValueError('Path outside allowed workspace.')
    return str(resolved)` },

  { type: 'h1', text: '2. Logical Flaws & Performance Bottlenecks' },
  { type: 'h2', text: '[HIGH] Cleanup is not guaranteed for outputs or partial files' },
  { type: 'p', text: 'Inputs are cleaned after success/failure, but partial output files are not consistently deleted on failure. If Python crashes mid-write, partial files remain until periodic cleanup. If Node crashes, cleanup only happens after restart and after the interval starts.' },
  { type: 'code', text: `async function withJobCleanup(inputs, outputs, fn) {
  try {
    return await fn();
  } catch (err) {
    cleanUpFiles([...inputs, ...outputs]);
    throw err;
  } finally {
    cleanUpFiles(inputs);
  }
}` },
  { type: 'p', text: 'Recommended structure: create a per-job directory with uploads and outputs subdirectories, then delete the whole job directory in finally. That is safer than tracking individual temp files.' },

  { type: 'h2', text: '[HIGH] pdf2jpg loads all rendered pages into memory' },
  { type: 'p', text: 'Affected file: python-engine/modules/image_convert.py. convert_from_path returns a list of all page images before zipping begins, causing memory spikes on large PDFs.' },
  { type: 'code', text: `def pdf_to_jpg(file_path, output_dir, poppler_path=None):
    reader = assert_pdf_limits(file_path)
    os.makedirs(output_dir, exist_ok=True)
    zip_path = os.path.join(output_dir, f"{safe_base(file_path)}_images.zip")

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for page_no in range(1, min(len(reader.pages), 100) + 1):
            pages = convert_from_path(file_path, dpi=120, first_page=page_no, last_page=page_no, thread_count=1)
            img_path = os.path.join(output_dir, f"page_{page_no}.jpg")
            pages[0].save(img_path, 'JPEG', quality=82, optimize=True)
            zip_file.write(img_path, os.path.basename(img_path))
            os.remove(img_path)
    return zip_path` },

  { type: 'h2', text: '[MEDIUM] Rate limiting is request-count based, not cost based' },
  { type: 'p', text: 'Affected file: backend-api/middlewares/rateLimiter.js. 100 requests/hour allows 100 x 50 MB uploads, or 50 images x 50 MB for jpg2pdf. That is too generous for CPU-heavy processing.' },
  { type: 'code', text: `const heavyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Heavy conversion limit reached.' },
});

router.post('/pdf2jpg', heavyLimiter, upload.single('file'), pdfController.pdfToJpg);` },

  { type: 'h2', text: '[MEDIUM] Office conversion can become unsafe on Windows' },
  { type: 'p', text: 'Docker uses Linux, so COM should not run there. If deployed on Windows, Word/Excel/PowerPoint automation opens attacker-supplied documents and can trigger macros, external links, protected-view quirks, or COM hangs.' },
  { type: 'code', text: `ENABLE_COM = os.getenv('ENABLE_OFFICE_COM') == 'true'

def word_to_pdf(file_path, output_path):
    if ENABLE_COM and COM_AVAILABLE:
        return convert_word_to_pdf_com(file_path, output_path)
    return word_to_pdf_portable(file_path, output_path)` },

  { type: 'h1', text: '3. Competitive Edge & Enterprise Improvements' },
  { type: 'bullet', text: 'Job queue instead of direct request processing: use Redis + BullMQ or RabbitMQ. The API accepts upload, creates a job, and a worker processes with strict concurrency limits.' },
  { type: 'bullet', text: 'WebSockets or Server-Sent Events for live progress: Python emits structured progress JSON, Node forwards status to the frontend.' },
  { type: 'bullet', text: 'Content-addressed caching: hash input + options and reuse outputs briefly for repeated conversions.' },
  { type: 'bullet', text: 'Sandboxed processing workers: run Python under a low-privilege user with memory limits, read-only source filesystem, and per-job temp directories.' },
  { type: 'bullet', text: 'OCR/searchable PDF support: add Tesseract or OCRmyPDF for scanned PDF to searchable PDF, PDF to Word with OCR fallback, and language selection.' },

  { type: 'h1', text: '4. Frontend UX/UI Logic Improvements' },
  { type: 'bullet', text: 'Add client-side file size and file-count validation that mirrors backend limits before upload.' },
  { type: 'bullet', text: 'Show per-file validation errors instead of silently ignoring invalid extensions.' },
  { type: 'bullet', text: 'Use Axios upload progress to show real upload percentage.' },
  { type: 'bullet', text: 'Add chunked/resumable uploads for massive files using tus.io or S3/R2 multipart upload.' },
  { type: 'bullet', text: 'Replace static download URLs with expiring download tokens and show an expiry countdown.' },
  { type: 'bullet', text: 'Display estimated processing cost: detected pages, output type, and compression estimate.' },
  { type: 'code', text: `await api.post(tool.endpoint, formData, {
  onUploadProgress: e => {
    const percent = Math.round((e.loaded / e.total) * 100);
    setStatusText(\`Uploading \${percent}%\`);
  },
});` },

  { type: 'h1', text: 'Priority Remediation Plan' },
  { type: 'bullet', text: '1. Add server-side MIME and magic-byte validation.' },
  { type: 'bullet', text: '2. Add Python page, image, and archive expansion limits.' },
  { type: 'bullet', text: '3. Add child-process timeout and concurrency queue.' },
  { type: 'bullet', text: '4. Replace /processed static serving with expiring tokenized downloads.' },
  { type: 'bullet', text: '5. Move each conversion into an isolated job directory and delete the directory in finally.' },
  { type: 'bullet', text: '6. Add heavy-route rate limits based on conversion cost.' },
  { type: 'bullet', text: '7. Add upload progress and frontend validation parity.' },
  { type: 'p', text: 'Conclusion: The platform has a solid foundation, but the processing boundary needs to be treated like hostile input execution. Once Python jobs are wrapped with validation, quotas, isolation, and lifecycle control, it becomes much closer to an enterprise-grade document utility.' },
];

const pageWidth = 612;
const pageHeight = 792;
const margin = 54;
const bottom = 54;
const contentWidth = pageWidth - margin * 2;

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function maxChars(fontSize, width = contentWidth) {
  return Math.max(20, Math.floor(width / (fontSize * 0.52)));
}

function wrapText(text, fontSize, width = contentWidth) {
  const limit = maxChars(fontSize, width);
  const output = [];
  for (const originalLine of String(text).split('\n')) {
    const line = originalLine.replace(/\t/g, '  ');
    if (!line.trim()) {
      output.push('');
      continue;
    }
    let current = '';
    for (const word of line.split(/(\s+)/)) {
      if (word.length > limit) {
        if (current) output.push(current.trimEnd());
        for (let i = 0; i < word.length; i += limit) output.push(word.slice(i, i + limit));
        current = '';
      } else if ((current + word).length > limit) {
        output.push(current.trimEnd());
        current = word.trimStart();
      } else {
        current += word;
      }
    }
    if (current) output.push(current.trimEnd());
  }
  return output;
}

function buildPages() {
  const pages = [];
  let ops = [];
  let y = pageHeight - margin;
  let pageNo = 1;

  function addPage() {
    ops.push(`BT /F1 8 Tf 500 30 Td (Page ${pageNo}) Tj ET`);
    pages.push(ops.join('\n'));
    ops = [];
    y = pageHeight - margin;
    pageNo += 1;
  }

  function ensure(height) {
    if (y - height < bottom) addPage();
  }

  function textLine(line, x, font, size) {
    ops.push(`BT /${font} ${size} Tf ${x} ${y.toFixed(2)} Td (${escapePdfText(line)}) Tj ET`);
  }

  function addWrapped(text, opts) {
    const font = opts.font || 'F1';
    const size = opts.size || 10;
    const leading = opts.leading || size * 1.35;
    const x = opts.x || margin;
    const width = opts.width || contentWidth;
    const prefix = opts.prefix || '';
    const lines = wrapText(text, size, width - (x - margin));
    ensure(lines.length * leading + (opts.after || 0));
    lines.forEach((line, idx) => {
      textLine(idx === 0 ? prefix + line : '  ' + line, x, font, size);
      y -= leading;
      if (y < bottom) addPage();
    });
    y -= opts.after || 0;
  }

  for (const block of report) {
    if (block.type === 'title') {
      ensure(60);
      addWrapped(block.text, { font: 'F2', size: 20, leading: 25, after: 8 });
    } else if (block.type === 'meta') {
      addWrapped(block.text, { size: 9, leading: 12, after: 3 });
    } else if (block.type === 'h1') {
      y -= 8;
      addWrapped(block.text, { font: 'F2', size: 15, leading: 19, after: 6 });
    } else if (block.type === 'h2') {
      y -= 4;
      addWrapped(block.text, { font: 'F2', size: 12, leading: 16, after: 4 });
    } else if (block.type === 'bullet') {
      addWrapped(block.text, { size: 10, leading: 14, prefix: '- ', after: 3 });
    } else if (block.type === 'code') {
      y -= 3;
      const lines = wrapText(block.text, 8, contentWidth);
      ensure(lines.length * 10 + 8);
      lines.forEach(line => {
        textLine(line, margin + 12, 'F3', 8);
        y -= 10;
        if (y < bottom) addPage();
      });
      y -= 8;
    } else {
      addWrapped(block.text, { size: 10, leading: 14, after: 6 });
    }
  }
  addPage();
  return pages;
}

function createPdf(pages) {
  const objects = [];
  const add = body => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = add('');
  const pagesId = add('');
  const fontRegularId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const fontMonoId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  const pageIds = [];

  for (const content of pages) {
    const stream = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`;
    const contentId = add(stream);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontMonoId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

fs.writeFileSync(outputPath, createPdf(buildPages()));
console.log(outputPath);
