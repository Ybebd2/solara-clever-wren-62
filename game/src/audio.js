// SOLARA — audio: WebAudio synth. Engine hum, per-station radio loops,
// shot / jack / pickup / mission-complete stingers. No audio files.
// Written fresh from the R5-mirror spec.

import { S, RADIO } from './config.js';

export function createAudio() {
  const a = {
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    radioTimer: null,
    radioStep: 0,
    started: false,
  };

  a.init = () => {
    if (a.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      a.ctx = new AC();
      a.master = a.ctx.createGain();
      a.master.gain.value = 0.5;
      a.master.connect(a.ctx.destination);
      // engine hum
      a.engineOsc = a.ctx.createOscillator();
      a.engineOsc.type = 'sawtooth';
      a.engineOsc.frequency.value = 55;
      a.engineGain = a.ctx.createGain();
      a.engineGain.gain.value = 0;
      a.engineOsc.connect(a.engineGain);
      a.engineGain.connect(a.master);
      a.engineOsc.start();
      a.started = true;
      a.setStation(S.station);
    } catch (e) {
      a.ctx = null;
    }
  };

  a.setStation = (idx) => {
    if (!a.ctx) return;
    if (a.radioTimer) { clearInterval(a.radioTimer); a.radioTimer = null; }
    if (!S.radioOn || !S.soundOn) return;
    const st = RADIO[idx];
    const chords = [
      [220, 277, 330], [196, 247, 294], [175, 220, 262], [247, 294, 370],
    ];
    const stepMs = 60000 / st.bpm / 2;
    a.radioStep = 0;
    a.radioTimer = setInterval(() => {
      if (!S.radioOn || S.paused || !S.started) return;
      const chord = chords[a.radioStep % chords.length];
      a.radioStep++;
      for (const f of chord) {
        const o = a.ctx.createOscillator();
        o.type = st.wave;
        o.frequency.value = f * (st.style === 'latin gold' ? 2 : 1);
        const g = a.ctx.createGain();
        g.gain.setValueAtTime(0.05, a.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + stepMs / 800);
        o.connect(g); g.connect(a.master);
        o.start();
        o.stop(a.ctx.currentTime + stepMs / 800);
      }
    }, stepMs);
  };

  a.update = () => {
    if (!a.ctx || !a.engineOsc) return;
    const target = S.inCar ? 0.05 + Math.min(0.12, Math.abs(S.carSpeed) / 200) : 0;
    a.engineGain.gain.setTargetAtTime(S.soundOn ? target : 0, a.ctx.currentTime, 0.1);
    a.engineOsc.frequency.setTargetAtTime(55 + Math.abs(S.carSpeed) * 3, a.ctx.currentTime, 0.1);
  };

  a.blip = (freq, dur, type = 'square', vol = 0.12) => {
    if (!a.ctx || !S.soundOn) return;
    const o = a.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(vol, a.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + dur);
    o.connect(g); g.connect(a.master);
    o.start();
    o.stop(a.ctx.currentTime + dur);
  };

  a.shot = () => a.blip(180, 0.12, 'square', 0.2);
  a.jack = () => { a.blip(320, 0.15); setTimeout(() => a.blip(480, 0.2), 90); };
  a.pickup = () => { a.blip(880, 0.12, 'sine', 0.15); setTimeout(() => a.blip(1320, 0.18, 'sine', 0.15), 80); };
  a.complete = () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => a.blip(f, 0.25, 'triangle', 0.16), i * 110));
  };
  a.fail = () => { a.blip(220, 0.4, 'sawtooth', 0.15); setTimeout(() => a.blip(165, 0.5, 'sawtooth', 0.15), 150); };

  return a;
}
