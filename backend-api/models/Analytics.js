const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  toolName: {
    type: String,
    required: true,
    index: true
  },
  filesCount: {
    type: Number,
    required: true
  },
  totalSize: {
    type: Number, // bytes
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  processingTimeMs: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Analytics', AnalyticsSchema);
