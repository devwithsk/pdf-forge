const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const pdfRoutes = require('./routes/pdfRoutes');
const pdfController = require('./controllers/pdfController');
const { getDownloadRecord, deleteDownloadToken } = require('./utils/downloadStore');

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 7860;

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  'https://pfdforge.netlify.app',
  'https://pdf-forge.pages.dev',
  'http://localhost:5173'
];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Secure token-based download endpoint
app.get('/download/:token', (req, res) => {
  const token = req.params.token;
  const record = getDownloadRecord(token);
  
  if (!record || record.expiresAt < Date.now()) {
    return res.status(404).json({ success: false, error: 'Download token is invalid or has expired.' });
  }
  
  const { filePath, fileName } = record;
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'The requested file no longer exists.' });
  }
  
  res.download(filePath, fileName, (err) => {
    // Ephemeral tokens and files cleanup: delete token after download completes
    deleteDownloadToken(token);
    
    // Clean up the parent job directory containing input/output files
    const parentDir = path.dirname(filePath);
    if (fs.existsSync(parentDir)) {
      fs.rm(parentDir, { recursive: true, force: true }, (rmErr) => {
        if (rmErr) {
          console.error(`[Download Cleanup Error] Failed to delete directory ${parentDir}:`, rmErr.message);
        } else {
          console.log(`[Download Cleanup] Successfully deleted job directory ${parentDir} after download.`);
        }
      });
    }
  });
});

// Mount API routes
app.use('/api', pdfRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'PDF Utility Platform API is running successfully.' });
});

// Start the periodic file clean-up daemon to clean up old temp files
pdfController.startPeriodicCleanup();

// Start Server binding explicitly to 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Express server running on port ${PORT}`);
});
