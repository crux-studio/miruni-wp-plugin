// scripts/generate-pot.js
const wpPot = require('wp-pot');
const path = require('path');

// Setup paths relative to the plugin root
const pluginRoot = path.resolve(__dirname, '..');
const srcDir = path.join(pluginRoot, 'src');
const languagesDir = path.join(srcDir, 'languages');

// Get package info
const packageJson = require('../../../package.json');

// Generate POT file
wpPot({
  destFile: path.join(languagesDir, 'miruni.pot'),
  domain: 'miruni',
  package: packageJson.name,
  src: path.join(srcDir, '**/*.php'),
  bugReport: packageJson.bugs?.url || '',
  lastTranslator: packageJson.author || '',
  team: packageJson.author || '',
});

console.log('POT file generated successfully');
