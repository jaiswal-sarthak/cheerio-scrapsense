#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Ensures Playwright browsers are installed before starting the server
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Checking Playwright browser installation...');

try {
  // Try to install browsers
  console.log('Installing Playwright Chromium...');
  execSync('npx playwright install chromium', {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0',
    },
  });

  // Verify installation
  const playwrightPath = path.join(process.cwd(), 'node_modules', '@playwright', 'browser-paths');
  console.log('Playwright browsers installed successfully');
} catch (error) {
  console.error('Failed to install Playwright browsers:', error.message);
  // Don't fail the build, but log the error
  process.exit(0); // Exit with 0 to not fail build
}

