const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique message ID
 */
function generateMessageId() {
  return uuidv4();
}

module.exports = {
  generateMessageId
};
