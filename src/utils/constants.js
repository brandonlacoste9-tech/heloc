// Shared constants for CI-Fixer

// Log truncation limits
const AI_LOG_LENGTH = 5000;      // Maximum log length sent to AI
const STORED_LOG_LENGTH = 2000;  // Maximum log length stored in memory

// API limits
const MAX_HISTORY_SIZE = 100;    // Maximum number of analyses to keep in history
const API_REQUEST_LIMIT = '10mb'; // Maximum request body size

module.exports = {
  AI_LOG_LENGTH,
  STORED_LOG_LENGTH,
  MAX_HISTORY_SIZE,
  API_REQUEST_LIMIT
};
