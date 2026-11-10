/**
 * Validate WebSocket message structure
 */
function validateMessage(message) {
  if (!message.code) {
    return { valid: false, error: 'Missing "code" field' };
  }
  if (!message.data) {
    return { valid: false, error: 'Missing "data" field' };
  }
  return { valid: true };
}

/**
 * Validate SI (Session Identify) message
 */
function validateSI(data) {
  if (!data.type) {
    return { valid: false, error: 'Missing "type" in SI data' };
  }
  
  if (data.type === 'UI') {
    if (!data.ui_id) {
      return { valid: false, error: 'Missing "ui_id" for UI session' };
    }
  } else if (data.type === 'ROBOT') {
    if (!data.robot_id) {
      return { valid: false, error: 'Missing "robot_id" for ROBOT session' };
    }
  } else {
    return { valid: false, error: `Unknown type: ${data.type}` };
  }
  
  return { valid: true };
}

module.exports = {
  validateMessage,
  validateSI
};
