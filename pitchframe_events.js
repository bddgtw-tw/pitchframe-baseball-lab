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
      return { legLift: null, foot: null, mer: null, release: null, strideAnkleIndex: null, wristIndex: null, wristSource: null, reason: 'missing-input' };
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
      return { legLift: null, foot: null, mer: null, release: null, strideAnkleIndex: null, wristIndex: null, wristSource: null, reason: 'insufficient-stride-motion' };
    }
    const movementThreshold = globalPeak * 0.5;
    sides.forEach(side => { side.onset = side.velocity.findIndex(value => value >= movementThreshold); });
    const moving = sides.filter(side => side.onset >= 0).sort((a, b) => a.onset - b.onset);
    if (!moving.length) {
      return { legLift: null, foot: null, mer: null, release: null, strideAnkleIndex: null, wristIndex: null, wristSource: null, reason: 'stride-foot-not-found' };
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
    // 抬腿最高點：跨步腳的膝蓋在落地前位置最高（畫面 y 最小）的那一格。
    // 膝蓋必須明顯高於落地時的位置，否則視為沒有抬腿動作，不硬給答案。
    const kneeIndex = stride.index === 27 ? 25 : 26;
    const knees = series(kneeIndex);
    const liftEnd = footIndex !== null ? footIndex : peak;
    let liftIndex = null;
    for (let index = 0; index < liftEnd; index++) {
      if (knees[index] && (liftIndex === null || knees[index].y < knees[liftIndex].y)) liftIndex = index;
    }
    const kneeAtEnd = knees[liftEnd] || knees.slice(liftEnd).find(Boolean) || null;
    if (liftIndex !== null && kneeAtEnd && kneeAtEnd.y - knees[liftIndex].y < H * 0.02) liftIndex = null;

    // 最大外旋（粗估）：落地與出手之間，投球手腕落在手肘「後方」（與投球方向相反）最遠的那一格。
    // 單機位 2D 看不到真正的肩外旋角度；這只是幫家長快速跳到手臂後倒附近，請逐格調整。
    let merIndex = null;
    if (footIndex !== null && releaseIndex !== null) {
      const startX = stride.xs[stride.onset];
      const footX = stride.xs[footIndex];
      const direction = footX !== null && startX !== null && footX < startX ? -1 : 1;
      const elbowIndex = wrist.index - 2;
      let bestLayback = -Infinity;
      for (let index = footIndex + 1; index < releaseIndex; index++) {
        const landmarks = poseByKey.get(keys[index]);
        const w = landmarks && landmarks[wrist.index], e = landmarks && landmarks[elbowIndex];
        if (!w || !e || !Number.isFinite(w.x) || !Number.isFinite(e.x) || !(w.visibility >= 0.2) || !(e.visibility >= 0.2)) continue;
        const layback = direction * (e.x - w.x) * W;
        if (layback > bestLayback) { bestLayback = layback; merIndex = index; }
      }
    }
    return {
      legLift: liftIndex === null ? null : keys[liftIndex],
      mer: merIndex === null ? null : keys[merIndex],
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
