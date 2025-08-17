#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
const distElectronPath = path.join(__dirname, '..', 'dist-electron');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  console.log('\n📊 Bundle Size Analysis\n');
  console.log('='.repeat(50));
  
  let totalSize = 0;
  let totalGzipSize = 0;
  const files = [];
  
  // Analyze JavaScript files
  const jsFiles = fs.readdirSync(path.join(distPath, 'assets'))
    .filter(file => file.endsWith('.js'));
  
  jsFiles.forEach(file => {
    const filePath = path.join(distPath, 'assets', file);
    const content = fs.readFileSync(filePath);
    const size = content.length;
    const gzipSize = gzipSync(content).length;
    
    totalSize += size;
    totalGzipSize += gzipSize;
    
    files.push({
      name: file,
      size,
      gzipSize,
      type: file.includes('vendor') ? 'vendor' : 'app'
    });
  });
  
  // Sort by size
  files.sort((a, b) => b.size - a.size);
  
  // Display results
  console.log('📦 JavaScript Bundles:');
  console.log('-'.repeat(50));
  
  files.forEach(file => {
    const percentage = ((file.size / totalSize) * 100).toFixed(1);
    const compressionRatio = ((1 - file.gzipSize / file.size) * 100).toFixed(1);
    
    console.log(
      `  ${file.name.padEnd(30)} ${formatBytes(file.size).padStart(10)} ` +
      `(${percentage}%) | Gzip: ${formatBytes(file.gzipSize).padStart(10)} ` +
      `(-${compressionRatio}%)`
    );
  });
  
  console.log('-'.repeat(50));
  console.log(`  ${'TOTAL'.padEnd(30)} ${formatBytes(totalSize).padStart(10)}`);
  console.log(`  ${'TOTAL (Gzipped)'.padEnd(30)} ${formatBytes(totalGzipSize).padStart(10)}`);
  console.log(`  ${'Compression Ratio'.padEnd(30)} ${((1 - totalGzipSize / totalSize) * 100).toFixed(1)}%`);
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:\n');
  console.log('='.repeat(50));
  
  const largeFiles = files.filter(f => f.size > 500 * 1024);
  if (largeFiles.length > 0) {
    console.log('⚠️  Large bundles detected (>500KB):');
    largeFiles.forEach(file => {
      console.log(`   - ${file.name}: ${formatBytes(file.size)}`);
    });
    console.log('   Consider further code splitting or removing unused dependencies.\n');
  }
  
  const vendorFiles = files.filter(f => f.type === 'vendor');
  const vendorSize = vendorFiles.reduce((sum, f) => sum + f.size, 0);
  const vendorPercentage = ((vendorSize / totalSize) * 100).toFixed(1);
  
  console.log(`📚 Vendor code: ${formatBytes(vendorSize)} (${vendorPercentage}% of total)`);
  if (vendorPercentage > 60) {
    console.log('   ⚠️  Vendor code is more than 60% of your bundle.');
    console.log('   Consider using CDN for large libraries or dynamic imports.\n');
  }
  
  // Check if source maps exist
  const sourceMaps = fs.readdirSync(path.join(distPath, 'assets'))
    .filter(file => file.endsWith('.map'));
  
  if (sourceMaps.length > 0) {
    console.log(`🗺️  Source maps found: ${sourceMaps.length} files`);
    console.log('   Consider removing source maps for production to reduce size.\n');
  }
  
  console.log('✅ Build optimization complete!\n');
}

// Add preload hints to index.html
function optimizeIndexHtml() {
  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('⚠️  index.html not found in dist folder');
    return;
  }
  
  let html = fs.readFileSync(indexPath, 'utf-8');
  
  // Find the main vendor-react chunk
  const vendorReactMatch = html.match(/vendor-react-[a-f0-9]+\.js/);
  if (vendorReactMatch) {
    const vendorReactFile = vendorReactMatch[0];
    
    // Add preload for critical vendor chunk if not already present
    if (!html.includes(`<link rel="modulepreload" href="/assets/${vendorReactFile}"`)) {
      const preloadTag = `  <link rel="modulepreload" href="/assets/${vendorReactFile}" as="script" crossorigin>\n`;
      html = html.replace('</head>', `${preloadTag}</head>`);
      
      fs.writeFileSync(indexPath, html);
      console.log(`✅ Added preload hint for ${vendorReactFile}`);
    }
  }
}

// Optimize Electron main process
function optimizeElectron() {
  const mainPath = path.join(distElectronPath, 'main.js');
  if (!fs.existsSync(mainPath)) {
    console.log('⚠️  Electron main.js not found');
    return;
  }
  
  const mainSize = fs.statSync(mainPath).size;
  console.log(`\n🖥️  Electron Main Process: ${formatBytes(mainSize)}`);
  
  const preloadPath = path.join(distElectronPath, 'preload.js');
  if (fs.existsSync(preloadPath)) {
    const preloadSize = fs.statSync(preloadPath).size;
    console.log(`📦 Electron Preload Script: ${formatBytes(preloadSize)}`);
  }
}

// Run optimizations
console.log('🚀 Running production build optimizations...\n');

analyzeBundle();
optimizeIndexHtml();
optimizeElectron();