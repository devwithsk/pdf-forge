const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pdf_utility_platform';
    const options = {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    };
    
    await mongoose.connect(mongoURI, options);
    console.log(`[Database] MongoDB Connected successfully`);
  } catch (err) {
    console.error(`[Database] MongoDB connection failed: ${err.message}`);
    console.log('[Database] System running in fallback mode without active DB persistence.');
  }
};

module.exports = connectDB;
