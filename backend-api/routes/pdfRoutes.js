const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { limiter, heavyLimiter } = require('../middlewares/rateLimiter');
const pdfController = require('../controllers/pdfController');

// Module 1: Basic File Manipulation
router.post('/merge', limiter, upload.array('files', 20), pdfController.mergePDF);
router.post('/split', limiter, upload.array('files', 5), pdfController.splitPDF);
router.post('/rotate', limiter, upload.array('files', 5), pdfController.rotatePDF);
router.post('/remove-pages', limiter, upload.single('file'), pdfController.removePages);
router.post('/organize-pdf', limiter, upload.single('file'), pdfController.organizePdf);
router.post('/compress', limiter, upload.array('files', 5), pdfController.compressPDF);
router.post('/repair', limiter, upload.array('files', 5), pdfController.repairPDF);

// Module 2: Security & Formatting
router.post('/protect', limiter, upload.array('files', 5), pdfController.protectPDF);
router.post('/unlock', limiter, upload.array('files', 5), pdfController.unlockPDF);
router.post('/watermark', limiter, upload.array('files', 5), pdfController.watermarkPDF);
router.post('/add-page-numbers', limiter, upload.array('files', 5), pdfController.addPageNumbers);

// Module 3: Image Conversion
router.post('/pdf2jpg', heavyLimiter, upload.array('files', 5), pdfController.pdfToJpg);
router.post('/jpg2pdf', heavyLimiter, upload.array('images', 50), pdfController.jpgToPdf);

// Module 4: Document Conversion
router.post('/word2pdf', heavyLimiter, upload.array('files', 5), pdfController.wordToPdf);
router.post('/excel2pdf', heavyLimiter, upload.array('files', 5), pdfController.excelToPdf);
router.post('/pdf2word', heavyLimiter, upload.array('files', 5), pdfController.pdfToWord);
router.post('/pdf2excel', heavyLimiter, upload.array('files', 5), pdfController.pdfToExcel);
router.post('/pdf2ppt', heavyLimiter, upload.array('files', 5), pdfController.pdfToPowerPoint);
router.post('/ppt2pdf', heavyLimiter, upload.array('files', 5), pdfController.powerpointToPdf);
router.post('/html2pdf', heavyLimiter, upload.array('files', 5), pdfController.htmlToPdf);

// Analytics Route (General Dashboard conversion counters)
router.get('/analytics', pdfController.getAnalytics);

module.exports = router;
