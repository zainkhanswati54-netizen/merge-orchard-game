// Copies Matter.js from node_modules (installed via npm during the
// GitHub Actions build, where internet access is available) into
// www/js/vendor/matter.min.js, so the Android app loads it as a plain
// local <script> tag — no CDN, no internet needed at runtime.
//
// This runs automatically before `cap sync` in the GitHub Actions
// workflow (see .github/workflows/build-apk.yml).

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'matter-js', 'build', 'matter.min.js');
const destDir = path.join(__dirname, '..', 'www', 'js', 'vendor');
const dest = path.join(destDir, 'matter.min.js');

if (!fs.existsSync(src)) {
  console.error('[copy-matter] ERROR: matter-js not found in node_modules.');
  console.error('[copy-matter] Did `npm install` run first?');
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);

console.log(`[copy-matter] Copied Matter.js -> ${dest}`);
