/**
 * Audio Notification Service
 * Plays sound notifications for robot events (arrival, alerts, etc.)
 * Supports: Notification sounds, TTS, PCM streaming, Base64 audio
 */

class AudioService {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.isMuted = false;
    this.volume = 0.8;

    // Initialize audio context on first user interaction
    this.initPromise = null;

    // Active sound tracking (for stop functionality)
    this.activeOscillators = [];      // Currently playing oscillators
    this.activeSources = [];          // Currently playing buffer sources
    this.activeGainNodes = [];        // Active gain nodes

    // PCM Streaming state
    this.streamingAudio = null;       // Current streaming session
    this.audioQueue = [];             // Queue of PCM chunks
    this.isPlaying = false;           // Is currently playing
    this.streamId = null;             // Current stream ID
    this.pcmSampleRate = 16000;       // Default sample rate for PCM
    this.pcmChannels = 1;             // Default mono
  }

  /**
   * Initialize AudioContext (must be called after user interaction)
   */
  async init() {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[AudioService] Initialized, state:', this.audioContext.state);

      // Pre-generate notification sounds
      this.generateSounds();

      // Browser autoplay policy: AudioContext starts suspended on Chrome/Firefox
      // It can ONLY be resumed from a user gesture (click, tap, keydown).
      // WebSocket handlers are NOT user gestures, so resume() is ignored there.
      // Fix: attach a one-time global listener to unlock audio on first interaction.
      if (this.audioContext.state === 'suspended') {
        const resumeAudio = async () => {
          try {
            await this.audioContext.resume();
            console.log('[AudioService] AudioContext resumed via user gesture, state:', this.audioContext.state);
          } catch (e) {
            console.warn('[AudioService] Failed to resume AudioContext:', e);
          }
          // Remove listeners after successful resume
          if (this.audioContext.state === 'running') {
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
            document.removeEventListener('touchend', resumeAudio);
            document.removeEventListener('keydown', resumeAudio);
          }
        };

        document.addEventListener('click', resumeAudio, { passive: true });
        document.addEventListener('touchstart', resumeAudio, { passive: true });
        document.addEventListener('touchend', resumeAudio, { passive: true });
        document.addEventListener('keydown', resumeAudio, { passive: true });
        console.log('[AudioService] Waiting for user gesture to unlock audio...');
      }
    } catch (error) {
      console.error('[AudioService] Failed to initialize:', error);
    }
  }

  /**
   * Generate synthetic notification sounds
   */
  generateSounds() {
    // We'll generate sounds on-the-fly using Web Audio API oscillators
    console.log('[AudioService] Ready to play sounds');
  }

  /**
   * Play a beep/tone notification
   * @param {string} type - 'arrival' | 'alert' | 'success' | 'warning' | 'pickup'
   */
  async playNotification(type = 'arrival') {
    if (this.isMuted) return;

    // Ensure audio context is initialized
    if (!this.audioContext) {
      await this.init();
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }

    switch (type) {
      case 'arrival':
        await this.playArrivalSound();
        break;
      case 'pickup':
        await this.playPickupSound();
        break;
      case 'success':
        await this.playSuccessSound();
        break;
      case 'warning':
        await this.playWarningSound();
        break;
      case 'alert':
        await this.playAlertSound();
        break;
      case 'chime':
        await this.playChimeSound();
        break;
      default:
        await this.playArrivalSound();
    }
  }

  /**
   * Stop all currently playing sounds (oscillators + buffer sources)
   */
  stopAllSounds() {
    // Stop all active oscillators
    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch (e) { /* already stopped */ }
    }
    this.activeOscillators = [];

    // Stop all active buffer sources (blob/file audio)
    for (const src of this.activeSources) {
      try { src.stop(); } catch (e) { /* already stopped */ }
    }
    this.activeSources = [];

    // Disconnect gain nodes
    for (const gain of this.activeGainNodes) {
      try { gain.disconnect(); } catch (e) { /* already disconnected */ }
    }
    this.activeGainNodes = [];

    console.log('[AudioService] All sounds stopped');
  }

  /**
   * Play arrival notification - pleasant chime melody
   * 3-note ascending chime: "ding-dong-ding!"
   */
  async playArrivalSound() {
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    // Create gain node for volume control
    const masterGain = ctx.createGain();
    masterGain.gain.value = this.volume * 0.5;
    masterGain.connect(ctx.destination);

    // Chime frequencies (C5 - E5 - G5 - C6) - pleasant major chord progression
    const notes = [
      { freq: 523.25, start: 0, duration: 0.2 },     // C5
      { freq: 659.25, start: 0.15, duration: 0.2 },  // E5
      { freq: 783.99, start: 0.3, duration: 0.2 },   // G5
      { freq: 1046.50, start: 0.45, duration: 0.4 }, // C6 (hold longer)
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = note.freq;

      // Envelope: quick attack, sustain, fade out
      gain.gain.setValueAtTime(0, now + note.start);
      gain.gain.linearRampToValueAtTime(0.8, now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.1);

      // Track for stop
      this.activeOscillators.push(osc);
      osc.onended = () => {
        this.activeOscillators = this.activeOscillators.filter(o => o !== osc);
      };
    }
    this.activeGainNodes.push(masterGain);

    console.log('[AudioService] Playing arrival sound');
  }

  /**
   * Play pickup confirmation sound - 2 quick beeps
   */
  async playPickupSound() {
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.volume * 0.4;
    masterGain.connect(ctx.destination);

    // Two quick beeps
    const beeps = [
      { freq: 880, start: 0, duration: 0.1 },    // A5
      { freq: 1108.73, start: 0.15, duration: 0.15 }, // C#6
    ];

    for (const beep of beeps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = beep.freq;

      gain.gain.setValueAtTime(0, now + beep.start);
      gain.gain.linearRampToValueAtTime(0.6, now + beep.start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, now + beep.start + beep.duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + beep.start);
      osc.stop(now + beep.start + beep.duration + 0.1);

      this.activeOscillators.push(osc);
      osc.onended = () => {
        this.activeOscillators = this.activeOscillators.filter(o => o !== osc);
      };
    }
    this.activeGainNodes.push(masterGain);

    console.log('[AudioService] Playing pickup sound');
  }

  /**
   * Play success sound - triumphant fanfare
   */
  async playSuccessSound() {
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.volume * 0.4;
    masterGain.connect(ctx.destination);

    // Triumphant ascending notes
    const notes = [
      { freq: 523.25, start: 0, duration: 0.15 },    // C5
      { freq: 659.25, start: 0.12, duration: 0.15 }, // E5
      { freq: 783.99, start: 0.24, duration: 0.15 }, // G5
      { freq: 1046.50, start: 0.36, duration: 0.3 }, // C6
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = note.freq;

      gain.gain.setValueAtTime(0, now + note.start);
      gain.gain.linearRampToValueAtTime(0.7, now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.1);

      this.activeOscillators.push(osc);
      osc.onended = () => {
        this.activeOscillators = this.activeOscillators.filter(o => o !== osc);
      };
    }
    this.activeGainNodes.push(masterGain);

    console.log('[AudioService] Playing success sound');
  }

  /**
   * Play warning sound - attention-grabbing beeps
   */
  async playWarningSound() {
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.volume * 0.5;
    masterGain.connect(ctx.destination);

    // Warning beeps - two alternating tones
    const beeps = [
      { freq: 800, start: 0, duration: 0.15 },
      { freq: 600, start: 0.2, duration: 0.15 },
      { freq: 800, start: 0.4, duration: 0.15 },
    ];

    for (const beep of beeps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.value = beep.freq;

      gain.gain.setValueAtTime(0, now + beep.start);
      gain.gain.linearRampToValueAtTime(0.3, now + beep.start + 0.01);
      gain.gain.linearRampToValueAtTime(0.3, now + beep.start + beep.duration - 0.02);
      gain.gain.linearRampToValueAtTime(0, now + beep.start + beep.duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + beep.start);
      osc.stop(now + beep.start + beep.duration + 0.1);

      this.activeOscillators.push(osc);
      osc.onended = () => {
        this.activeOscillators = this.activeOscillators.filter(o => o !== osc);
      };
    }
    this.activeGainNodes.push(masterGain);

    console.log('[AudioService] Playing warning sound');
  }

  /**
   * Play alert sound - urgent attention needed
   */
  async playAlertSound() {
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.volume * 0.6;
    masterGain.connect(ctx.destination);

    // Urgent repeated beeps
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = 1000;

      const start = i * 0.2;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.4, now + start + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + start + 0.1);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now + start);
      osc.stop(now + start + 0.15);

      this.activeOscillators.push(osc);
      osc.onended = () => {
        this.activeOscillators = this.activeOscillators.filter(o => o !== osc);
      };
    }
    this.activeGainNodes.push(masterGain);

    console.log('[AudioService] Playing alert sound');
  }

  /**
   * Play pleasant chime - for general notifications
   */
  async playChimeSound() {
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.volume * 0.4;
    masterGain.connect(ctx.destination);

    // Single pleasant chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 880; // A5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.6);

    this.activeOscillators.push(osc);
    this.activeGainNodes.push(masterGain);
    osc.onended = () => {
      this.activeOscillators = this.activeOscillators.filter(o => o !== osc);
    };

    console.log('[AudioService] Playing chime sound');
  }

  /**
   * Play text-to-speech announcement
   * @param {string} text - Text to speak
   * @param {string} lang - Language code (default: 'en-US')
   */
  speak(text, lang = 'en-US') {
    if (this.isMuted || !('speechSynthesis' in window)) {
      console.log('[AudioService] Speech not available or muted');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = this.volume;

    window.speechSynthesis.speak(utterance);
    console.log('[AudioService] Speaking:', text);
  }

  /**
   * Play arrival announcement with sound + optional speech
   * @param {string} destination - Destination name
   * @param {boolean} useSpeech - Whether to use TTS
   */
  async announceArrival(destination, useSpeech = true) {
    // Play arrival sound first
    await this.playNotification('arrival');

    // Then speak announcement
    if (useSpeech && destination) {
      setTimeout(() => {
        this.speak(`Tifa has arrived at ${destination}. Please collect your items.`);
      }, 800); // Delay to let chime finish
    }
  }

  /**
   * Set mute state
   * @param {boolean} muted 
   */
  setMuted(muted) {
    this.isMuted = muted;
    console.log('[AudioService] Muted:', muted);
  }

  /**
   * Set volume
   * @param {number} volume - 0 to 1
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    // Update all active gain nodes immediately
    for (const gain of this.activeGainNodes) {
      try { gain.gain.value = this.volume; } catch (e) { /* disconnected */ }
    }
    console.log('[AudioService] Volume:', this.volume);
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Play the configured default sound for an expression type.
   * Looks up the expression_sounds table in IndexedDB.
   * Falls back to 'chime' if no configuration found.
   * @param {string} expressionType - Expression name (e.g., 'happy', 'sad')
   */
  async playExpressionSound(expressionType) {
    if (this.isMuted) return;

    // Stop any currently playing expression sound first
    this.stopAllSounds();

    try {
      const { db } = await import('../database/indexedDB');
      const config = await db.expression_sounds.get(expressionType);

      if (!config || !config.enabled) {
        console.log(`[AudioService] Expression sound disabled or not found: ${expressionType}`);
        return;
      }

      if (config.sound_type === 'file' && config.file_blob) {
        // Play user-uploaded audio file
        console.log(`[AudioService] Playing file sound for expression: ${expressionType}`);
        await this.playBlobAudio(config.file_blob);
      } else {
        // Play built-in notification sound
        const soundName = config.builtin_sound || 'chime';
        console.log(`[AudioService] Playing builtin '${soundName}' for expression: ${expressionType}`);
        await this.playNotification(soundName);
      }
    } catch (error) {
      console.error('[AudioService] Failed to play expression sound:', error);
      // Fallback to chime on error
      await this.playNotification('chime');
    }
  }

  // ============================================
  // AUDIO STREAMING METHODS (PCM / Base64 / Blob)
  // ============================================

  /**
   * Play audio from Base64 encoded string
   * Supports: WAV, MP3, OGG, etc.
   * @param {string} base64Data - Base64 encoded audio data
   * @param {string} mimeType - MIME type (e.g., 'audio/wav', 'audio/mp3')
   */
  async playBase64Audio(base64Data, mimeType = 'audio/wav') {
    if (this.isMuted) return;

    try {
      // Ensure audio context is initialized
      if (!this.audioContext) {
        await this.init();
      }

      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);

      // Play the audio
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = this.volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.activeSources.push(source);
      this.activeGainNodes.push(gainNode);

      source.start(0);
      console.log('[AudioService] Playing Base64 audio');

      return new Promise((resolve) => {
        source.onended = () => {
          this.activeSources = this.activeSources.filter(s => s !== source);
          this.activeGainNodes = this.activeGainNodes.filter(g => g !== gainNode);
          resolve();
        };
      });
    } catch (error) {
      console.error('[AudioService] Failed to play Base64 audio:', error);
    }
  }

  /**
   * Play audio from Blob/File
   * @param {Blob} blob - Audio blob
   */
  async playBlobAudio(blob) {
    if (this.isMuted) return;

    try {
      if (!this.audioContext) {
        await this.init();
      }

      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = this.volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Track for stop
      this.activeSources.push(source);
      this.activeGainNodes.push(gainNode);

      source.start(0);
      console.log('[AudioService] Playing Blob audio');

      return new Promise((resolve) => {
        source.onended = () => {
          this.activeSources = this.activeSources.filter(s => s !== source);
          this.activeGainNodes = this.activeGainNodes.filter(g => g !== gainNode);
          resolve();
        };
      });
    } catch (error) {
      console.error('[AudioService] Failed to play Blob audio:', error);
    }
  }

  /**
   * Start PCM streaming session
   * @param {string} streamId - Unique stream identifier
   * @param {number} sampleRate - Sample rate (default: 16000)
   * @param {number} channels - Number of channels (default: 1)
   * @param {number} bitDepth - Bit depth (default: 16)
   */
  startPCMStream(streamId, sampleRate = 16000, channels = 1, bitDepth = 16) {
    // Stop any existing stream
    this.stopPCMStream();

    this.streamId = streamId;
    this.pcmSampleRate = sampleRate;
    this.pcmChannels = channels;
    this.pcmBitDepth = bitDepth;
    this.audioQueue = [];
    this.isPlaying = false;

    console.log(`[AudioService] PCM stream started: ${streamId} (${sampleRate}Hz, ${channels}ch, ${bitDepth}bit)`);
  }

  /**
   * Add PCM chunk to stream
   * @param {string} streamId - Stream identifier
   * @param {string} base64Chunk - Base64 encoded PCM data
   * @param {number} chunkIndex - Chunk sequence number
   * @param {boolean} isLast - Is this the last chunk
   */
  async addPCMChunk(streamId, base64Chunk, chunkIndex = 0, isLast = false) {
    if (this.isMuted) return;
    if (streamId !== this.streamId) {
      console.warn(`[AudioService] Stream ID mismatch: expected ${this.streamId}, got ${streamId}`);
      return;
    }

    try {
      // Ensure audio context is initialized
      if (!this.audioContext) {
        await this.init();
      }

      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Decode base64 to binary
      const binaryString = atob(base64Chunk);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM to AudioBuffer
      const audioBuffer = this._pcmToAudioBuffer(bytes);

      // Add to queue with metadata
      this.audioQueue.push({
        buffer: audioBuffer,
        index: chunkIndex,
        isLast,
      });

      console.log(`[AudioService] PCM chunk ${chunkIndex} added (${bytes.length} bytes, isLast: ${isLast})`);

      // Start playing if not already
      if (!this.isPlaying) {
        this._playNextChunk();
      }
    } catch (error) {
      console.error('[AudioService] Failed to add PCM chunk:', error);
    }
  }

  /**
   * Convert raw PCM bytes to AudioBuffer
   * @param {Uint8Array} pcmData - Raw PCM data
   * @returns {AudioBuffer}
   */
  _pcmToAudioBuffer(pcmData) {
    const ctx = this.audioContext;
    const bytesPerSample = this.pcmBitDepth / 8;
    const numSamples = pcmData.length / bytesPerSample / this.pcmChannels;

    const audioBuffer = ctx.createBuffer(
      this.pcmChannels,
      numSamples,
      this.pcmSampleRate
    );

    // Convert based on bit depth
    for (let channel = 0; channel < this.pcmChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);

      for (let i = 0; i < numSamples; i++) {
        const sampleIndex = (i * this.pcmChannels + channel) * bytesPerSample;

        if (this.pcmBitDepth === 16) {
          // 16-bit signed integer to float
          const sample = (pcmData[sampleIndex] | (pcmData[sampleIndex + 1] << 8));
          const signedSample = sample > 32767 ? sample - 65536 : sample;
          channelData[i] = signedSample / 32768;
        } else if (this.pcmBitDepth === 8) {
          // 8-bit unsigned to float
          channelData[i] = (pcmData[sampleIndex] - 128) / 128;
        }
      }
    }

    return audioBuffer;
  }

  /**
   * Play next chunk in queue
   */
  async _playNextChunk() {
    if (this.audioQueue.length === 0 || this.isMuted) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const chunk = this.audioQueue.shift();

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = chunk.buffer;
      gainNode.gain.value = this.volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.activeSources.push(source);
      this.activeGainNodes.push(gainNode);

      source.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== source);
        this.activeGainNodes = this.activeGainNodes.filter(g => g !== gainNode);
        if (chunk.isLast) {
          console.log('[AudioService] PCM stream completed');
          this.stopPCMStream();
        } else {
          this._playNextChunk();
        }
      };

      source.start(0);
    } catch (error) {
      console.error('[AudioService] Failed to play chunk:', error);
      this._playNextChunk(); // Try next chunk
    }
  }

  /**
   * Stop PCM streaming
   */
  stopPCMStream() {
    this.streamId = null;
    this.audioQueue = [];
    this.isPlaying = false;
    console.log('[AudioService] PCM stream stopped');
  }

  /**
   * Play full PCM audio (non-streaming)
   * @param {string} base64Data - Complete Base64 encoded PCM data
   * @param {number} sampleRate - Sample rate
   * @param {number} channels - Number of channels
   * @param {number} bitDepth - Bit depth
   */
  async playPCMAudio(base64Data, sampleRate = 16000, channels = 1, bitDepth = 16) {
    if (this.isMuted) return;

    try {
      if (!this.audioContext) {
        await this.init();
      }

      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Store settings temporarily
      const prevSampleRate = this.pcmSampleRate;
      const prevChannels = this.pcmChannels;
      const prevBitDepth = this.pcmBitDepth;

      this.pcmSampleRate = sampleRate;
      this.pcmChannels = channels;
      this.pcmBitDepth = bitDepth;

      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM to AudioBuffer
      const audioBuffer = this._pcmToAudioBuffer(bytes);

      // Play
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = this.volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      this.activeSources.push(source);
      this.activeGainNodes.push(gainNode);

      source.start(0);
      console.log('[AudioService] Playing full PCM audio');

      // Restore settings
      this.pcmSampleRate = prevSampleRate;
      this.pcmChannels = prevChannels;
      this.pcmBitDepth = prevBitDepth;

      return new Promise((resolve) => {
        source.onended = () => {
          this.activeSources = this.activeSources.filter(s => s !== source);
          this.activeGainNodes = this.activeGainNodes.filter(g => g !== gainNode);
          resolve();
        };
      });
    } catch (error) {
      console.error('[AudioService] Failed to play PCM audio:', error);
    }
  }

  /**
   * Check if currently streaming
   */
  isStreaming() {
    return this.streamId !== null;
  }

  /**
   * Get current stream ID
   */
  getStreamId() {
    return this.streamId;
  }
}

// Export singleton instance
export const audioService = new AudioService();
export default audioService;
