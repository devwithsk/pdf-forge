const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const pdfRoutes = require('./routes/pdfRoutes');
const pdfController = require('./controllers/pdfController');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 7860;

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
  'YOUR_CLOUDFLARE_URL_HERE',
  'http://localhost:5173'
];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve final converted files statically for direct client-side downloading
app.use('/processed', express.static(path.join(__dirname, 'processed')));

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
