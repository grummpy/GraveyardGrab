/** All sound is synthesized. No audio files. */

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let volume = 0.7;
  let themeTimer = null;
  let step = 0;
  const theme = [196, 233, 277, 233, 175, 233, 311, 349];

  function ac() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error("Web Audio is unavailable");
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function applyGain() {
    if (master) master.gain.value = muted ? 0 : volume;
  }

  function tone({ freq, dur = 0.12, type = "square", gain = 0.08, slide = 0, delay = 0 }) {
    const c = ac();
    const osc = c.createOscillator();
    const amp = c.createGain();
    const start = c.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), start);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), start + dur);
    }
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }

  function noise(dur = 0.12, gain = 0.08) {
    const c = ac();
    const length = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 700;
    const amp = c.createGain();
    amp.gain.value = gain;
    src.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    src.start();
  }

  function startTheme() {
    ac();
    if (themeTimer) return;
    themeTimer = setInterval(() => {
      try {
        const freq = theme[step % theme.length];
        tone({ freq, dur: 0.16, type: "square", gain: 0.045 });
        if (step % 2 === 0) tone({ freq: freq / 2, dur: 0.16, type: "triangle", gain: 0.035 });
        step += 1;
      } catch {
        /* ignore a single missed note */
      }
    }, 190);
  }

  return {
    unlock() {
      try {
        ac();
        startTheme();
      } catch {
        /* autoplay policies — the next gesture retries */
      }
    },
    startTheme() {
      try {
        startTheme();
      } catch {
        /* ignore */
      }
    },
    setVolume(value) {
      volume = Math.max(0, Math.min(1, value));
      applyGain();
    },
    setMuted(value) {
      muted = !!value;
      applyGain();
      return muted;
    },
    toggleMuted() {
      return this.setMuted(!muted);
    },
    get muted() {
      return muted;
    },
    pickup() {
      try {
        tone({ freq: 660, dur: 0.07, type: "square", gain: 0.07 });
        tone({ freq: 990, dur: 0.09, type: "square", gain: 0.06, delay: 0.06 });
      } catch { /* ignore */ }
    },
    drop() {
      try { tone({ freq: 320, dur: 0.08, type: "square", gain: 0.05, slide: -80 }); } catch { /* ignore */ }
    },
    tag() {
      try {
        tone({ freq: 190, dur: 0.12, type: "sawtooth", gain: 0.08, slide: -90 });
        noise(0.07, 0.07);
      } catch { /* ignore */ }
    },
    banish() {
      try {
        tone({ freq: 440, dur: 0.28, type: "sawtooth", gain: 0.07, slide: -320 });
        noise(0.18, 0.09);
      } catch { /* ignore */ }
    },
    bank() {
      try {
        [523, 659, 784].forEach((freq, i) => {
          tone({ freq, dur: 0.14, delay: i * 0.07, type: "square", gain: 0.07 });
        });
      } catch { /* ignore */ }
    },
    dash() {
      try { noise(0.05, 0.05); } catch { /* ignore */ }
    },
    shift() {
      try {
        noise(0.32, 0.1);
        tone({ freq: 90, dur: 0.36, type: "sawtooth", gain: 0.05, slide: 50 });
      } catch { /* ignore */ }
    },
    power() {
      try { tone({ freq: 520, dur: 0.14, type: "triangle", gain: 0.08, slide: 240 }); } catch { /* ignore */ }
    },
    countdown(n) {
      try { tone({ freq: n === 1 ? 880 : 440, dur: 0.1, type: "square", gain: 0.08 }); } catch { /* ignore */ }
    },
    round() {
      try {
        [523, 659, 784, 1046].forEach((freq, i) => {
          tone({ freq, dur: 0.16, delay: i * 0.08, type: "square", gain: 0.07 });
        });
      } catch { /* ignore */ }
    },
    match() {
      try {
        [392, 523, 659, 784, 1046].forEach((freq, i) => {
          tone({ freq, dur: 0.2, delay: i * 0.09, type: "triangle", gain: 0.08 });
        });
      } catch { /* ignore */ }
    },
  };
}
