const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

/**
 * Obfuscates JavaScript files to make them harder to reverse-engineer
 * This runs after the build process
 */

const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false, // Set to true for extra protection (but harder to debug)
  debugProtectionInterval: 0,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true, // Protects against code formatting/beautification
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

function obfuscateFile(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
    fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode());
    console.log(`✓ Obfuscated: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`✗ Failed to obfuscate ${filePath}:`, error.message);
  }
}

function obfuscateDirectory(dirPath, extensions = ['.js']) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory not found: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      obfuscateDirectory(filePath, extensions);
    } else if (extensions.some(ext => file.endsWith(ext))) {
      // Skip already obfuscated files and certain files
      if (!file.includes('.obfuscated.') &&
          !file.includes('vendor-') && // Skip vendor bundles (React, etc.)
          !file.includes('service-worker')) { // Skip service worker
        obfuscateFile(filePath);
      }
    }
  });
}

// Main execution
console.log('🔒 Starting code obfuscation...\n');

// Obfuscate renderer process files
console.log('Obfuscating renderer process (dist/)...');
obfuscateDirectory(path.join(__dirname, '../dist/assets'));

// Obfuscate main process file
console.log('\nObfuscating main process (dist-electron/)...');
const mainFile = path.join(__dirname, '../dist-electron/main.js');
if (fs.existsSync(mainFile)) {
  obfuscateFile(mainFile);
}

// Obfuscate preload file
const preloadFile = path.join(__dirname, '../dist-electron/preload.js');
if (fs.existsSync(preloadFile)) {
  obfuscateFile(preloadFile);
}

console.log('\n✅ Code obfuscation complete!');
console.log('⚠️  Note: Obfuscated code is harder to debug. Keep original source files safe.\n');
