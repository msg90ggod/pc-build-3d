/**
 * Procedural Web Audio Sound Synthesizer
 * Provides crisp, zero-latency mechanical and electrical sound effects.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.fanSource = null;
    this.fanGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playPickup() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  /**
   * A part being set down on the desk / shelf: dull metallic clatter followed
   * by the soft bounce of the chassis it landed on.
   */
  playDrop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Hollow body impact
    const body = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(300, t);
    body.frequency.exponentialRampToValueAtTime(90, t + 0.12);
    bodyGain.gain.setValueAtTime(0.28, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    body.connect(bodyGain);
    bodyGain.connect(this.ctx.destination);
    body.start(t);
    body.stop(t + 0.12);

    // High metallic rattle from the heatsink fins / PCB
    const rattle = this.ctx.createOscillator();
    const rattleGain = this.ctx.createGain();
    rattle.type = 'square';
    rattle.frequency.setValueAtTime(1400, t);
    rattle.frequency.exponentialRampToValueAtTime(320, t + 0.05);
    rattleGain.gain.setValueAtTime(0.1, t);
    rattleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    rattle.connect(rattleGain);
    rattleGain.connect(this.ctx.destination);
    rattle.start(t);
    rattle.stop(t + 0.05);
  }

  /** Same gesture, slightly brighter - used when stowing into the inventory. */
  playEquip() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.1);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playSnap() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Crisp transient click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.08);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(t + 0.08);

    // Deep latch lock thud
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(220, t + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(60, t + 0.14);
    gain2.gain.setValueAtTime(0.35, t + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t + 0.02);
    osc2.stop(t + 0.14);
  }

  playScrew() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Screw ratchet sound
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const timeOffset = t + i * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900 + i * 150, timeOffset);
      gain.gain.setValueAtTime(0.12, timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, timeOffset + 0.025);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(timeOffset);
      osc.stop(timeOffset + 0.025);
    }
  }

  playPowerSwitch() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playPostBeep() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Classic motherboard POST success beep: 880Hz sine wave for 120ms
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.setValueAtTime(0.25, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  startFanHum() {
    if (!this.enabled || this.fanSource) return;
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink / Brown noise filter for smooth air whoosh
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter to simulate 120mm fans
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.fanGain = this.ctx.createGain();
    this.fanGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.fanGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 2.0);

    noise.connect(filter);
    filter.connect(this.fanGain);
    this.fanGain.connect(this.ctx.destination);

    noise.start();
    this.fanSource = noise;
  }

  playVictoryFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const chords = [
      { f: 523.25, dur: 0.15, d: 0 },    // C5
      { f: 659.25, dur: 0.15, d: 0.15 }, // E5
      { f: 783.99, dur: 0.15, d: 0.3 },  // G5
      { f: 1046.50, dur: 0.5, d: 0.45 }  // C6
    ];

    const t = this.ctx.currentTime;
    chords.forEach(c => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.f, t + c.d);
      gain.gain.setValueAtTime(0.2, t + c.d);
      gain.gain.exponentialRampToValueAtTime(0.001, t + c.d + c.dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + c.d);
      osc.stop(t + c.d + c.dur);
    });
  }
}

export const sounds = new SoundEffects();
