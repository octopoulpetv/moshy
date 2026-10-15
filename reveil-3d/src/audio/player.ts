// Lecture du son en direct, resynchronisée à chaque lecture / déplacement dans la timeline.
import { scheduleScore } from './score';

export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioScheduledSourceNode[] = [];
  private bus: GainNode | null = null;
  muted = false;

  private ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'playback' });
      const comp = this.ctx.createDynamicsCompressor();
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.connect(comp);
    }
    return this.ctx;
  }

  /** Démarre le son à l'instant `t` du film. */
  play(t: number) {
    this.stop();
    if (this.muted) return;
    const ctx = this.ensure();
    void ctx.resume();
    // Un bus par session : on le débranche d'un coup à l'arrêt.
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.9;
    this.bus.connect(this.master!);
    this.nodes = scheduleScore(ctx, this.bus, t, ctx.currentTime + 0.05);
  }

  stop() {
    for (const n of this.nodes) { try { n.stop(); } catch { /* déjà arrêté */ } }
    this.bus?.disconnect();
    this.bus = null;
    this.nodes = [];
  }
}
