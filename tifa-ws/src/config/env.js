require('dotenv').config();

module.exports = {
  WS_PORT: process.env.WS_PORT || 3001,
  BE_URL: process.env.BE_URL || 'http://localhost:8080',
  KAFKA_BROKERS: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'tifa-ws-gateway',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

