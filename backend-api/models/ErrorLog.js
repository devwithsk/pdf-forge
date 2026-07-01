const mongoose = require('mongoose');

const ErrorLogSchema = new mongoose.Schema({
  toolName: {
    type: String,
    required: true,
    index: true
  },
  errorMessage: {
    type: String,
    required: true
  },
  stackTrace: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('ErrorLog', ErrorLogSchema);
