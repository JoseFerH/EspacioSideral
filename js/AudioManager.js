// AudioManager.js
export class AudioManager {
    constructor() {
        // Only create AudioContext upon user interaction to follow browser policies
        this.audioContext = null;
        this.masterGain = null;

        // Drone oscillators and filters
        this.droneOscillators = [];
        this.droneFilter = null;
        this.droneGain = null;
        this.isDronePlaying = false;
    }

    init() {
        if (this.audioContext) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.audioContext.destination);
    }

    // Play a cinematic drone background sound
    playBackgroundMusic() {
        if (!this.audioContext) this.init();
        if (this.isDronePlaying) return;

        this.droneGain = this.audioContext.createGain();
        this.droneGain.gain.value = 0.3; // Base volume

        this.droneFilter = this.audioContext.createBiquadFilter();
        this.droneFilter.type = 'lowpass';
        this.droneFilter.frequency.value = 1000; // Open filter initially
        this.droneFilter.Q.value = 5;

        this.droneFilter.connect(this.droneGain);
        this.droneGain.connect(this.masterGain);

        // Create a rich, dissonant/spacious drone using multiple oscillators
        const frequencies = [55, 110, 165.5, 220, 275]; // A1, A2, detuned fifths/octaves

        frequencies.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            osc.type = index % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.value = freq;

            // Add slight LFO for movement
            const lfo = this.audioContext.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.1 + (index * 0.05); // slow modulation

            const lfoGain = this.audioContext.createGain();
            lfoGain.gain.value = freq * 0.02; // modulate frequency slightly

            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            osc.connect(this.droneFilter);

            osc.start();
            lfo.start();

            this.droneOscillators.push({ osc, lfo, lfoGain });
        });

        this.isDronePlaying = true;
    }

    // Adjust drone filter when zooming into a planet
    setZoomMode(isZoomed) {
        if (!this.audioContext || !this.droneFilter) return;

        const now = this.audioContext.currentTime;
        if (isZoomed) {
            // Muffle the sound (lower low-pass frequency)
            this.droneFilter.frequency.setTargetAtTime(300, now, 1);
        } else {
            // Open the filter back up
            this.droneFilter.frequency.setTargetAtTime(1000, now, 1);
        }
    }

    // Play a "Whoosh" sound for warp and zoom transitions
    playWhoosh(duration = 2) {
        if (!this.audioContext) this.init();

        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        // White noise buffer for the whoosh
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = buffer;

        // Bandpass filter sweeping down
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + duration);
        filter.Q.value = 1;

        // Envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + duration * 0.2);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noiseSource.start(now);
    }

    // Play an electronic pulse sound when text appears
    playElectronicPulse() {
        if (!this.audioContext) this.init();

        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'square';

        // Pitch envelope (ping)
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

        // Amplitude envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.3);
    }
}
