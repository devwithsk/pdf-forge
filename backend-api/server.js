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
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
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

// Start Server
app.listen(PORT, () => {
  console.log(`[Server] Express server running on port ${PORT}`);
});
