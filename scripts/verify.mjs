import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(message); };

const html = read('index.html');
const science = read('SCIENCE.md');
const pilot = read('PILOT.md');
const analysisSchema = JSON.parse(read('schemas/pitchframe-analysis-package-v2.schema.json'));
const analysisExample = JSON.parse(read('examples/pitchframe-analysis-package-v2.example.json'));
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
scripts.forEach((match, index) => new vm.Script(match[1], { filename: `index.inline-${index}.js` }));

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) fail(`Duplicate HTML ids: ${duplicates.join(', ')}`);

for (const requiredId of ['captureView', 'workView', 'resultPanel', 'videoPlayer', 'scrubber', 'btnEmptyCapture', 'btnEmptyChoose', 'btnPlayPause', 'speedControls', 'btnJumpLift', 'btnJumpFoot', 'btnJumpMer', 'btnJumpRelease', 'btnSetKey', 'btnShareResult', 'btnExportVideo', 'btnShareAI', 'aiHandoffStatus', 'btnShareApp', 'analysisCoverage']) {
  if (!ids.includes(requiredId)) fail(`Required control is missing: ${requiredId}`);
}
for (const qualityBehavior of ['analysisCoverageSnapshot', 'operationalThreshold = 0.8', 'readyForAutomatedSummary', '80% 是 PitchFrame 的保守操作門檻']) {
  if (!html.includes(qualityBehavior)) fail(`Pose coverage safeguard is missing: ${qualityBehavior}`);
}
// The parent flow is three steps, one screen at a time: capture -> analyze -> result.
for (const stepBehavior of ['<body data-step="capture">', "setStep('analyze')", "setStep('result')", "setStep('capture')",
  'body[data-step="capture"] #captureView', 'body:not([data-step="result"]) #resultPanel', '拍攝投球', '分享結果圖給教練']) {
  if (!html.includes(stepBehavior)) fail(`Three-step flow behavior is missing: ${stepBehavior}`);
}
// Parents asked for the fine slow-motion steps; keep all five.
for (const rate of ['0.1', '0.25', '0.5', '0.75', '1']) {
  if (!html.includes(`data-rate="${rate}"`)) fail(`Playback speed option is missing: ${rate}x`);
}
for (const resultImageBehavior of ['async function buildResultImage()', "type: 'image/png'", 'navigator.canShare({ files: [file] })']) {
  if (!html.includes(resultImageBehavior)) fail(`Shareable result image is missing: ${resultImageBehavior}`);
}
for (const sharingBehavior of ['免費免登入：用手機逐格確認抬腿、落地、外旋與出手', "btnShareApp.textContent = '分享給其他家長'"]) {
  if (!html.includes(sharingBehavior)) fail(`Parent sharing behavior is missing: ${sharingBehavior}`);
}
for (const performanceBehavior of [ 'if (!isPoseModelReady && !poseInitPromise) initMediaPipe()']) {
  if (!html.includes(performanceBehavior)) fail(`Deferred-loading behavior is missing: ${performanceBehavior}`);
}
for (const samplingBehavior of ['const ANALYSIS_SAMPLE_FPS = 8', 'sampledKeys: frames.map(frame => frame.index)', '個取樣點', 'fps: ANALYSIS_SAMPLE_FPS']) {
  if (!html.includes(samplingBehavior)) fail(`Bounded whole-video sampling is missing: ${samplingBehavior}`);
}
for (const eventSyncBehavior of ['function currentManualEventKey()', 'poseMatchesFrame() ? currentPoseStamp : frameStamp()', 'EVENT_DEFS[selectedEvent].set(currentManualEventKey())', 'renderStage(); renderAnalysisCoverage()', 'function updateEventChips(sep)']) {
  if (!html.includes(eventSyncBehavior)) fail(`Manual event/frame synchronization is missing: ${eventSyncBehavior}`);
}
for (const blockingBehavior of ['src="./tailwind.js"', "addEventListener('DOMContentLoaded', initMediaPipe)", 'user-scalable=no', 'btnInstallApp', 'beforeinstallprompt', 'btnSmooth', 'blendCanvas', 'sessionSetup', 'btnPrev5', 'btnNext5', 'btnCapture', 'btnChoose', 'telemetryGrid', 'currentFrame: {', 'ctxHandedness', 'qualityFullBody', 'progressSection', 'pf-progress-history', 'athleteContext:', 'captureQuality:', 'comparison: {']) {
  if (html.includes(blockingBehavior)) fail(`Blocking or inaccessible startup behavior remains: ${blockingBehavior}`);
}
// Removed on purpose to keep the parent flow to capture -> analyze -> result. Do not bring these back without a usage reason.
for (const removedUi of ['pitchframe.css', 'tailwind', 'drawCanvas', 'annotationToolbar', 'sepTintCanvas', 'sepStrip', 'sepPanel', 'viewSettings', 'btnLoop', 'btnResetEvents', 'btnExportPNG', 'moreExports', 'parentGuide']) {
  if (html.includes(removedUi)) fail(`Removed UI came back: ${removedUi}`);
}
// Ben's shoulder-hip quadrilateral: fill depth only, relative to the starting posture, never an angle or score.
for (const quadBehavior of ['function shoulderHipQuadLevel(lm)', 'quad-legend', '不是角度或分數']) {
  if (!html.includes(quadBehavior)) fail(`Shoulder-hip quadrilateral is missing: ${quadBehavior}`);
}
for (const scienceGuard of ['single-camera 2D cannot measure shoulder external rotation angle', '不是評分或醫療判斷', '不得解讀為越大越好', 'pitchframe-analysis-package-v2', 'validatedPhysicalMeasurement: false']) {
  if (!html.includes(scienceGuard)) fail(`Sports-science safeguard is missing: ${scienceGuard}`);
}
for (const unsafeClaim of ['有做到髖肩分離', '紅色應該在落地前後出現', '髖已開、肩還關著']) {
  if (html.includes(unsafeClaim)) fail(`Unsafe single-camera verdict remains: ${unsafeClaim}`);
}
for (const methodologyClaim of ['PMC9532595', 'validatedPhysicalMeasurement: false', '不把它們轉成好壞總分', '評估 → 提出假設 → 小幅介入 → 重測']) {
  if (!science.includes(methodologyClaim)) fail(`Science methodology is missing: ${methodologyClaim}`);
}
if (analysisSchema.properties?.schema?.const !== 'pitchframe-analysis-package-v2') fail('AI package schema version is incorrect.');
for (const obsoleteField of ['athleteContext', 'captureQuality', 'comparison']) {
  if (analysisSchema.required?.includes(obsoleteField) || analysisSchema.properties?.[obsoleteField]) {
    fail(`Obsolete pre-analysis form data remains in the AI package schema: ${obsoleteField}`);
  }
}
if (analysisSchema.properties?.estimatedEvents?.properties?.separationSignal?.properties?.validatedPhysicalMeasurement?.const !== false) {
  fail('AI package schema must mark the separation signal as an unvalidated physical measurement.');
}
if (analysisExample.schema !== analysisSchema.properties.schema.const) fail('AI package example and schema versions do not match.');
if (analysisExample.estimatedEvents?.separationSignal?.validatedPhysicalMeasurement !== false) {
  fail('AI package example must preserve the physical-measurement safeguard.');
}
if (analysisSchema.properties?.analysisReadiness?.properties?.poseCoverage?.properties?.samplingRateFps?.const !== 8
    || analysisExample.analysisReadiness?.poseCoverage?.samplingRateFps !== 8) {
  fail('AI package schema and example must disclose the whole-video sampling rate.');
}
for (const pilotGate of ['5 分鐘內完成', '至少收集 3 位家長與 2 位教練', '可以刪除或收起']) {
  if (!pilot.includes(pilotGate)) fail(`Parent/coach validation gate is missing: ${pilotGate}`);
}
for (const handoffBehavior of ['給教練的快速摘要', 'poseCoverage.readyForAutomatedSummary', '先向使用者詢問投球手、年齡層、拍攝視角', 'navigator.canShare({ files: [file] })', 'navigator.clipboard.writeText(content)', "err.name === 'AbortError'"]) {
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
