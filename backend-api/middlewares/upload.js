const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { fromFile } = require('file-type');

// Dictionary of allowed extensions and their corresponding expected MIME types
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Extension and MIME type check at Multer configuration level
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed[ext] || !allowed[ext].includes(file.mimetype)) {
    return cb(new Error(`Unsupported file type: ${ext}`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB limit
  }
});

/**
 * Asserts that the file on disk matches its extension's magic bytes.
 * Handles .html as text, checking for binary content.
 */
async function assertMagicType(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const expectedMimes = allowed[ext];
  if (!expectedMimes) {
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  const detected = await fromFile(filePath);
  if (detected) {
    if (!expectedMimes.includes(detected.mime)) {
      throw new Error(`Uploaded file content for '${originalName}' does not match expected extension.`);
    }
  } else {
    // If file-type could not detect (e.g. plaintext files like HTML)
    if (ext === '.html') {
      // Read first 1024 bytes to check for null bytes (which indicate binary files)
      const buffer = Buffer.alloc(1024);
      let fd;
      try {
        fd = fs.openSync(filePath, 'r');
        const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
        for (let i = 0; i < bytesRead; i++) {
          if (buffer[i] === 0) {
            throw new Error(`Uploaded HTML file '${originalName}' contains binary content.`);
          }
        }
      } finally {
        if (fd !== undefined) {
          fs.closeSync(fd);
        }
      }
    } else {
      throw new Error(`Uploaded file content for '${originalName}' does not match expected extension.`);
    }
  }
}

// Wrapper middleware for single-file uploads with automated cleanup and error responses
const handleSingleUpload = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      if (!req.file) {
        return next();
      }

      try {
        await assertMagicType(req.file.path, req.file.originalname);
        next();
      } catch (validationErr) {
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({ success: false, error: validationErr.message });
      }
    });
  };
};

// Wrapper middleware for array-file uploads with automated cleanup and error responses
const handleArrayUpload = (fieldName, maxCount) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      if (!req.files || req.files.length === 0) {
        return next();
      }

      try {
        for (const file of req.files) {
          await assertMagicType(file.path, file.originalname);
        }
        next();
      } catch (validationErr) {
        for (const file of req.files) {
          if (fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (e) {}
          }
        }
        return res.status(400).json({ success: false, error: validationErr.message });
      }
    });
  };
};

module.exports = {
  single: handleSingleUpload,
  array: handleArrayUpload,
};
