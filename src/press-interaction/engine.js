(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PressPrototype = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const DT = 1 / 120;
  const parameters = Object.freeze({ count: 16, diameter: 2, height: 40, gapBottom: 12, gapTop: 6, depth: 2.6, turns: 800, peak: 1.3, hold: .45, peakTime: .6, holdTime: .4, minOff: 1.8, assumedFieldFactor: .7, illustrativeTimeScale: .19 });
  function create() {
    const w = { time: 0, raw: 0, filtered: 0, pressed: false, started: -Infinity, next: Infinity, pressStart: 0, tails: 0, tapUntil: -1, records: [], beads: [], current: 0, phase: '待机', lastSource: '', high: 0, low: 0, maxRise: 0 };
    const floor = x => 1 + 126 - Math.sqrt(126 * 126 - x * x);
    for (let i = 0; i < parameters.count; i++) w.beads.push({ x: (i % 5 - 2) * 2.02, z: 1.1 + Math.floor(i / 5) * 2.03, vx: 0, vz: 0 });
    const mean = () => w.beads.reduce((s, p) => s + p.z, 0) / w.beads.length;
    const initialMean = mean();
    function start(source) {
      w.started = w.time; w.lastSource = source; w.next = Infinity;
      w.records.push({ time: w.time, source });
      if (w.records.length > 100) w.records.shift();
    }
    function setInput(n) { if (!Number.isFinite(n)) return false; w.raw = clamp(n, 0, 15); return true; }
    function release() { w.raw = 0; w.tapUntil = -1; }
    function tap() { setInput(4); w.tapUntil = w.time + .35; }
    function hold(n = 10) { w.tapUntil = -1; setInput(n); }
    function period() { return 5.5 - 2.7 * clamp((w.filtered - 1.2) / 13.8, 0, 1); }
    function physics(seconds) {
      const dt = seconds * parameters.illustrativeTimeScale;
      const mu = 4 * Math.PI * 1e-7, density = 7870;
      for (const p of w.beads) {
        const gap = (.012 - .15 * p.z / 1000);
        const B = parameters.assumedFieldFactor * mu * parameters.turns * w.current / gap;
        const a = clamp(3 / (mu * density) * B * B * .15 / gap, 0, 5 * 9.807) * 1000;
        p.vz += (a - 9807 - 17 * p.vz) * dt;
        p.vx += (-a * p.x * .00015 / gap - 21 * p.vx) * dt;
        p.x += p.vx * dt; p.z += p.vz * dt;
      }
      for (let k = 0; k < 100; k++) {
        for (let i = 0; i < w.beads.length; i++) {
          const a = w.beads[i];
          for (let j = 0; j < i; j++) {
            const b = w.beads[j], dx = a.x - b.x, dz = a.z - b.z;
            const d = Math.hypot(dx, dz);
            if (d < 2 && d > 1e-10) {
              const nx = dx / d, nz = dz / d, h = (2 - d) * .501;
              a.x += h * nx; a.z += h * nz; b.x -= h * nx; b.z -= h * nz;
              const relative = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
              if (relative < 0) { a.vx -= relative * nx * .5; a.vz -= relative * nz * .5; b.vx += relative * nx * .5; b.vz += relative * nz * .5; }
            }
          }
          const half = (11 - .15 * clamp(a.z, 0, 40)) / 2 - 1;
          if (Math.abs(a.x) > half) { a.x = clamp(a.x, -half, half); a.vx *= -.05; }
          const lo = floor(a.x);
          if (a.z < lo) { a.z = lo; if (a.vz < 0) a.vz *= -.03; }
          if (a.z > 39) { a.z = 39; if (a.vz > 0) a.vz *= -.03; }
        }
      }
      // A later pair can move an earlier bead; finish with a boundary projection.
      for (const p of w.beads) {
        p.z = clamp(p.z, floor(p.x), 39);
        const half = (11 - .15 * p.z) / 2 - 1;
        p.x = clamp(p.x, -half, half);
      }
    }
    function step(dt = DT) {
      w.time += dt;
      if (w.tapUntil >= 0 && w.time >= w.tapUntil) release();
      w.filtered += (w.raw - w.filtered) * (1 - Math.exp(-dt / .08));
      w.high = w.filtered > 1.2 ? w.high + dt : 0;
      w.low = w.filtered < .5 ? w.low + dt : 0;
      if (!w.pressed && w.high >= .1) {
        w.pressed = true; w.pressStart = w.time; w.tails = 0;
        if (w.time - w.started >= 2.8) start('按压');
        else w.next = Math.max(w.time, w.started + 2.8);
      }
      if (w.pressed && w.low >= .15) {
        const sustained = w.time - w.pressStart >= 1.2;
        w.pressed = false; w.tails = sustained ? 2 : 0;
        w.next = sustained ? Math.max(w.time + .9, w.started + 4) : Infinity;
      }
      const age = w.time - w.started;
      if (w.pressed && age >= period() && age >= 2.8) start('持续按压');
      if (w.pressed && w.time >= w.next && w.time - w.started >= 2.8) start('按压');
      if (!w.pressed && w.tails && w.time >= w.next && w.time - w.started >= 2.8) {
        start('松手余波'); w.tails--; w.next = w.tails ? w.time + 5.5 : Infinity;
      }
      const elapsed = w.time - w.started;
      w.current = elapsed < .6 ? 1.3 : elapsed < 1 ? .45 : 0;
      w.phase = w.current === 1.3 ? '峰值吸起' : w.current > 0 ? '低流短停' : elapsed < 2.8 ? '断电回落' : w.pressed ? '等待下轮' : w.tails ? '余波间歇' : '待机';
      physics(dt); w.maxRise = Math.max(w.maxRise, mean() - initialMean);
    }
    function advance(seconds) { if (!Number.isFinite(seconds) || seconds < 0) return; let left = seconds; while (left > 1e-9) { const d = Math.min(DT, left); step(d); left -= d; } }
    function stats() { return { time: w.time, input: w.raw, filtered: w.filtered, pressed: w.pressed, current: w.current, phase: w.phase, period: period(), tails: w.tails, meanHeight: mean(), rise: Math.max(0, mean() - initialMean), maxRise: w.maxRise, cycles: w.records.length }; }
    return { state: w, setInput, tap, hold, release, advance, stats, parameters };
  }
  return { create, parameters };
});
