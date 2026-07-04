const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { limiter, heavyLimiter } = require('../middlewares/rateLimiter');
const pdfController = require('../controllers/pdfController');

// Module 1: Basic File Manipulation
router.post('/merge', limiter, upload.array('files', 20), pdfController.mergePDF);
router.post('/split', limiter, upload.single('file'), pdfController.splitPDF);
router.post('/rotate', limiter, upload.single('file'), pdfController.rotatePDF);
router.post('/remove-pages', limiter, upload.single('file'), pdfController.removePages);
router.post('/organize-pdf', limiter, upload.single('file'), pdfController.organizePdf);
router.post('/compress', limiter, upload.single('file'), pdfController.compressPDF);
router.post('/repair', limiter, upload.single('file'), pdfController.repairPDF);

// Module 2: Security & Formatting
router.post('/protect', limiter, upload.single('file'), pdfController.protectPDF);
router.post('/unlock', limiter, upload.single('file'), pdfController.unlockPDF);
router.post('/watermark', limiter, upload.single('file'), pdfController.watermarkPDF);
router.post('/add-page-numbers', limiter, upload.single('file'), pdfController.addPageNumbers);

// Module 3: Image Conversion
router.post('/pdf2jpg', heavyLimiter, upload.single('file'), pdfController.pdfToJpg);
router.post('/jpg2pdf', heavyLimiter, upload.array('images', 50), pdfController.jpgToPdf);

// Module 4: Document Conversion
router.post('/word2pdf', heavyLimiter, upload.single('file'), pdfController.wordToPdf);
router.post('/excel2pdf', heavyLimiter, upload.single('file'), pdfController.excelToPdf);
router.post('/pdf2word', heavyLimiter, upload.single('file'), pdfController.pdfToWord);
router.post('/pdf2excel', heavyLimiter, upload.single('file'), pdfController.pdfToExcel);
router.post('/pdf2ppt', heavyLimiter, upload.single('file'), pdfController.pdfToPowerPoint);
router.post('/ppt2pdf', heavyLimiter, upload.single('file'), pdfController.powerpointToPdf);
router.post('/html2pdf', heavyLimiter, upload.single('file'), pdfController.htmlToPdf);

// Analytics Route (General Dashboard conversion counters)
router.get('/analytics', pdfController.getAnalytics);

module.exports = router;
