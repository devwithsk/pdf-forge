const crypto = require('crypto');

// Map to store token -> { filePath, fileName, expiresAt }
const downloadTokens = new Map();

function createDownloadToken(filePath, fileName) {
  const token = crypto.randomBytes(32).toString('hex');
  // 30-minute token expiry
  downloadTokens.set(token, {
    filePath,
    fileName,
    expiresAt: Date.now() + 30 * 60 * 1000
  });
  return token;
}

function getDownloadRecord(token) {
  return downloadTokens.get(token);
}

function deleteDownloadToken(token) {
  downloadTokens.delete(token);
}

// Periodically clean up expired tokens from the Map every minute to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [token, record] of downloadTokens.entries()) {
    if (record.expiresAt < now) {
      downloadTokens.delete(token);
    }
  }
}, 60 * 1000);

module.exports = {
  createDownloadToken,
  getDownloadRecord,
  deleteDownloadToken
};
