// craco.config.js
const path = require("path");
require("dotenv").config();

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
};
