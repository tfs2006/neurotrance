import { SCALES, midiToFreq, midiToNoteName, ROOT_NOTES, BASE_TEMPO, SCHEDULE_AHEAD_TIME, LOOKAHEAD } from '../constants';
import { Mood, ArpMode, LogEntry, Pattern, MacroPhase, DrumKit, SynthPatch, ChordProgression, SynthesisType, EvolutionLocks, BioStats } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private saturator: WaveShaperNode | null = null; 
  private destNode: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  // Effects
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;

  // Modulation Matrix (LFOs)
  private lfo1: OscillatorNode | null = null; // Slow Drift
  private lfo1Gain: GainNode | null = null;
  private lfo2: OscillatorNode | null = null; // Tempo Synced Pulse
  private lfo2Gain: GainNode | null = null;

  // THE GHOST IN THE MACHINE (Chaos Engine)
  private chaos = { x: 0.1, y: 0, z: 0 };
  private chaosParams = { sigma: 10, rho: 28, beta: 8/3, dt: 0.008 };
  private currentChaosVal: number = 0; 

  // Scheduling
  private nextNoteTime: number = 0;
  private timerID: number | null = null;
  private current16thNote: number = 0;
  private measureCount: number = 0;
  
  // State
  private isPlaying: boolean = false;
  private tempo: number = BASE_TEMPO;
  private rootNote: number = ROOT_NOTES[0];
  private currentScale: number[] = SCALES.MINOR;
  private currentMood: Mood = Mood.ETHEREAL;
  private currentDrumKit: DrumKit = DrumKit.TRANCE;
  
  // Evolution Parameters
  private filterCutoff: number = 500;
  private resonance: number = 0;
  private noteDensity: number = 0.2; 
  private evolutionCounter: number = 0;
  private arpMode: ArpMode = ArpMode.OFF;
  private masterVolume: number = 0.6;
  private reverbEnabled: boolean = true;

  // Evolution Logic Control
  private isAutoEvolve: boolean = true;
  private locks: EvolutionLocks = {
    melody: false,
    timbre: false,
    harmony: false,
    rhythm: false
  };

  // Advanced Evolution (GA) & Song Structure
  private currentPattern: Pattern | null = null;
  private counterPattern: Pattern | null = null;
  private patternHistory: Pattern[] = [];
  private elitePatterns: Pattern[] = []; 
  private currentGeneration: number = 0;
  private macroPhase: MacroPhase = MacroPhase.DRIFT;
  private phaseTimer: number = 0; 

  // Deep Evolution State
  private currentPatch: SynthPatch = {
    type: 'SUBTRACTIVE',
    waveform: 'sawtooth',
    attack: 0.01,
    decay: 0.2,
    sustain: 0.1,
    release: 0.1,
    detuneAmount: 10,
    fmDepth: 0,
    harmonicRatio: 2,
    filterType: 'lowpass'
  };

  private currentProgression: ChordProgression = {
    rootOffsets: [0, 0, 0, 0], 
    barLength: 4
  };
  
  private currentChordIndex: number = 0;
  private currentChordRoot: number = 0; 

  // Euclidean Rhythm State
  private hiHatPattern: boolean[] = [];
  private percussionPattern: boolean[] = [];

  // Callbacks
  private onSchedulerTick: ((step: number, meta: string, chaos: number) => void) | null = null;
  private onLog: ((entry: LogEntry) => void) | null = null;
  private onPatternUpdate: ((pattern: Pattern) => void) | null = null;
  private onPatchUpdate: ((patch: SynthPatch) => void) | null = null;

  constructor() {
    this.generateEuclideanRhythms();
  }

  public async initialize() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    if (!this.ctx) throw new Error("Web Audio API not supported");

    this.log('info', 'Initializing AudioContext...');

    try {
        const buffer = this.ctx.createBuffer(1, 1, 22050);
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.ctx.destination);
        source.start(0);
    } catch(e) {
        console.warn("Audio unlock attempt failed", e);
    }

    // Master Chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    this.saturator = this.ctx.createWaveShaper();
    this.saturator.curve = this.makeDistortionCurve(50); 
    this.saturator.oversample = '2x';

    this.destNode = this.ctx.createMediaStreamDestination();

    // Effects Bus
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = (60 / this.tempo) * 0.75; 
    this.delayFeedback = this.ctx.createGain();
    
    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2000;

    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(delayFilter);
    delayFilter.connect(this.delayNode);

    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createReverbImpulse(3.0); 
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 1;

    // LFOs
    this.lfo1 = this.ctx.createOscillator();
    this.lfo1.frequency.value = 0.1; 
    this.lfo1Gain = this.ctx.createGain();
    this.lfo1Gain.gain.value = 1; 
    this.lfo1.connect(this.lfo1Gain);
    this.lfo1.start();

    this.lfo2 = this.ctx.createOscillator();
    this.lfo2.type = 'triangle';
    this.lfo2.frequency.value = this.tempo / 60 / 4; 
    this.lfo2Gain = this.ctx.createGain();
    this.lfo2Gain.gain.value = 1;
    this.lfo2.connect(this.lfo2Gain);
    this.lfo2.start();

    // Routing
    this.masterGain.connect(this.saturator);
    this.saturator.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.compressor.connect(this.destNode);
    
    this.delayNode.connect(this.masterGain);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    this.log('info', 'DSP Chain: Saturation -> Comp -> Chaos Engine Online');

    this.regenerateSongStructure(true); 
    this.evolvePattern(true); 
    this.setMood(this.currentMood);
  }

  // --- BIO-FEEDBACK SYSTEM (The Interface to LifeEngine) ---
  public injectBioFeedback(stats: BioStats) {
      if (!this.isAutoEvolve) return;

      // 1. Civilization Energy drives Tempo & Cutoff (Breath of Life)
      const energyFactor = stats.averageEnergy / 100; // 0-1
      
      // Subtle tempo drift based on energy
      const targetTempo = BASE_TEMPO + (energyFactor * 10) - 5;
      if (this.ctx && Math.abs(this.tempo - targetTempo) > 1) {
          // Smoothly drift tempo
          this.setTempo(this.tempo + (targetTempo - this.tempo) * 0.01);
      }

      // Filter opens up as civilization flourishes
      if (!this.locks.timbre) {
          const targetCutoff = 0.2 + (energyFactor * 0.6); // 20% to 80% open
          // Lerp towards target
          this.filterCutoff = this.filterCutoff + (targetCutoff - this.filterCutoff) * 0.05;
      }

      // 2. Population drives Rhythmic Complexity
      if (!this.locks.rhythm) {
          // High population = complex rhythms
          if (stats.population > 80 && this.macroPhase !== MacroPhase.PEAK) {
              // Trigger evolution to accommodate the masses
              this.generateEuclideanRhythms(); 
          }
      }

      // 3. Synergy drives Harmony & Mood
      if (!this.locks.harmony && Math.random() < 0.01) {
          // If highly connected, prefer harmonious moods
          if (stats.synergy > 0.5 && this.currentMood === Mood.DARK) {
              this.setMood(Mood.EUPHORIC);
          } else if (stats.synergy < 0.2 && this.currentMood === Mood.EUPHORIC) {
              // Disconnected society feels darker
              this.setMood(Mood.DARK);
          }
      }

      // 4. Dominant Type drives Sound Design
      if (!this.locks.timbre && Math.random() < 0.05) {
          if (stats.dominantType === 'THINKER' && this.currentPatch.type !== 'FM') {
              this.setSynthesisType('FM'); // Thinkers like complex FM
          } else if (stats.dominantType === 'BUILDER' && this.currentPatch.waveform !== 'square') {
              this.setPatchParam('waveform', 'square'); // Builders like structure
          } else if (stats.dominantType === 'FEELER' && this.currentPatch.type !== 'SUBTRACTIVE') {
              this.setSynthesisType('SUBTRACTIVE'); // Feelers like warmth
          }
      }
  }

  // --- CHAOS ENGINE ---
  private updateChaos() {
      const { x, y, z } = this.chaos;
      const { sigma, rho, beta, dt } = this.chaosParams;
      
      const dx = sigma * (y - x) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;
      
      this.chaos.x += dx;
      this.chaos.y += dy;
      this.chaos.z += dz;
      
      this.currentChaosVal = Math.max(0, Math.min(1, (this.chaos.x + 25) / 50));
  }

  // --- MANUAL CONTROLS ---

  public togglePatternStep(index: number) {
      if (!this.currentPattern) return;
      
      const current = this.currentPattern.steps[index];
      if (current === null) {
          this.currentPattern.steps[index] = 0; // Root
          this.currentPattern.velocity[index] = 0.8;
      } else if (current === 0) {
          const degree = Math.floor(Math.random() * this.currentScale.length);
          this.currentPattern.steps[index] = this.currentScale[degree];
      } else {
          this.currentPattern.steps[index] = null;
          this.currentPattern.velocity[index] = 0;
      }
      
      if (this.onPatternUpdate) this.onPatternUpdate(this.currentPattern);
      if (this.isAutoEvolve) {
          this.locks.melody = true;
          this.log('info', 'User Edit: Melody Locked');
      }
  }

  public setPatchParam<K extends keyof SynthPatch>(param: K, value: SynthPatch[K]) {
      this.currentPatch[param] = value;
      if (this.onPatchUpdate) this.onPatchUpdate(this.currentPatch);
      if (this.isAutoEvolve) {
          this.locks.timbre = true;
      }
  }

  public setEvolutionState(isAuto: boolean, locks: EvolutionLocks) {
      this.isAutoEvolve = isAuto;
      this.locks = locks;
      this.log('event', `MODE: ${isAuto ? 'AUTO-EVOLVE' : 'MANUAL_ARCHITECT'}`);
  }

  public manualMutate(target: 'melody' | 'timbre' | 'rhythm') {
      switch(target) {
          case 'melody': 
            this.evolvePattern(true); 
            break;
          case 'timbre': 
            this.regenerateSongStructure(false, true); 
            break;
          case 'rhythm':
            this.generateEuclideanRhythms();
            break;
      }
  }

  // --- ALGORITHMIC CORE ---

  private getEuclideanPattern(steps: number, pulses: number): boolean[] {
    const pattern: boolean[] = [];
    let bucket = 0;
    for (let i = 0; i < steps; i++) {
        bucket += pulses;
        if (bucket >= steps) {
            bucket -= steps;
            pattern.push(true);
        } else {
            pattern.push(false);
        }
    }
    const rotation = Math.floor(Math.random() * steps);
    return [...pattern.slice(rotation), ...pattern.slice(0, rotation)];
  }

  private generateEuclideanRhythms() {
      if (this.locks.rhythm && this.hiHatPattern.length > 0) return;

      const hatHits = 4 + Math.floor(Math.random() * 8);
      this.hiHatPattern = this.getEuclideanPattern(16, hatHits);
      const percHits = 2 + Math.floor(Math.random() * 4);
      this.percussionPattern = this.getEuclideanPattern(16, percHits);
      this.log('event', `RHYTHM_GEN >> Hat:${hatHits}/16 Perc:${percHits}/16`);
  }

  private regenerateSongStructure(force: boolean = false, timbreOnly: boolean = false) {
      if (!force && !this.isAutoEvolve) return;

      if (!this.locks.harmony && !timbreOnly) {
        const idx = Math.floor(Math.random() * ROOT_NOTES.length);
        this.rootNote = ROOT_NOTES[idx];
        this.currentChordRoot = this.rootNote;

        const pentatonicIntervals = [0, 0, 3, 5, 7, 10, -2, -5]; 
        const progLength = 4;
        const newOffsets = [];
        for(let i=0; i<progLength; i++) {
            if (i===0) newOffsets.push(0);
            else newOffsets.push(pentatonicIntervals[Math.floor(Math.random() * pentatonicIntervals.length)]);
        }
        
        this.currentProgression = { rootOffsets: newOffsets, barLength: 4 };
      }

      if (!this.locks.timbre || timbreOnly) {
        const waves: OscillatorType[] = ['sawtooth', 'square', 'triangle', 'sawtooth'];
        const synthType: SynthesisType = Math.random() > 0.6 ? 'FM' : 'SUBTRACTIVE';
        
        this.currentPatch = {
            type: synthType,
            waveform: waves[Math.floor(Math.random() * waves.length)],
            attack: 0.005 + Math.random() * 0.05,
            decay: 0.1 + Math.random() * 0.3,
            sustain: Math.random() * 0.4,
            release: 0.1 + Math.random() * 0.5,
            detuneAmount: 5 + Math.random() * 20,
            fmDepth: 200 + Math.random() * 800,
            harmonicRatio: [0.5, 1, 2, 3, 4, 1.5][Math.floor(Math.random() * 6)],
            filterType: Math.random() > 0.9 ? 'bandpass' : 'lowpass'
        };
        if (this.onPatchUpdate) this.onPatchUpdate(this.currentPatch);
      }

      if (!this.locks.rhythm) {
         this.generateEuclideanRhythms();
      }
      
      this.log('event', `SONG_GENERATE >> ${timbreOnly ? 'Timbre Mutation' : 'Full Structure'}`);
  }

  private connectModMatrix(targetParam: AudioParam, source: 'LFO1' | 'LFO2', depth: number) {
      if (!this.ctx) return;
      const scaler = this.ctx.createGain();
      scaler.gain.value = depth;
      if (source === 'LFO1' && this.lfo1Gain) this.lfo1Gain.connect(scaler);
      else if (source === 'LFO2' && this.lfo2Gain) this.lfo2Gain.connect(scaler);
      scaler.connect(targetParam);
  }

  public setCallback(cb: (step: number, meta: string, chaos: number) => void) { this.onSchedulerTick = cb; }
  public setLogCallback(cb: (entry: LogEntry) => void) { this.onLog = cb; }
  public setPatternCallback(cb: (pattern: Pattern) => void) { this.onPatternUpdate = cb; }
  public setPatchCallback(cb: (patch: SynthPatch) => void) { this.onPatchUpdate = cb; }

  private log(type: 'info' | 'exec' | 'event', message: string) {
    if (this.onLog) {
      this.onLog({ id: Math.random().toString(36).substring(2, 9), timestamp: Date.now(), type, message });
    }
  }

  public getAnalyser(): AnalyserNode | null { return this.analyser; }
  public getCurrentScale(): number[] { return this.currentScale; }
  public getRootNote(): number { return this.currentChordRoot; }
  public getCurrentPatch(): SynthPatch { return this.currentPatch; }

  public start() {
    if (this.isPlaying) return;
    if (!this.ctx) {
        this.initialize();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    
    this.isPlaying = true;
    this.current16thNote = 0;
    this.measureCount = 0;
    this.nextNoteTime = this.ctx!.currentTime + 0.1;
    this.log('event', 'SEQUENCE_INITIATED');
    this.scheduler();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerID !== null) { window.clearTimeout(this.timerID); this.timerID = null; }
    this.log('event', 'SEQUENCE_TERMINATED');
  }

  public startRecording() {
      if (!this.destNode) return;
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.destNode.stream);
      this.mediaRecorder.ondataavailable = (evt) => { if (evt.data.size > 0) this.audioChunks.push(evt.data); };
      this.mediaRecorder.start();
      this.log('event', 'RECORDING_STARTED');
  }

  public stopRecording(): Promise<Blob> {
      return new Promise((resolve) => {
          if (!this.mediaRecorder) return;
          this.mediaRecorder.onstop = () => {
              const blob = new Blob(this.audioChunks, { type: 'audio/wav' });
              this.log('event', 'RECORDING_FINISHED');
              resolve(blob);
          };
          this.mediaRecorder.stop();
      });
  }

  public setTempo(bpm: number) {
      this.tempo = Math.max(60, Math.min(200, bpm));
      if (this.delayNode && this.ctx) this.delayNode.delayTime.linearRampToValueAtTime((60 / this.tempo) * 0.75, this.ctx.currentTime + 1);
      if (this.lfo2 && this.ctx) this.lfo2.frequency.setTargetAtTime(this.tempo / 60 / 4, this.ctx.currentTime, 0.5);
  }
  public setVolume(val: number) { this.masterVolume = val; if (this.masterGain && this.ctx) this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1); }
  public setReverb(enabled: boolean) { this.reverbEnabled = enabled; if (this.reverbGain && this.ctx) this.reverbGain.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.5); }
  public setMood(mood: Mood) { this.currentMood = mood; if (this.ctx && this.delayFeedback) this.applyMoodParams(mood); this.log('event', `MOOD_SHIFT >> ${mood}`); }
  public setDrumKit(kit: DrumKit) { this.currentDrumKit = kit; this.log('event', `KIT_SELECT >> ${kit}`); }
  public setArpMode(mode: ArpMode) { this.arpMode = mode; this.log('event', `ARP_MODE >> ${mode}`); }
  public updateParams(cutoffNorm: number, resonanceNorm: number) { this.filterCutoff = 100 + (cutoffNorm * 11900); this.resonance = resonanceNorm * 20; }
  public setSynthesisType(type: SynthesisType) { this.currentPatch.type = type; this.log('event', `ENGINE_MODE >> ${type}`); }
  public setFMRatio(ratio: number) { this.currentPatch.harmonicRatio = ratio; }
  public forcePhase(phase: MacroPhase) { 
      this.macroPhase = phase; 
      this.phaseTimer = 0; 
      this.log('event', `PHASE_FORCED >> ${phase}`); 
      if (this.ctx) this.playCrash(this.ctx.currentTime); 
  }

  private applyMoodParams(mood: Mood) {
      if (!this.delayFeedback) return;
      switch (mood) {
      case Mood.ETHEREAL: this.currentScale = SCALES.DORIAN; this.delayFeedback.gain.value = 0.6; break;
      case Mood.DARK: this.currentScale = SCALES.PHRYGIAN; this.delayFeedback.gain.value = 0.3; break;
      case Mood.DRIVING: this.currentScale = SCALES.MINOR; this.delayFeedback.gain.value = 0.4; break;
      case Mood.EUPHORIC: this.currentScale = SCALES.HARMONIC_MINOR; this.delayFeedback.gain.value = 0.5; break;
    }
  }

  // --- GENETIC ALGORITHM & PATTERNS ---

  private calculateFitness(pattern: Pattern): number {
    let score = 0;
    let noteCount = 0;
    let lastNoteVal = -100;
    
    pattern.steps.forEach((val, idx) => {
        if (val !== null) {
            noteCount++;
            if (idx % 4 === 0) {
                if (val === 0 || val === 7 || val === 12) score += 10; 
                else if (val === 3 || val === 4 || val === 5) score += 5; 
            }
            if (lastNoteVal !== -100) {
                const interval = Math.abs(val - lastNoteVal);
                if (interval <= 4) score += 5; 
                else if (interval > 7 && interval !== 12) score -= 5; 
            }
            lastNoteVal = val;
        }
    });

    const density = noteCount / 16;
    if (density > 0.25 && density < 0.75) score += 20;
    else score -= 10;

    if (pattern.steps[2] !== null || pattern.steps[10] !== null) score += 5;

    return Math.max(0, score);
  }

  private createRandomPattern(length: number = 16): Pattern {
    const steps: (number | null)[] = [];
    const velocity: number[] = [];
    const offsets: number[] = [];
    for(let i=0; i<length; i++) {
        offsets.push(0);
        if (Math.random() > 0.6) {
            const scaleDegree = Math.floor(Math.random() * this.currentScale.length);
            steps.push(this.currentScale[scaleDegree]);
            velocity.push(0.5 + Math.random() * 0.5);
        } else { steps.push(null); velocity.push(0); }
    }
    return { id: Math.random().toString(36).substr(2, 5), steps, velocity, offsets, generation: 0, score: 0 };
  }

  private generateCounterPattern(mainPattern: Pattern): Pattern {
    const steps: (number | null)[] = [];
    const velocity: number[] = [];
    const offsets: number[] = [];
    for (let i = 0; i < mainPattern.steps.length; i++) {
        offsets.push(0);
        const mainHasNote = mainPattern.steps[i] !== null;
        const mainNote = mainPattern.steps[i];
        const playProb = mainHasNote ? 0.1 : 0.7;

        if (Math.random() < playProb) {
            let noteVal = 0;
            if (mainHasNote && mainNote !== null) {
                 const interval = Math.random() > 0.5 ? 2 : 4; 
                 const currentIdx = this.currentScale.indexOf(mainNote);
                 if (currentIdx !== -1) noteVal = this.currentScale[(currentIdx + interval) % this.currentScale.length];
                 else noteVal = mainNote + 4; 
            } else {
                const degrees = [0, 2, 4, 1]; 
                const d = degrees[Math.floor(Math.random() * degrees.length)];
                noteVal = this.currentScale[d % this.currentScale.length];
            }
            steps.push(noteVal + 12); 
            velocity.push(0.4 + Math.random() * 0.3);
        } else { steps.push(null); velocity.push(0); }
    }
    return { id: "CNTR_" + mainPattern.id.substring(0,3), steps, velocity, offsets, generation: mainPattern.generation };
  }

  private evolvePattern(force: boolean = false) {
      if (this.locks.melody && !force) return;
      if (!this.isAutoEvolve && !force) return;

      if (!this.currentPattern) {
          this.currentPattern = this.createRandomPattern();
          this.counterPattern = this.generateCounterPattern(this.currentPattern);
          this.log('event', `GENESIS >> Created Gen 0 Pattern`);
          if (this.onPatternUpdate) this.onPatternUpdate(this.currentPattern);
          return;
      }

      const currentScore = this.calculateFitness(this.currentPattern);
      this.currentPattern.score = currentScore;
      
      if (currentScore > 50) {
          const isDuplicate = this.elitePatterns.some(p => p.id === this.currentPattern?.id);
          if (!isDuplicate) {
              this.elitePatterns.push(this.currentPattern);
              this.elitePatterns.sort((a, b) => (b.score || 0) - (a.score || 0));
              if (this.elitePatterns.length > 10) this.elitePatterns.pop();
          }
      }

      this.patternHistory.push(this.currentPattern);
      if (this.patternHistory.length > 5) this.patternHistory.shift();
      this.currentGeneration++;

      const isMassExtinction = this.currentGeneration % 16 === 0;
      const stabilityFactor = Math.min(0.8, this.currentGeneration * 0.05); 
      const mutationChance = isMassExtinction ? 0.9 : Math.max(0.2, 0.8 - stabilityFactor);
      const mutationType = Math.random();
      let newSteps = [...this.currentPattern.steps];
      let newVel = [...this.currentPattern.velocity];
      let newOffsets = this.currentPattern.offsets ? [...this.currentPattern.offsets] : new Array(this.currentPattern.steps.length).fill(0);
      let parentId = this.currentPattern.id;
      let action = "MUTATION";

      if (this.elitePatterns.length > 0 && Math.random() < 0.3 && !isMassExtinction) {
          action = "LEARNING_CROSSOVER";
          const partner = this.elitePatterns[Math.floor(Math.random() * this.elitePatterns.length)];
          parentId = `${this.currentPattern.id} x ${partner.id}`;
          const split = Math.floor(newSteps.length / 2);
          newSteps = [...this.currentPattern.steps.slice(0, split), ...partner.steps.slice(split)];
          newVel = [...this.currentPattern.velocity.slice(0, split), ...partner.velocity.slice(split)];
      } 
      else if (Math.random() > 0.7 && this.patternHistory.length >= 2 && !isMassExtinction) {
          action = "CROSSOVER";
          const partner = this.patternHistory[Math.floor(Math.random() * (this.patternHistory.length - 1))];
          parentId = `${this.currentPattern.id} x ${partner.id}`;
          const split = Math.floor(newSteps.length / 2);
          newSteps = [...this.currentPattern.steps.slice(0, split), ...partner.steps.slice(split)];
          newVel = [...this.currentPattern.velocity.slice(0, split), ...partner.velocity.slice(split)];
          if (partner.offsets) {
            const partnerOffsets = partner.offsets;
             newOffsets = [...newOffsets.slice(0, split), ...partnerOffsets.slice(split)];
          }
      } else {
          if (isMassExtinction) action = "MASS_EXTINCTION";
          const numMutations = isMassExtinction ? 8 : (1 + Math.floor(Math.random() * 2));
          for(let i=0; i<numMutations; i++) {
              const idx = Math.floor(Math.random() * newSteps.length);
              const hasNote = newSteps[idx] !== null;
              if (hasNote) {
                  if (Math.random() < (isMassExtinction ? 0.5 : 0.8)) {
                      const currentVal = newSteps[idx] as number;
                      const currentDegreeIndex = this.currentScale.indexOf(currentVal);
                      let newDegree;
                      if (currentDegreeIndex !== -1 && Math.random() > 0.4) {
                          const direction = Math.random() > 0.5 ? 1 : -1;
                          newDegree = this.currentScale[(currentDegreeIndex + direction + this.currentScale.length) % this.currentScale.length];
                      } else {
                          const scaleDegree = Math.floor(Math.random() * this.currentScale.length);
                          newDegree = this.currentScale[scaleDegree];
                      }
                      newSteps[idx] = newDegree;
                      newVel[idx] = 0.5 + Math.random() * 0.5; 
                  } else {
                      newSteps[idx] = null; newVel[idx] = 0; newOffsets[idx] = 0;
                  }
                  if (Math.random() < 0.3) {
                      const drift = (Math.random() * 0.2) - 0.1; 
                      newOffsets[idx] = Math.max(-0.2, Math.min(0.2, (newOffsets[idx] || 0) + drift));
                  }
                  if (idx % 4 === 0 && Math.random() > 0.6) newVel[idx] = Math.min(1.0, newVel[idx] * 1.2);
              } else {
                  if (Math.random() > (isMassExtinction ? 0.5 : 0.85)) {
                     const scaleDegree = Math.floor(Math.random() * this.currentScale.length);
                     newSteps[idx] = this.currentScale[scaleDegree];
                     newVel[idx] = 0.6; newOffsets[idx] = 0; 
                  }
              }
          }
      }

      this.currentPattern = { id: Math.random().toString(36).substr(2, 5), steps: newSteps, velocity: newVel, offsets: newOffsets, generation: this.currentGeneration, parent: parentId, score: 0 };
      this.counterPattern = this.generateCounterPattern(this.currentPattern);
      this.log('event', `EVOLUTION >> ${action} (Gen ${this.currentGeneration})`);
      if (this.onPatternUpdate) this.onPatternUpdate(this.currentPattern);
  }

  // ----------------------------------------------------------------
  // INTERNAL AUDIO SCHEDULING
  // ----------------------------------------------------------------

  private scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    if (this.isPlaying) {
        this.updateChaos(); // Tick the Chaos Engine
        this.timerID = window.setTimeout(() => this.scheduler(), LOOKAHEAD);
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; 
    this.current16thNote++;
    if (this.current16thNote === 16) {
      this.current16thNote = 0;
      this.measureCount++;
      this.handleMacroStructure();
    }
  }

  private handleMacroStructure() {
      this.phaseTimer++;
      const phaseLengths = { [MacroPhase.DRIFT]: 8, [MacroPhase.BUILD]: 8, [MacroPhase.PEAK]: 16, [MacroPhase.COMEDOWN]: 8 };
      
      if (this.phaseTimer >= phaseLengths[this.macroPhase] && this.isAutoEvolve) {
          this.transitionPhase();
      }

      // Evolve Pattern
      if (this.measureCount % 4 === 0) this.evolvePattern();

      // Pad Trigger (Every 4 bars on beat 1)
      if (this.measureCount % 4 === 0 && this.current16thNote === 0) this.playPad(this.nextNoteTime);

      // Update Chord Progression Logic
      const chordDurationBars = this.currentProgression.barLength;
      if (this.measureCount % chordDurationBars === 0 && this.current16thNote === 0) {
          this.currentChordIndex = (this.currentChordIndex + 1) % this.currentProgression.rootOffsets.length;
          const offset = this.currentProgression.rootOffsets[this.currentChordIndex];
          this.currentChordRoot = this.rootNote + offset;
          this.log('info', `CHORD_CHANGE >> ${midiToNoteName(this.currentChordRoot)}`);
      }

      const meta = `${this.macroPhase} | GEN:${this.currentGeneration} | P:${this.currentPattern?.id}`;
      if (this.onSchedulerTick) this.onSchedulerTick(this.current16thNote, meta, this.currentChaosVal);
  }

  private transitionPhase() {
      this.phaseTimer = 0;
      const phases = [MacroPhase.DRIFT, MacroPhase.BUILD, MacroPhase.PEAK, MacroPhase.COMEDOWN];
      const currentIdx = phases.indexOf(this.macroPhase);
      
      if (this.macroPhase === MacroPhase.COMEDOWN) {
          this.regenerateSongStructure();
          this.currentGeneration = 0;
      }

      this.macroPhase = phases[(currentIdx + 1) % phases.length];
      this.log('event', `MACRO_PHASE >> ${this.macroPhase}`);

      switch(this.macroPhase) {
          case MacroPhase.DRIFT: this.noteDensity = 0.2; this.filterCutoff = 400; break;
          case MacroPhase.BUILD: this.noteDensity = 0.6; this.filterCutoff = 2000; break;
          case MacroPhase.PEAK: this.noteDensity = 0.9; this.filterCutoff = 8000; break;
          case MacroPhase.COMEDOWN: this.noteDensity = 0.4; this.filterCutoff = 800; break;
      }
  }

  private scheduleNote(beatNumber: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // 1. KICK
    if (beatNumber % 4 === 0) {
      if (this.macroPhase !== MacroPhase.DRIFT || beatNumber === 0) this.playKick(time);
    }

    // 2. SNARE / CLAP
    if (beatNumber % 8 === 4) {
        if (this.macroPhase === MacroPhase.PEAK || (this.macroPhase === MacroPhase.BUILD && this.phaseTimer > 4)) {
            this.playSnare(time);
        }
    }

    // 3. HI-HATS & PERC (Euclidean)
    if (this.hiHatPattern[beatNumber]) {
        const isOpen = beatNumber % 4 === 2;
        if (this.macroPhase !== MacroPhase.DRIFT) this.playHiHat(time, isOpen);
    }
    if (this.percussionPattern[beatNumber] && (this.macroPhase === MacroPhase.PEAK || this.macroPhase === MacroPhase.BUILD)) {
        this.playHiHat(time, false, true);
    }

    // 4. BASS
    const isKickStep = beatNumber % 4 === 0;
    if (!isKickStep && this.macroPhase !== MacroPhase.DRIFT) this.playBass(time, beatNumber);

    // 5. PATTERN LEAD (Main or FM)
    if (this.currentPattern) this.playPatternStep(time, beatNumber);

    // 6. COUNTERPOINT
    if (this.counterPattern && this.macroPhase !== MacroPhase.DRIFT) {
        const canPlay = this.macroPhase === MacroPhase.PEAK || Math.random() > 0.4;
        if (canPlay) this.playPluckStep(time, beatNumber);
    }

    // 7. ARP
    if (this.arpMode !== ArpMode.OFF) this.playArp(time, beatNumber);
  }

  // ----------------------------------------------------------------
  // SYNTHESIZERS
  // ----------------------------------------------------------------

  private playKick(time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    let startFreq = 150, endFreq = 0.01, decay = 0.5, type: OscillatorType = 'sine';
    
    switch(this.currentDrumKit) {
        case DrumKit.TRANCE: startFreq = this.macroPhase === MacroPhase.PEAK ? 180 : 150; decay = 0.5; break;
        case DrumKit.ANALOG_808: startFreq = 120; decay = 0.8; break;
        case DrumKit.VINTAGE_909: startFreq = 200; decay = 0.35; break;
        case DrumKit.ACOUSTIC: startFreq = 100; decay = 0.3; type = 'triangle'; break;
    }

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, time);
    if (this.currentDrumKit === DrumKit.VINTAGE_909) {
         osc.frequency.exponentialRampToValueAtTime(50, time + 0.05);
         osc.frequency.exponentialRampToValueAtTime(endFreq, time + decay);
    } else {
         osc.frequency.exponentialRampToValueAtTime(endFreq, time + decay);
    }
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + decay);
    osc.connect(gain); gain.connect(this.masterGain!);
    
    if (this.currentDrumKit === DrumKit.ACOUSTIC) {
        const noise = this.ctx.createBufferSource();
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.5, time);
        nGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'lowpass';
        nFilter.frequency.value = 1000;
        noise.connect(nFilter); nFilter.connect(nGain); nGain.connect(this.masterGain!); noise.start(time);
    }
    osc.start(time); osc.stop(time + decay);
  }

  private playSnare(time: number) {
      if (!this.ctx) return;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      const bufferSize = this.ctx.sampleRate * 0.2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.connect(noiseGain); noiseGain.connect(this.masterGain!);
      if (this.reverbEnabled && this.reverbGain) noiseGain.connect(this.reverbGain);
      noise.start(time);
  }

  private playHiHat(time: number, open: boolean, isPerc: boolean = false) {
    if (!this.ctx) return;
    const duration = open ? 0.1 : 0.04;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = isPerc ? 'bandpass' : 'highpass';
    filter.frequency.value = isPerc ? 4000 : 8000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(open ? 0.2 : (isPerc ? 0.15 : 0.05), time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain!);
    noise.start(time);
  }

  private playCrash(time: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 2.0);

    noise.connect(filter); filter.connect(gain); gain.connect(this.masterGain!);
    if (this.reverbEnabled && this.reverbGain) gain.connect(this.reverbGain);
    
    noise.start(time);
  }

  private playBass(time: number, step: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    // Bass usually stays cleaner, but we can use current waveform if not too crazy
    osc.type = this.currentPatch.type === 'FM' ? 'sine' : this.currentPatch.waveform; 
    
    let octaveOffset = -12; 
    if (this.macroPhase === MacroPhase.PEAK) {
        if (step % 4 === 3 && Math.random() > 0.3) octaveOffset = 0;
    }
    
    const midi = this.currentChordRoot + octaveOffset;
    const freq = midiToFreq(midi);
    osc.frequency.setValueAtTime(freq, time);
    this.connectModMatrix(osc.detune, 'LFO1', 5); 

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = this.resonance * 2; 
    
    // Apply CHAOS to Filter Cutoff for that "Neuro" drift
    // Map chaosVal (0-1) to -50 to +50 Hz offset
    const chaosOffset = (this.currentChaosVal - 0.5) * 100;
    
    let envAmt = this.filterCutoff * 2;
    let decay = 0.2;

    if (this.macroPhase === MacroPhase.PEAK) { envAmt = this.filterCutoff * 4; decay = 0.25; } 
    else if (this.macroPhase === MacroPhase.BUILD) { decay = 0.15; }

    const subStep = step % 4;
    let velocity = 0.4;
    if (subStep === 2) velocity = 0.5; 
    else if (subStep === 3) { velocity = 0.35; envAmt *= 0.8; }
    
    filter.frequency.setValueAtTime(100 + chaosOffset, time); 
    filter.frequency.linearRampToValueAtTime(100 + envAmt + chaosOffset, time + 0.02);
    filter.frequency.exponentialRampToValueAtTime(100 + chaosOffset, time + decay);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain!);
    osc.start(time); osc.stop(time + decay + 0.1);
  }

  private playPad(time: number) {
      if (!this.ctx || this.macroPhase === MacroPhase.PEAK) return; 

      if (this.currentPatch.type === 'FM') {
          this.playFMPad(time);
          return;
      }

      const degrees = [0, 2, 4, 1]; 
      const oscs: OscillatorNode[] = [];
      const gain = this.ctx.createGain();
      const attack = 2.0;
      const duration = (60 / this.tempo) * 4 * 4; 

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.15, time + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.1);

      const panner = this.ctx.createStereoPanner();
      this.connectModMatrix(panner.pan, 'LFO1', 0.5);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600 + (this.currentChaosVal * 200); // Chaos modulation
      filter.Q.value = 0.5;
      this.connectModMatrix(filter.frequency, 'LFO1', 200);

      degrees.forEach((d, i) => {
          const note = this.currentChordRoot + this.currentScale[d % this.currentScale.length] + (i>2 ? 12:0);
          const freq = midiToFreq(note);
          
          const o1 = this.ctx!.createOscillator();
          o1.type = 'sawtooth'; 
          o1.frequency.value = freq;
          o1.detune.value = Math.random() * 10 - 5;
          o1.connect(filter);
          oscs.push(o1);
          o1.start(time);
          o1.stop(time + duration);
      });

      filter.connect(gain); gain.connect(panner); panner.connect(this.masterGain!);
      if (this.reverbEnabled && this.reverbGain) panner.connect(this.reverbGain);
  }

  private playFMPad(time: number) {
      if (!this.ctx) return;
      const degrees = [0, 2, 4]; 
      const gain = this.ctx.createGain();
      const attack = 1.5;
      const duration = (60 / this.tempo) * 4 * 4;

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.1);

      const panner = this.ctx.createStereoPanner();
      this.connectModMatrix(panner.pan, 'LFO1', 0.4);
      
      degrees.forEach((d) => {
          const note = this.currentChordRoot + this.currentScale[d % this.currentScale.length];
          const freq = midiToFreq(note);
          
          const carrier = this.ctx!.createOscillator();
          carrier.type = 'sine';
          carrier.frequency.value = freq;
          
          const modulator = this.ctx!.createOscillator();
          modulator.type = 'sine';
          modulator.frequency.value = freq * (this.currentPatch.harmonicRatio || 1);
          
          const modGain = this.ctx!.createGain();
          modGain.gain.setValueAtTime(100, time);
          modGain.gain.linearRampToValueAtTime(this.currentPatch.fmDepth * 0.5, time + attack);
          modGain.gain.linearRampToValueAtTime(100, time + duration);
          
          modulator.connect(modGain);
          modGain.connect(carrier.frequency);
          carrier.connect(gain);
          
          carrier.start(time); carrier.stop(time + duration);
          modulator.start(time); modulator.stop(time + duration);
      });

      gain.connect(panner); panner.connect(this.masterGain!);
      if (this.reverbEnabled && this.reverbGain) panner.connect(this.reverbGain);
  }

  private playPluckStep(time: number, step: number) {
      if (!this.ctx || !this.counterPattern) return;
      const noteOffset = this.counterPattern.steps[step];
      const vel = this.counterPattern.velocity[step];
      if (noteOffset === null || vel === 0) return;

      const carrier = this.ctx.createOscillator();
      const modulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();

      const midi = this.currentChordRoot + noteOffset + 12;
      const freq = midiToFreq(midi);

      carrier.type = 'sine';
      carrier.frequency.value = freq;

      modulator.type = 'sine';
      modulator.frequency.value = freq * 2; 
      
      modGain.gain.value = 500 + this.currentPatch.fmDepth; 

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vel * 0.3, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(gain);
      
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (step % 2 === 0) ? -0.4 : 0.4; 

      gain.connect(panner); panner.connect(this.masterGain!); panner.connect(this.delayNode!);
      carrier.start(time); carrier.stop(time + 0.35);
      modulator.start(time); modulator.stop(time + 0.35);
  }

  private playPatternStep(time: number, step: number) {
      if (!this.ctx || !this.currentPattern) return;
      const noteOffset = this.currentPattern.steps[step];
      const velocity = this.currentPattern.velocity[step];
      if (noteOffset === null || velocity === 0) return;
      if (this.macroPhase === MacroPhase.DRIFT && Math.random() > 0.5) return;

      const offsetPct = this.currentPattern.offsets ? (this.currentPattern.offsets[step] || 0) : 0;
      const secondsPer16th = (60 / this.tempo) / 4;
      const actualTime = time + (offsetPct * secondsPer16th);

      const octave = (this.macroPhase === MacroPhase.PEAK && Math.random() > 0.7) ? 12 : 0;
      const midi = this.currentChordRoot + noteOffset + 12 + octave;
      const freq = midiToFreq(midi);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, actualTime);
      gain.gain.linearRampToValueAtTime(velocity * 0.2, actualTime + this.currentPatch.attack);
      gain.gain.linearRampToValueAtTime(0, actualTime + this.currentPatch.release + 0.2);
      
      if (this.reverbEnabled && (this.macroPhase === MacroPhase.DRIFT || this.currentMood === Mood.ETHEREAL)) {
          gain.connect(this.reverbGain!);
      }
      gain.connect(this.masterGain!); gain.connect(this.delayNode!);

      if (this.currentPatch.type === 'FM') {
          const carrier = this.ctx.createOscillator();
          carrier.type = 'sine'; 
          carrier.frequency.value = freq;
          
          const modulator = this.ctx.createOscillator();
          modulator.type = 'sine'; 
          modulator.frequency.value = freq * (this.currentPatch.harmonicRatio || 2);
          
          const modGain = this.ctx.createGain();
          
          const fmAmt = this.currentPatch.fmDepth;
          modGain.gain.setValueAtTime(fmAmt, actualTime);
          modGain.gain.exponentialRampToValueAtTime(1, actualTime + this.currentPatch.decay);
          
          modulator.connect(modGain);
          modGain.connect(carrier.frequency);
          carrier.connect(gain);
          
          carrier.start(actualTime); carrier.stop(actualTime + 0.4);
          modulator.start(actualTime); modulator.stop(actualTime + 0.4);
      
      } else {
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          
          osc1.type = this.currentPatch.waveform;
          osc2.type = 'square';

          osc1.frequency.setValueAtTime(freq, actualTime);
          osc2.frequency.setValueAtTime(freq + 2, actualTime); 
          osc2.detune.value = this.currentPatch.detuneAmount + (this.currentChaosVal * 5); // Chaos detune

          const filter = this.ctx.createBiquadFilter();
          filter.type = this.currentPatch.filterType;
          filter.Q.value = this.resonance * 3;
          this.connectModMatrix(filter.frequency, 'LFO1', 100); 

          const cutoff = this.filterCutoff;
          filter.frequency.setValueAtTime(cutoff, actualTime);
          filter.frequency.linearRampToValueAtTime(cutoff + 2000, actualTime + this.currentPatch.attack * 5); 
          filter.frequency.exponentialRampToValueAtTime(cutoff, actualTime + this.currentPatch.decay);

          osc1.connect(filter); osc2.connect(filter); filter.connect(gain);
          osc1.start(actualTime); osc1.stop(actualTime + 0.4);
          osc2.start(actualTime); osc2.stop(actualTime + 0.4);
      }

      this.log('exec', `pattern.note(${midiToNoteName(midi)})`);
  }

  private playArp(time: number, step: number) {
      if (!this.ctx) return;
      if (this.arpMode === ArpMode.CHORD) {
          if (step % 4 !== 0) return;
          const degrees = [0, 0, 2, 3, 4, 5, 6];
          const rootIndex = degrees[Math.floor(Math.random() * degrees.length)];
          const chordIndices = [rootIndex, (rootIndex + 2) % this.currentScale.length, (rootIndex + 4) % this.currentScale.length];
          const chordNames: string[] = [];
          chordIndices.forEach((idx, i) => {
              const octaveOffset = i === 1 ? 12 : 0; 
              const note = this.currentChordRoot + this.currentScale[idx] + octaveOffset;
              const freq = midiToFreq(note);
              this.playChordVoice(time, freq);
              chordNames.push(midiToNoteName(note));
          });
          this.log('exec', `chord.stab([${chordNames.join(', ')}])`);
          return;
      }
      const scaleLen = this.currentScale.length;
      let index = 0;
      switch(this.arpMode) {
          case ArpMode.UP: index = step % scaleLen; break;
          case ArpMode.DOWN: index = (scaleLen - 1) - (step % scaleLen); break;
          case ArpMode.RANDOM: index = Math.floor(Math.random() * scaleLen); break;
          case ArpMode.CONVERGE: const s = step % scaleLen; index = (s % 2 === 0) ? (s/2) : (scaleLen - 1 - (s-1)/2); break;
      }
      const octave = (step % 8 >= 4) ? 12 : 0; 
      const midi = this.currentChordRoot + this.currentScale[index] + 12 + octave;
      const freq = midiToFreq(midi);
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.filterCutoff * 2, time);
      filter.Q.value = this.resonance * 2;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      
      // Chaos Modulated Panning
      const panner = this.ctx.createStereoPanner();
      // Map ChaosVal (0-1) to (-1 to 1)
      panner.pan.setValueAtTime((this.currentChaosVal * 2) - 1, time);
      
      osc.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(this.masterGain!); panner.connect(this.delayNode!);
      osc.start(time); osc.stop(time + 0.25);
  }

  private playChordVoice(time: number, freq: number) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = this.resonance;
      const cutoff = this.filterCutoff;
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.linearRampToValueAtTime(cutoff + 3000, time + 0.02);
      filter.frequency.exponentialRampToValueAtTime(cutoff, time + 0.3);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.08, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      osc.connect(filter); filter.connect(gain); gain.connect(this.masterGain!); gain.connect(this.delayNode!);
      if (this.reverbEnabled && this.reverbGain) gain.connect(this.reverbGain);
      osc.start(time); osc.stop(time + 0.45);
  }
  
  private createReverbImpulse(duration: number) {
    const rate = this.ctx!.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx!.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const n = length - i;
      const decay = Math.pow(1 - n / length, 2);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    return impulse;
  }

  // WaveShaper Curve for Saturation
  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}