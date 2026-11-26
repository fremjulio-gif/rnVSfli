/**
 * Synthétiseur Web Audio API 8-bit sobre pour VERSUS.
 * - Désactivé par défaut (aucun autoplay).
 * - Chaîne master : Oscillateur -> Filtre -> Enveloppe -> MasterGain (-16 dB) -> DynamicsCompressor -> Destination.
 * - Zéro fichier audio externe protégé, zéro clipping.
 */

export type SoundEffect = 'uiSelect' | 'uiConfirm' | 'roundTransition' | 'filterTick';

class ArcadeSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = false;
  private hapticEnabled = false;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isHapticEnabled(): boolean {
    return this.hapticEnabled;
  }

  public setEnabled(next: boolean): boolean {
    this.enabled = next;
    if (next) {
      this.ensureContext();
    }
    return this.enabled;
  }

  public setHapticEnabled(next: boolean): boolean {
    this.hapticEnabled = next;
    return this.hapticEnabled;
  }

  public vibrate(ms = 12): void {
    if (!this.hapticEnabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.16, this.ctx.currentTime);

      gain.connect(compressor);
      compressor.connect(this.ctx.destination);
      this.masterGain = gain;
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    delay = 0,
    peak = 0.45,
    cutoff = 2400,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public play(effect: SoundEffect): void {
    if (!this.enabled) return;

    switch (effect) {
      case 'uiSelect':
        this.playTone(523.25, 0.045, 'square', 0, 0.35, 1900);
        break;
      case 'uiConfirm':
        this.playTone(440, 0.06, 'square', 0, 0.35, 2200);
        this.playTone(659.25, 0.11, 'triangle', 0.055, 0.45, 2600);
        break;
      case 'roundTransition':
        this.playTone(329.63, 0.08, 'triangle', 0, 0.4, 2000);
        this.playTone(493.88, 0.09, 'triangle', 0.075, 0.4, 2200);
        this.playTone(659.25, 0.14, 'square', 0.15, 0.3, 2100);
        break;
      case 'filterTick':
        this.playTone(392, 0.035, 'triangle', 0, 0.3, 1800);
        break;
    }
  }
}

export const arcadeSynth = new ArcadeSynth();
