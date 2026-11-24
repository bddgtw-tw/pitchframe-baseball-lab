const assert = require('node:assert/strict');
const { detectPitchEvents, throwingWristIndex } = require('../pitchframe_events.js');

function buildPoseMap({ strideIndex, strideX, wristIndex, wristX }) {
  const keys = strideX.map((_, index) => index);
  const map = new Map();
  for (const key of keys) {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
    landmarks[27].x = strideIndex === 27 ? strideX[key] : 0.25;
    landmarks[28].x = strideIndex === 28 ? strideX[key] : 0.75;
    landmarks[wristIndex].x = wristX[key];
    map.set(key, landmarks);
  }
  return { keys, map };
}

const rightStride = [0.20, 0.20, 0.21, 0.28, 0.45, 0.60, 0.62, 0.621, 0.621, 0.621, 0.621, 0.621, 0.621, 0.621];
const rightWrist = [0.35, 0.35, 0.35, 0.35, 0.36, 0.38, 0.42, 0.48, 0.55, 0.70, 0.86, 0.82, 0.78, 0.74];
const right = buildPoseMap({ strideIndex: 27, strideX: rightStride, wristIndex: 16, wristX: rightWrist });
const rightResult = detectPitchEvents({ keys: right.keys, poseByKey: right.map, width: 1000, height: 700, fps: 30, handedness: 'right' });
assert.equal(rightResult.foot, 7, 'right-handed synthetic foot strike');
assert.equal(rightResult.release, 10, 'right-handed synthetic release');
assert.equal(rightResult.strideAnkleIndex, 27);
assert.equal(rightResult.wristIndex, 16);
assert.equal(rightResult.wristSource, 'configured-right');
assert.equal(rightResult.reason, 'ok');

const leftStride = rightStride.map(value => 1 - value);
const leftWrist = rightWrist.map(value => 1 - value);
const left = buildPoseMap({ strideIndex: 28, strideX: leftStride, wristIndex: 15, wristX: leftWrist });
const leftResult = detectPitchEvents({ keys: left.keys, poseByKey: left.map, width: 1000, height: 700, fps: 30, handedness: 'left' });
assert.equal(leftResult.foot, 7, 'left-handed synthetic foot strike');
assert.equal(leftResult.release, 10, 'left-handed synthetic release');
assert.equal(leftResult.strideAnkleIndex, 28);
assert.equal(leftResult.wristIndex, 15);
assert.equal(leftResult.wristSource, 'configured-left');

assert.deepEqual(throwingWristIndex(27, 'unknown'), { index: 16, source: 'inferred-from-left-stride-foot' });
assert.deepEqual(throwingWristIndex(28, 'unknown'), { index: 15, source: 'inferred-from-right-stride-foot' });
assert.deepEqual(throwingWristIndex(28, 'right'), { index: 16, source: 'configured-right' });

const still = buildPoseMap({ strideIndex: 27, strideX: Array(14).fill(0.2), wristIndex: 16, wristX: Array(14).fill(0.4) });
const stillResult = detectPitchEvents({ keys: still.keys, poseByKey: still.map, width: 1000, height: 700, fps: 30 });
assert.equal(stillResult.foot, null);
assert.equal(stillResult.release, null);
assert.equal(stillResult.reason, 'insufficient-stride-motion');

// Whole-video analysis samples a sparse set of source-frame keys. Detection must return the
// original source key while its temporal search window uses the sampling rate, not source FPS.
const sparseKeys = rightStride.map((_, index) => index * 4);
const sparseMap = new Map();
sparseKeys.forEach((key, index) => {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  landmarks[27].x = rightStride[index];
  landmarks[28].x = 0.75;
  landmarks[16].x = rightWrist[index];
  sparseMap.set(key, landmarks);
});
const sparseResult = detectPitchEvents({ keys: sparseKeys, poseByKey: sparseMap, width: 1000, height: 700, fps: 8, handedness: 'right' });
assert.equal(sparseResult.foot, 28, 'sampled foot strike maps back to source-frame key');
assert.equal(sparseResult.release, 40, 'sampled release maps back to source-frame key');
assert.equal(sparseResult.reason, 'ok');

// Peak leg lift: highest lead knee before foot strike. Max external rotation (rough): wrist furthest
// behind the elbow, opposite the throw direction, between foot strike and release.
const kneeY = [0.70, 0.55, 0.40, 0.45, 0.60, 0.70, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72];
const elbowX = [0.35, 0.35, 0.35, 0.35, 0.36, 0.38, 0.42, 0.50, 0.62, 0.66, 0.80, 0.80, 0.78, 0.74];
const laybackWrist = [0.35, 0.35, 0.35, 0.35, 0.36, 0.38, 0.40, 0.44, 0.50, 0.62, 0.86, 0.82, 0.78, 0.74];
const full = buildPoseMap({ strideIndex: 27, strideX: rightStride, wristIndex: 16, wristX: laybackWrist });
full.keys.forEach(key => { const lm = full.map.get(key); lm[25].y = kneeY[key]; lm[14].x = elbowX[key]; });
const fullResult = detectPitchEvents({ keys: full.keys, poseByKey: full.map, width: 1000, height: 700, fps: 30, handedness: 'right' });
assert.equal(fullResult.foot, 7);
assert.equal(fullResult.release, 10);
assert.equal(fullResult.legLift, 2, 'peak leg lift is the highest lead knee before foot strike');
assert.equal(fullResult.mer, 8, 'max external rotation estimate is the largest wrist-behind-elbow layback between foot strike and release');
assert.ok(fullResult.legLift < fullResult.foot && fullResult.foot < fullResult.mer && fullResult.mer < fullResult.release, 'events stay in pitching order');

// A flat knee (no visible leg lift) must not invent a peak.
assert.equal(rightResult.legLift, null, 'no leg lift is reported when the knee never rises');
// No sample between foot strike and release: MER is left for the caller to estimate or the parent to mark.
const tight = buildPoseMap({ strideIndex: 27, strideX: rightStride, wristIndex: 16,
  wristX: [0.35, 0.35, 0.35, 0.35, 0.36, 0.38, 0.42, 0.48, 0.86, 0.80, 0.78, 0.76, 0.74, 0.72] });
const tightResult = detectPitchEvents({ keys: tight.keys, poseByKey: tight.map, width: 1000, height: 700, fps: 30, handedness: 'right' });
assert.equal(tightResult.foot, 7);
assert.equal(tightResult.release, 8);
assert.equal(tightResult.mer, null);
assert.equal(stillResult.legLift, null);
assert.equal(stillResult.mer, null);

console.log('PitchFrame event tests passed: right throw, left throw, sparse sampling, explicit-hand override, leg lift, max external rotation, and insufficient motion.');
