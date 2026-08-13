/**
 * Service for handling UI sound effects using the Web Audio API.
 * Synthesizes abstract, clean sounds without requiring external assets.
 */

class AudioService {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    public isMuted: boolean = false;

    constructor() {
        if (typeof window === 'undefined') return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.masterGain = this.ctx.createGain();
                this.masterGain.connect(this.ctx.destination);
                this.masterGain.gain.value = 0.3; // Default volume
            }
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    private ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.error("Audio resume failed", e));
        }
        if (!this.ctx) return false;
        return true;
    }

    private playTone(freq: number, type: OscillatorType, startTime: number, duration: number, vol: number = 0.1) {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    public playHover() {
        if (this.isMuted || !this.ensureContext()) return;
        const t = this.ctx!.currentTime;
        this.playTone(800, 'sine', t, 0.05, 0.02);
    }

    public playClick() {
        if (this.isMuted || !this.ensureContext()) return;
        const t = this.ctx!.currentTime;

        // Click más “clickeable”: cuerpo corto + chispa alta
        this.playTone(520, 'sine', t, 0.08, 0.04);
        this.playTone(1200, 'sine', t + 0.01, 0.04, 0.015);
    }

    private playEtherealTone(freq: number, startTime: number, duration: number = 4.0, vol: number = 0.1) {
        if (!this.ctx || !this.masterGain) return;

        const createOsc = (f: number, v: number, detune: number = 0) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            osc.detune.value = detune;

            const attack = 0.6;
            const release = 3.5;

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(v, startTime + attack);
            gain.gain.setValueAtTime(v * 0.8, startTime + duration * 0.5);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration + release);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(startTime);
            osc.stop(startTime + duration + release);
        };

        createOsc(freq, vol);
        createOsc(freq * 2, vol * 0.15, 0);
        createOsc(freq, vol * 0.3, 4);
        createOsc(freq, vol * 0.3, -4);
    }

    private playVocalTone(freq: number, startTime: number, duration: number, vol: number, vowel: 'O' | 'A') {
        if (!this.ctx || !this.masterGain) return;

        // Oscilador principal (onda triangular para riqueza y calidez)
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        // Segundo oscilador desafinado para simular múltiples voces
        const detuneOsc = this.ctx.createOscillator();
        detuneOsc.type = 'sawtooth';
        detuneOsc.frequency.setValueAtTime(freq * 1.006, startTime);

        // Filtro pasabajos para redondear el sonido vocal
        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(500, startTime);

        // Filtros de formantes vocales
        const f1 = this.ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.Q.setValueAtTime(7, startTime);

        const f2 = this.ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.Q.setValueAtTime(7, startTime);

        if (vowel === 'O') {
            f1.frequency.setValueAtTime(400, startTime);
            f2.frequency.setValueAtTime(800, startTime);
        } else {
            f1.frequency.setValueAtTime(750, startTime);
            f2.frequency.setValueAtTime(1150, startTime);
        }

        // LFO para vibrato de coro
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 5.3;
        lfoGain.gain.value = 5; // Intensidad del detune en cents

        lfo.connect(lfoGain);
        lfoGain.connect(osc.detune);
        lfoGain.connect(detuneOsc.detune);

        // Ganancia individual con envolvente ADSR suave
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.35); // Ataque suave
        gainNode.gain.setValueAtTime(vol, startTime + duration - 0.55);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // Caída natural

        // Conectar osciladores
        osc.connect(lowpass);
        detuneOsc.connect(lowpass);

        // Conectar filtros en paralelo
        lowpass.connect(f1);
        lowpass.connect(f2);
        f1.connect(gainNode);
        f2.connect(gainNode);

        gainNode.connect(this.masterGain);

        lfo.start(startTime);
        osc.start(startTime);
        detuneOsc.start(startTime);

        lfo.stop(startTime + duration);
        osc.stop(startTime + duration);
        detuneOsc.stop(startTime + duration);
    }

    public playStartup() {
        if (this.isMuted || !this.ensureContext()) return;
        const t = this.ctx!.currentTime;

        // Motif memorable: escala pentatónica con repetición rítmica
        // Patrón: nota grave → ascendente breve → repetición con brillo
        const baseFreq = 220.0; // A3
        const fifth = baseFreq * 1.498; // approx fifth
        const octave = baseFreq * 2; // A4

        // "LOXAR" motif: 4 notas distintivas, con eco final
        const notes = [
            { freq: baseFreq, start: 0.00, dur: 0.45, vol: 0.10 },
            { freq: fifth, start: 0.22, dur: 0.40, vol: 0.09 },
            { freq: baseFreq * 1.26, start: 0.44, dur: 0.38, vol: 0.08 },
            { freq: octave, start: 0.66, dur: 0.70, vol: 0.07 },
        ];

        for (const note of notes) {
            this.playVocalTone(note.freq, t + note.start, note.dur, note.vol, note.freq < fifth ? 'O' : 'A');
        }

        // Eco final brillante
        this.playEtherealTone(octave * 1.5, t + 0.9, 1.8, 0.04);
    }

    public playSuccess() {
        if (this.isMuted || !this.ensureContext()) return;
        const t = this.ctx!.currentTime;

        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';

        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.2);

        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    public playError() {
        if (this.isMuted || !this.ensureContext()) return;
        const t = this.ctx!.currentTime;
        this.playTone(150, 'sawtooth', t, 0.3, 0.05);
        this.playTone(142, 'sawtooth', t, 0.3, 0.05);
    }

    public playTourStep() {
        if (this.isMuted || !this.ensureContext()) return;
        const t = this.ctx!.currentTime;
        this.playTone(500, 'sine', t, 0.15, 0.05);
    }

    public toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

export const audioService = new AudioService();
