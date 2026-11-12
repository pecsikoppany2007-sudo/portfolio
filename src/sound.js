// kettő – small synthesized sound set (no audio files). Off by default; the browser only allows sound after a click.
let ctx = null, out = null, noise = null, on = false;
const subs = new Set();
const KEY = 'k3-sound';

function init() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  out = ctx.createDynamicsCompressor(); out.threshold.value = -18; out.ratio.value = 4;
  const g = ctx.createGain(); g.gain.value = .9; out.connect(g); g.connect(ctx.destination);
  const len = ctx.sampleRate * .5; noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}

export const sound = {
  get on() { return on; },
  set(v) {
    on = !!v;
    if (on) { init(); if (ctx && ctx.state !== 'running') ctx.resume(); }
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
    subs.forEach(f => f(on));
  },
  toggle() { this.set(!on); if (on) this.ui(); },
  wanted() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } },
  sub(f) { subs.add(f); f(on); },
  // one noise burst through a band-pass: typing, clicks
  burst(freq, q, dur, gain, at = 0) {
    if (!on || !ctx) return;
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = noise; s.playbackRate.value = .8 + Math.random() * .4;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * .4); s.stop(t + dur + .02);
  },
  tone(freq, dur, gain, type = 'sine', at = 0, glide = 0) {
    if (!on || !ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .02);
  },
  key() { this.burst(3200 + Math.random() * 1800, 2.2, .035, .10); this.burst(900, 1, .02, .03); },
  down() { this.burst(2400, 3, .025, .14); this.tone(180, .04, .05, 'triangle'); },
  up() { this.burst(3400, 3, .02, .09); },
  drag(dur) { // soft swell while a box is pulled out
    if (!on || !ctx) return;
    const t = ctx.currentTime, d = Math.max(.12, dur);
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(1900, t + d);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.045, t + d * .5); g.gain.linearRampToValueAtTime(0, t + d);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + d + .05);
  },
  whoosh(k = 1) { // dots rushing into a new shape: a soft breath of air
    if (!on || !ctx) return;
    const t = ctx.currentTime, d = .55 + k * .5;
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .9; f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(1500 + k * 900, t + d * .45); f.frequency.exponentialRampToValueAtTime(420, t + d);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035 + k * .03, t + d * .4); g.gain.linearRampToValueAtTime(0, t + d);
    s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + d + .05);
  },
  pen() { this.tone(1320, .07, .035, 'sine'); },
  hover() { this.burst(5200, 6, .018, .05); },
  ui() { this.tone(660, .09, .05, 'sine'); this.tone(990, .12, .04, 'sine', .06); },
  live() { // the page goes live: low thump + rising air
    if (!on || !ctx) return;
    this.tone(70, .5, .22, 'sine', 0, .6);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 1.4, .028, 'sine', .05 + i * .07));
    this.burst(1400, .7, .7, .05, .02);
  }
};
