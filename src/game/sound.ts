/**
 * Retro Space Cadet & arcade synthesizer using the Web Audio API.
 * Ported from the Gemini prototype — no audio assets needed, all
 * sounds are synthesized with oscillators.
 *
 * Usage: `import { soundFX } from "#/game/sound"` then call
 * `soundFX.playBumper(i)`, etc. Toggle with `soundFX.enabled`.
 */

type FlipperSide = "left" | "right";

class ArcadeSoundSystem {
	private ctx: AudioContext | null = null;
	public enabled = true;

	private getContext(): AudioContext | null {
		if (!this.enabled) return null;
		if (typeof window === "undefined") return null;
		if (!this.ctx) {
			const AudioCtx =
				window.AudioContext ??
				(
					window as unknown as {
						webkitAudioContext?: typeof AudioContext;
					}
				).webkitAudioContext;
			if (!AudioCtx) return null;
			this.ctx = new AudioCtx();
		}
		if (this.ctx.state === "suspended") {
			this.ctx.resume().catch(() => {
				/* autoplay policy — retry on next gesture */
			});
		}
		return this.ctx;
	}

	public playFlipper(side: FlipperSide) {
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "triangle";
		const baseFreq = side === "left" ? 110 : 122;
		osc.frequency.setValueAtTime(baseFreq, now);
		osc.frequency.exponentialRampToValueAtTime(baseFreq * 3.2, now + 0.055);

		gain.gain.setValueAtTime(0.24, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc.stop(now + 0.07);
	}

	public playBumper(pitchIndex = 0) {
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const osc2 = ctx.createOscillator();
		const gain = ctx.createGain();

		const freqs = [320, 410, 520, 640];
		const startFreq = freqs[pitchIndex % freqs.length];

		osc.type = "sawtooth";
		osc.frequency.setValueAtTime(startFreq, now);
		osc.frequency.exponentialRampToValueAtTime(startFreq * 1.9, now + 0.05);
		osc.frequency.exponentialRampToValueAtTime(startFreq * 0.7, now + 0.14);

		osc2.type = "sine";
		osc2.frequency.setValueAtTime(startFreq * 1.5, now);
		osc2.frequency.exponentialRampToValueAtTime(startFreq * 2.5, now + 0.12);

		gain.gain.setValueAtTime(0.22, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

		osc.connect(gain);
		osc2.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc2.start(now);
		osc.stop(now + 0.16);
		osc2.stop(now + 0.16);
	}

	public playSlingshot() {
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "square";
		osc.frequency.setValueAtTime(210, now);
		osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);

		gain.gain.setValueAtTime(0.18, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc.stop(now + 0.1);
	}

	public playTargetHit(allCleared = false) {
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const notes = allCleared ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 880];

		notes.forEach((freq, idx) => {
			if (!ctx) return;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, now + idx * 0.045);

			gain.gain.setValueAtTime(0.18, now + idx * 0.045);
			gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.12);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + idx * 0.045);
			osc.stop(now + idx * 0.045 + 0.13);
		});
	}

	public playPlungerLaunch(powerRatio: number) {
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "sawtooth";
		const startFreq = 90;
		const endFreq = 260 + powerRatio * 420;
		osc.frequency.setValueAtTime(startFreq, now);
		osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.25);

		gain.gain.setValueAtTime(0.24, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc.stop(now + 0.3);
	}

	public playLoopCapture() {
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const arpeggio = [330, 440, 554.37, 659.25, 880, 1108.73];
		arpeggio.forEach((freq, i) => {
			if (!ctx) return;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "triangle";
			osc.frequency.setValueAtTime(freq, now + i * 0.055);

			gain.gain.setValueAtTime(0.2, now + i * 0.055);
			gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.15);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + i * 0.055);
			osc.stop(now + i * 0.055 + 0.16);
		});
	}

	public playRankPromotion() {
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const fanfare = [440, 554.37, 659.25, 880, 659.25, 1108.73];
		const offsets = [0, 0.09, 0.18, 0.27, 0.42, 0.52];

		fanfare.forEach((freq, i) => {
			if (!ctx) return;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(freq, now + offsets[i]);

			const duration = i === fanfare.length - 1 ? 0.38 : 0.12;
			gain.gain.setValueAtTime(0.18, now + offsets[i]);
			gain.gain.exponentialRampToValueAtTime(
				0.001,
				now + offsets[i] + duration,
			);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + offsets[i]);
			osc.stop(now + offsets[i] + duration + 0.02);
		});
	}

	public playBallDrain() {
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const notes = [380, 310, 240, 165];
		notes.forEach((freq, i) => {
			if (!ctx) return;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(freq, now + i * 0.1);
			osc.frequency.linearRampToValueAtTime(freq * 0.85, now + i * 0.1 + 0.09);

			gain.gain.setValueAtTime(0.16, now + i * 0.1);
			gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.12);

			osc.connect(gain);
			gain.connect(ctx.destination);

			osc.start(now + i * 0.1);
			osc.stop(now + i * 0.1 + 0.13);
		});
	}

	public playNudge() {
		const ctx = this.getContext();
		if (!ctx) return;

		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "sine";
		osc.frequency.setValueAtTime(95, now);
		osc.frequency.exponentialRampToValueAtTime(45, now + 0.11);

		gain.gain.setValueAtTime(0.3, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc.stop(now + 0.13);
	}
}

export const soundFX = new ArcadeSoundSystem();
