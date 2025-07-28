import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const electronDir = join(rootDir, 'electron');
const distElectronDir = join(rootDir, 'dist-electron');

// Create dist-electron directory if it doesn't exist
if (!fs.existsSync(distElectronDir)) {
  fs.mkdirSync(distElectronDir, { recursive: true });
}

try {
  console.log('Building Electron files...');
  
  // Compile TypeScript files
  execSync('npx tsc -p electron/tsconfig.json', { 
    cwd: rootDir,
    stdio: 'inherit'
  });
  
  console.log('Electron build completed successfully!');
} catch (error) {
  console.error('Error building Electron files:', error);
  process.exit(1);
}