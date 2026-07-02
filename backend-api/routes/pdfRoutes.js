const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const limiter = require('../middlewares/rateLimiter');
const pdfController = require('../controllers/pdfController');

// Module 1: Basic File Manipulation
router.post('/merge', limiter, upload.array('files', 20), pdfController.mergePDF);
router.post('/split', limiter, upload.single('file'), pdfController.splitPDF);
router.post('/rotate', limiter, upload.single('file'), pdfController.rotatePDF);

// Module 2: Security & Formatting
router.post('/protect', limiter, upload.single('file'), pdfController.protectPDF);
router.post('/unlock', limiter, upload.single('file'), pdfController.unlockPDF);
router.post('/watermark', limiter, upload.single('file'), pdfController.watermarkPDF);

// Module 3: Image Conversion
router.post('/pdf2jpg', limiter, upload.single('file'), pdfController.pdfToJpg);
router.post('/jpg2pdf', limiter, upload.array('files', 50), pdfController.jpgToPdf);

// Module 4: Document Conversion
router.post('/word2pdf', limiter, upload.single('file'), pdfController.wordToPdf);
router.post('/excel2pdf', limiter, upload.single('file'), pdfController.excelToPdf);
router.post('/pdf2word', limiter, upload.single('file'), pdfController.pdfToWord);
router.post('/pdf2excel', limiter, upload.single('file'), pdfController.pdfToExcel);
router.post('/pdf2ppt', limiter, upload.single('file'), pdfController.pdfToPowerPoint);
router.post('/ppt2pdf', limiter, upload.single('file'), pdfController.powerpointToPdf);
router.post('/html2pdf', limiter, upload.single('file'), pdfController.htmlToPdf);

// Analytics Route (General Dashboard conversion counters)
router.get('/analytics', pdfController.getAnalytics);

module.exports = router;
