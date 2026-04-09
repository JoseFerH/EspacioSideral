// AudioManager.js
export class AudioManager {
    constructor() {
        // Only create AudioContext upon user interaction to follow browser policies
        this.audioContext = null;
        this.masterGain = null;

        // Background music variables
        this.bgMusicElement = null;
        this.bgMusicSource = null;
        this.musicFilter = null;
        this.isMusicPlaying = false;
    }

    init() {
        if (this.audioContext) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();

        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.audioContext.destination);
    }

    // Play background music from an external file
    playBackgroundMusic() {
        if (!this.audioContext) this.init();
        if (this.isMusicPlaying) return;

        // Create the audio element if it doesn't exist
        if (!this.bgMusicElement) {
            this.bgMusicElement = new Audio('assets/audio/background.mp3');
            this.bgMusicElement.loop = true;

            // Create a MediaElementAudioSourceNode
            this.bgMusicSource = this.audioContext.createMediaElementSource(this.bgMusicElement);

            // Create the filter for the zoom effect
            this.musicFilter = this.audioContext.createBiquadFilter();
            this.musicFilter.type = 'lowpass';
            this.musicFilter.frequency.value = 20000; // Open filter initially (effectively bypassed)

            // Connect: Source -> Filter -> Master Gain -> Destination
            this.bgMusicSource.connect(this.musicFilter);
            this.musicFilter.connect(this.masterGain);
        }

        // Attempt to play the audio
        const playPromise = this.bgMusicElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isMusicPlaying = true;
            }).catch(error => {
                console.warn("Background music failed to play or file is missing (assets/audio/background.mp3):", error);
            });
        }
    }

    // Adjust background music filter when zooming into a planet
    setZoomMode(isZoomed) {
        if (!this.audioContext || !this.musicFilter) return;

        const now = this.audioContext.currentTime;
        if (isZoomed) {
            // Muffle the sound (lower low-pass frequency)
            this.musicFilter.frequency.setTargetAtTime(300, now, 1);
        } else {
            // Open the filter back up (return to full spectrum)
            this.musicFilter.frequency.setTargetAtTime(20000, now, 1);
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
