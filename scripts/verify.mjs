import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(message); };

const html = read('index.html');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
scripts.forEach((match, index) => new vm.Script(match[1], { filename: `index.inline-${index}.js` }));

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) fail(`Duplicate HTML ids: ${duplicates.join(', ')}`);

for (const requiredId of ['videoPlayer', 'scrubber', 'btnExportPNG', 'btnExportVideo', 'btnExportAI', 'btnShareAI', 'aiHandoffStatus', 'btnShareApp', 'btnInstallApp', 'ctxAthleteSlot', 'ctxHandedness', 'ctxAgeGroup', 'ctxCameraView', 'ctxSurface', 'ctxCondition', 'contextReadiness', 'qualityFullBody', 'qualityStable', 'qualitySinglePitch', 'qualityComparable', 'captureQualityBadge', 'btnMarkFoot', 'btnMarkRelease', 'btnResetEvents', 'btnSaveBaseline', 'btnClearBaselines', 'progressList']) {
  if (!ids.includes(requiredId)) fail(`Required control is missing: ${requiredId}`);
}
for (const requiredBehavior of [
  "source: 'self-reported-by-user'",
  'baselineQualityReady',
  'contextComparable && qualityCoreReady && captureQuality.comparableSetup && baselineQualityReady',
  "analysisContext.handedness !== 'unknown'",
  "analysisContext.condition === 'normal'",
  'unknown values never count as a match'
]) {
  if (!html.includes(requiredBehavior)) fail(`Capture-quality safeguard is missing: ${requiredBehavior}`);
}
for (const handoffBehavior of ['navigator.canShare({ files: [file] })', 'navigator.clipboard.writeText(content)', "err.name === 'AbortError'"]) {
  if (!html.includes(handoffBehavior)) fail(`AI handoff behavior is missing: ${handoffBehavior}`);
}

const localRefs = [...html.matchAll(/(?:src|href)="\.\/([^"?#]+)"/g)].map(match => match[1]);
for (const ref of new Set(localRefs)) {
  if (!fs.existsSync(path.join(root, ref))) fail(`Referenced local asset is missing: ${ref}`);
}

const manifest = JSON.parse(read('manifest.webmanifest'));
for (const field of ['name', 'short_name', 'start_url', 'display', 'icons']) {
  if (!manifest[field]) fail(`Manifest field is missing: ${field}`);
}
for (const icon of manifest.icons) {
  if (!fs.existsSync(path.join(root, icon.src))) fail(`Manifest icon is missing: ${icon.src}`);
}

const sw = read('sw.js');
new vm.Script(sw, { filename: 'sw.js' });
const shellMatch = sw.match(/const SHELL = \[([\s\S]*?)\];/);
if (!shellMatch) fail('Service Worker SHELL list was not found.');
for (const match of shellMatch[1].matchAll(/['"]\.\/([^'"]+)['"]/g)) {
  if (!fs.existsSync(path.join(root, match[1]))) fail(`Service Worker asset is missing: ${match[1]}`);
}

console.log(`PitchFrame verification passed: ${scripts.length} inline scripts, ${ids.length} ids, ${new Set(localRefs).size} local references.`);
