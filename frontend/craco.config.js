// craco.config.js
const path = require("path");
require("dotenv").config();

// Check if we're in development/preview mode (not production build)
// Craco sets NODE_ENV=development for start, NODE_ENV=production for build
const isDevServer = process.env.NODE_ENV !== "production";

// Simple production config
let webpackConfig = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
};

// Only add dev server config for development
if (isDevServer) {
  webpackConfig.devServer = (devServerConfig) => {
    // Add ignored patterns to reduce watched directories
    devServerConfig.watchOptions = {
      ...devServerConfig.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/build/**',
        '**/dist/**',
        '**/coverage/**',
        '**/public/**',
      ],
    };
    return devServerConfig;
  };

  // Wrap with visual edits (automatically adds babel plugin, dev server, and overlay in dev mode)
  try {
    const { withVisualEdits } = require("@emergentbase/visual-edits/craco");
    webpackConfig = withVisualEdits(webpackConfig);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes('@emergentbase/visual-edits/craco')) {
      console.warn(
        "[visual-edits] @emergentbase/visual-edits not installed — visual editing disabled."
      );
    } else {
      throw err;
    }
  }
}

module.exports = webpackConfig;
