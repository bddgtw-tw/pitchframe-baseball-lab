/* PitchFrame event detection core.
 * Pure, deterministic, and browser/Node compatible so synthetic trajectories can be regression tested.
 * This estimates review points; it does not establish biomechanical ground truth.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PitchFrameEvents = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function throwingWristIndex(strideAnkleIndex, handedness) {
    if (handedness === 'right') return { index: 16, source: 'configured-right' };
    if (handedness === 'left') return { index: 15, source: 'configured-left' };
    return strideAnkleIndex === 27
      ? { index: 16, source: 'inferred-from-left-stride-foot' }
      : { index: 15, source: 'inferred-from-right-stride-foot' };
  }

  function detectPitchEvents(options) {
    const {
      keys,
      poseByKey,
      width = 1,
      height = 1,
      fps = 30,
      handedness = 'unknown',
      credible = point => point && Number.isFinite(point.x) && Number.isFinite(point.y)
    } = options || {};
    if (!Array.isArray(keys) || !keys.length || !poseByKey || typeof poseByKey.get !== 'function') {
      return { foot: null, release: null, strideAnkleIndex: null, wristIndex: null, wristSource: null, reason: 'missing-input' };
    }
    const W = Number.isFinite(width) && width > 0 ? width : 1;
    const H = Number.isFinite(height) && height > 0 ? height : 1;
    const series = index => keys.map(key => {
      const landmarks = poseByKey.get(key);
      const point = landmarks && landmarks[index];
      return point && credible(point) ? { x: point.x * W, y: point.y * H } : null;
    });
    const smoothX = points => points.map((point, index) => {
      const window = points.slice(Math.max(0, index - 1), index + 2).filter(Boolean);
      return point && window.length ? window.reduce((sum, item) => sum + item.x, 0) / window.length : null;
    });
    const velocity = values => values.map((value, index) =>
      index && value !== null && values[index - 1] !== null ? Math.abs(value - values[index - 1]) : 0);
    const sides = [27, 28].map(index => {
      const xs = smoothX(series(index));
      return { index, xs, velocity: velocity(xs), onset: -1 };
    });
    const globalPeak = Math.max(...sides.map(side => Math.max(0, ...side.velocity)));
    if (!(globalPeak > Math.max(W, H) * 0.006)) {
      return { foot: null, release: null, strideAnkleIndex: null, wristIndex: null, wristSource: null, reason: 'insufficient-stride-motion' };
    }
    const movementThreshold = globalPeak * 0.5;
    sides.forEach(side => { side.onset = side.velocity.findIndex(value => value >= movementThreshold); });
    const moving = sides.filter(side => side.onset >= 0).sort((a, b) => a.onset - b.onset);
    if (!moving.length) {
      return { foot: null, release: null, strideAnkleIndex: null, wristIndex: null, wristSource: null, reason: 'stride-foot-not-found' };
    }
    const stride = moving[0];
    let peak = stride.onset;
    for (let index = stride.onset; index < stride.velocity.length && stride.velocity[index] >= movementThreshold * 0.4; index++) {
      if (stride.velocity[index] > stride.velocity[peak]) peak = index;
    }
    let footIndex = null;
    for (let index = peak + 1; index < stride.velocity.length - 1; index++) {
      if (stride.xs[index] !== null && stride.velocity[index] < stride.velocity[peak] * 0.2
          && stride.velocity[index + 1] < stride.velocity[peak] * 0.2) {
        footIndex = index;
        break;
      }
    }
    const wrist = throwingWristIndex(stride.index, handedness);
    let releaseIndex = null;
    if (footIndex !== null) {
      const startX = stride.xs[stride.onset];
      const footX = stride.xs[footIndex];
      const direction = footX !== null && startX !== null && footX < startX ? -1 : 1;
      const searchEnd = Math.min(keys.length - 1, footIndex + Math.round((Number.isFinite(fps) && fps > 0 ? fps : 30) * 0.5));
      let bestReach = -Infinity;
      for (let index = footIndex + 1; index <= searchEnd; index++) {
        const landmarks = poseByKey.get(keys[index]);
        const point = landmarks && landmarks[wrist.index];
        if (!point || !Number.isFinite(point.x) || !(point.visibility >= 0.2)) continue;
        const reach = direction * point.x * W;
        if (reach > bestReach) { bestReach = reach; releaseIndex = index; }
      }
    }
    return {
      foot: footIndex === null ? null : keys[footIndex],
      release: releaseIndex === null ? null : keys[releaseIndex],
      strideAnkleIndex: stride.index,
      wristIndex: wrist.index,
      wristSource: wrist.source,
      reason: footIndex === null ? 'foot-strike-not-found' : releaseIndex === null ? 'release-not-found' : 'ok'
    };
  }

  return { detectPitchEvents, throwingWristIndex };
});
