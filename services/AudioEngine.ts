import { SCALES, midiToFreq, midiToNoteName, ROOT_NOTES, BASE_TEMPO, SCHEDULE_AHEAD_TIME, LOOKAHEAD } from '../constants';
import { Mood, ArpMode, LogEntry, Pattern, MacroPhase } from '../types';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Effects
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;

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
  
  // Evolution Parameters
  private filterCutoff: number = 500;
  private resonance: number = 0;
  private noteDensity: number = 0.2; 
  private evolutionCounter: number = 0;
  private arpMode: ArpMode = ArpMode.OFF;

  // Advanced Evolution (GA)
  private currentPattern: Pattern | null = null;
  private patternHistory: Pattern[] = [];
  private currentGeneration: number = 0;
  private macroPhase: MacroPhase = MacroPhase.DRIFT;
  private phaseTimer: number = 0; // Bars in current phase

  // Callbacks
  private onSchedulerTick: ((step: number, meta: string) => void) | null = null;
  private onLog: ((entry: LogEntry) => void) | null = null;

  constructor() {
    // Lazy initialization is handled in start()
  }

  public async initialize() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    if (!this.ctx) throw new Error("Web Audio API not supported");

    this.log('info', 'Initializing AudioContext...');

    // Master Chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.85;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Effects Bus (Simple Delay)
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = (60 / this.tempo) * 0.75; // Dotted 8th note delay
    this.delayFeedback = this.ctx.createGain();
    
    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2000;

    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(delayFilter);
    delayFilter.connect(this.delayNode);

    // Reverb (Algorithmic impulse)
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createReverbImpulse(2.5); // 2.5s tail

    // Connections
    // Master -> Compressor -> Analyser -> Destination
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    
    // FX -> Master
    this.delayNode.connect(this.masterGain);
    this.reverbNode.connect(this.masterGain);

    this.log('info', 'DSP Chain Constructed: Comp -> Delay -> Reverb');

    // Initialize first pattern
    this.evolvePattern();
    this.setMood(this.currentMood);
  }

  public setCallback(cb: (step: number, meta: string) => void) {
    this.onSchedulerTick = cb;
  }

  public setLogCallback(cb: (entry: LogEntry) => void) {
    this.onLog = cb;
  }

  private log(type: 'info' | 'exec' | 'event', message: string) {
    if (this.onLog) {
      this.onLog({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        type,
        message
      });
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public start() {
    if (this.isPlaying) return;
    if (!this.ctx) this.initialize();
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
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
    this.log('event', 'SEQUENCE_TERMINATED');
  }

  public setMood(mood: Mood) {
    this.currentMood = mood;
    if (this.ctx && this.delayFeedback) {
        this.applyMoodParams(mood);
    }
    this.log('event', `MOOD_SHIFT >> ${mood}`);
  }

  private applyMoodParams(mood: Mood) {
      if (!this.delayFeedback) return;
      
      switch (mood) {
      case Mood.ETHEREAL:
        this.currentScale = SCALES.DORIAN;
        this.delayFeedback.gain.value = 0.6;
        break;
      case Mood.DARK:
        this.currentScale = SCALES.PHRYGIAN;
        this.delayFeedback.gain.value = 0.3;
        break;
      case Mood.DRIVING:
        this.currentScale = SCALES.MINOR;
        this.delayFeedback.gain.value = 0.4;
        break;
      case Mood.EUPHORIC:
        this.currentScale = SCALES.HARMONIC_MINOR;
        this.delayFeedback.gain.value = 0.5;
        break;
    }
  }

  public setArpMode(mode: ArpMode) {
    this.arpMode = mode;
    this.log('event', `ARP_MODE >> ${mode}`);
  }

  public updateParams(cutoffNorm: number, resonanceNorm: number) {
    // Map 0-1 to frequency range (100Hz - 12000Hz)
    this.filterCutoff = 100 + (cutoffNorm * 11900); 
    this.resonance = resonanceNorm * 20;
  }

  // ----------------------------------------------------------------
  // GENETIC ALGORITHM & PATTERNS
  // ----------------------------------------------------------------

  private createRandomPattern(length: number = 16): Pattern {
    const steps: (number | null)[] = [];
    const velocity: number[] = [];
    
    for(let i=0; i<length; i++) {
        // 40% chance of a note
        if (Math.random() > 0.6) {
            const scaleDegree = Math.floor(Math.random() * this.currentScale.length);
            steps.push(this.currentScale[scaleDegree]);
            velocity.push(0.5 + Math.random() * 0.5);
        } else {
            steps.push(null);
            velocity.push(0);
        }
    }

    return {
        id: Math.random().toString(36).substr(2, 5),
        steps,
        velocity,
        generation: 0
    };
  }

  private evolvePattern() {
      if (!this.currentPattern) {
          this.currentPattern = this.createRandomPattern();
          this.log('event', `GENESIS >> Created Gen 0 Pattern ${this.currentPattern.id}`);
          return;
      }

      // Add current to history
      this.patternHistory.push(this.currentPattern);
      if (this.patternHistory.length > 5) this.patternHistory.shift();

      this.currentGeneration++;

      const mutationType = Math.random();
      let newSteps = [...this.currentPattern.steps];
      let newVel = [...this.currentPattern.velocity];
      let parentId = this.currentPattern.id;
      let action = "MUTATION";

      if (mutationType > 0.7 && this.patternHistory.length >= 2) {
          // CROSSOVER
          action = "CROSSOVER";
          const partner = this.patternHistory[Math.floor(Math.random() * (this.patternHistory.length - 1))];
          parentId = `${this.currentPattern.id} x ${partner.id}`;
          
          // Take first half of current, second half of partner
          const split = Math.floor(newSteps.length / 2);
          newSteps = [...this.currentPattern.steps.slice(0, split), ...partner.steps.slice(split)];
          newVel = [...this.currentPattern.velocity.slice(0, split), ...partner.velocity.slice(split)];
      } else {
          // MUTATION
          // Change 1 to 3 notes
          const numMutations = 1 + Math.floor(Math.random() * 2);
          for(let i=0; i<numMutations; i++) {
              const idx = Math.floor(Math.random() * newSteps.length);
              
              // Check if there is currently a note at this step
              const hasNote = newSteps[idx] !== null;
              
              if (hasNote) {
                  // If there is a note, prefer changing its pitch (maintaining rhythm)
                  // 80% chance to change pitch, 20% chance to remove it
                  if (Math.random() > 0.2) {
                      const scaleDegree = Math.floor(Math.random() * this.currentScale.length);
                      newSteps[idx] = this.currentScale[scaleDegree];
                      newVel[idx] = 0.6 + Math.random() * 0.4;
                  } else {
                      // Remove note
                      newSteps[idx] = null;
                      newVel[idx] = 0;
                  }
              } else {
                  // If there is a rest, low chance to add a note (changing rhythm)
                  // 20% chance to add note, 80% chance to leave as rest
                  if (Math.random() > 0.8) {
                     const scaleDegree = Math.floor(Math.random() * this.currentScale.length);
                     newSteps[idx] = this.currentScale[scaleDegree];
                     newVel[idx] = 0.7;
                  }
              }
          }
      }

      this.currentPattern = {
          id: Math.random().toString(36).substr(2, 5),
          steps: newSteps,
          velocity: newVel,
          generation: this.currentGeneration,
          parent: parentId
      };

      this.log('event', `EVOLUTION >> ${action} (Gen ${this.currentGeneration})`);
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
      this.timerID = window.setTimeout(() => this.scheduler(), LOOKAHEAD);
    }
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // Advance by a 16th note
    this.current16thNote++;
    
    if (this.current16thNote === 16) {
      this.current16thNote = 0;
      this.measureCount++;
      this.handleMacroStructure();
    }
  }

  private handleMacroStructure() {
      this.phaseTimer++;

      // Define phase lengths in bars
      const phaseLengths = {
          [MacroPhase.DRIFT]: 8,
          [MacroPhase.BUILD]: 8,
          [MacroPhase.PEAK]: 16,
          [MacroPhase.COMEDOWN]: 8
      };

      if (this.phaseTimer >= phaseLengths[this.macroPhase]) {
          this.transitionPhase();
      }

      // Every 4 bars, evolve the melody pattern
      if (this.measureCount % 4 === 0) {
          this.evolvePattern();
      }

      // Every 16 bars, potentially shift root note
      if (this.measureCount % 16 === 0 && this.macroPhase !== MacroPhase.PEAK) {
        const idx = Math.floor(Math.random() * ROOT_NOTES.length);
        this.rootNote = ROOT_NOTES[idx];
        this.log('event', `ROOT_SHIFT >> ${midiToNoteName(this.rootNote)}`);
      }

      const meta = `${this.macroPhase} | GEN:${this.currentGeneration} | P:${this.currentPattern?.id}`;
      if (this.onSchedulerTick) this.onSchedulerTick(this.current16thNote, meta);
  }

  private transitionPhase() {
      this.phaseTimer = 0;
      const phases = [MacroPhase.DRIFT, MacroPhase.BUILD, MacroPhase.PEAK, MacroPhase.COMEDOWN];
      const currentIdx = phases.indexOf(this.macroPhase);
      this.macroPhase = phases[(currentIdx + 1) % phases.length];
      
      this.log('event', `MACRO_PHASE >> ${this.macroPhase}`);

      // Automate parameters based on phase
      switch(this.macroPhase) {
          case MacroPhase.DRIFT:
              this.noteDensity = 0.2;
              this.filterCutoff = 400;
              break;
          case MacroPhase.BUILD:
              this.noteDensity = 0.6;
              this.filterCutoff = 2000;
              break;
          case MacroPhase.PEAK:
              this.noteDensity = 0.9;
              this.filterCutoff = 8000; // Open up
              break;
          case MacroPhase.COMEDOWN:
              this.noteDensity = 0.4;
              this.filterCutoff = 800;
              break;
      }
  }

  private scheduleNote(beatNumber: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // 1. KICK
    // Kick plays on 1, 5, 9, 13 (Four on floor)
    // In DRIFT phase, kick might be sparse
    if (beatNumber % 4 === 0) {
      if (this.macroPhase !== MacroPhase.DRIFT || beatNumber === 0) {
          this.playKick(time);
          // this.log('exec', `kick(t=${time.toFixed(2)})`);
      }
    }

    // 2. SNARE / CLAP
    // Plays on 5, 13 (Standard backbeat) in BUILD/PEAK
    if (beatNumber % 8 === 4) {
        if (this.macroPhase === MacroPhase.PEAK || (this.macroPhase === MacroPhase.BUILD && this.phaseTimer > 4)) {
            this.playSnare(time);
            this.log('exec', `snare(t=${time.toFixed(2)})`);
        }
    }

    // 3. HI-HATS
    if (beatNumber % 2 === 0) {
        // 8th notes
        if (beatNumber % 4 === 2) { // Open hat on off-beat
            if (this.macroPhase !== MacroPhase.DRIFT) {
                this.playHiHat(time, true);
            }
        } else {
            // Closed hats
            if (this.macroPhase === MacroPhase.PEAK || this.macroPhase === MacroPhase.BUILD) {
                 this.playHiHat(time, false);
            }
        }
    } else if (this.macroPhase === MacroPhase.PEAK) {
        // 16th notes filler
        if (Math.random() > 0.4) this.playHiHat(time, false);
    }

    // 4. BASS
    const isKickStep = beatNumber % 4 === 0;
    if (!isKickStep && this.macroPhase !== MacroPhase.DRIFT) {
      this.playBass(time, beatNumber);
    }

    // 5. PATTERN LEAD (GENETIC)
    if (this.currentPattern) {
        this.playPatternStep(time, beatNumber);
    }

    // 6. ARP (User Override)
    if (this.arpMode !== ArpMode.OFF) {
        this.playArp(time, beatNumber);
    }
  }

  // ----------------------------------------------------------------
  // SYNTHESIZERS
  // ----------------------------------------------------------------

  private playKick(time: number) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    // Punchier kick for PEAK
    const startFreq = this.macroPhase === MacroPhase.PEAK ? 180 : 150;
    const decay = this.macroPhase === MacroPhase.PEAK ? 0.4 : 0.5;

    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + decay);
    
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + decay);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(time);
    osc.stop(time + decay);
  }

  private playSnare(time: number) {
      // Noise part
      const bufferSize = this.ctx!.sampleRate * 0.2;
      const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1);
      }
      const noise = this.ctx!.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx!.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;

      const noiseGain = this.ctx!.createGain();
      noiseGain.gain.setValueAtTime(0.8, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain!);
      noiseGain.connect(this.reverbNode!); // Snare needs reverb

      noise.start(time);

      // Tonal part (body)
      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, time);
      
      const oscGain = this.ctx!.createGain();
      oscGain.gain.setValueAtTime(0.5, time);
      oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain!);
      osc.start(time);
      osc.stop(time + 0.15);
  }

  private playHiHat(time: number, open: boolean) {
    const duration = open ? 0.1 : 0.04;
    const bufferSize = this.ctx!.sampleRate * duration;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx!.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(open ? 0.25 : 0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    
    noise.start(time);
  }

  private playBass(time: number, step: number) {
    const osc = this.ctx!.createOscillator();
    osc.type = 'sawtooth';
    const midi = this.rootNote - 12; // Sub bass octave
    const freq = midiToFreq(midi);
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = this.resonance * 0.5;
    
    // Dynamic envelope based on phase
    const envAmt = this.macroPhase === MacroPhase.PEAK ? this.filterCutoff * 3 : this.filterCutoff;
    
    filter.frequency.setValueAtTime(this.filterCutoff * 0.5, time); 
    filter.frequency.exponentialRampToValueAtTime(envAmt, time + 0.05);
    filter.frequency.exponentialRampToValueAtTime(this.filterCutoff * 0.5, time + 0.2);

    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.4, time + 0.02);
    gain.gain.linearRampToValueAtTime(0, time + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(time);
    osc.stop(time + 0.22);
  }

  private playPatternStep(time: number, step: number) {
      if (!this.currentPattern) return;

      const noteOffset = this.currentPattern.steps[step];
      const velocity = this.currentPattern.velocity[step];

      if (noteOffset === null || velocity === 0) return;

      // If we are in DRIFT, skip some notes randomly for atmosphere
      if (this.macroPhase === MacroPhase.DRIFT && Math.random() > 0.5) return;

      const osc1 = this.ctx!.createOscillator();
      const osc2 = this.ctx!.createOscillator();
      
      osc1.type = 'sawtooth';
      osc2.type = 'square'; // Mixed waveform for pattern lead

      // Octave jump probability based on phase
      const octave = (this.macroPhase === MacroPhase.PEAK && Math.random() > 0.7) ? 12 : 0;
      
      const midi = this.rootNote + noteOffset + 12 + octave;
      const freq = midiToFreq(midi);

      // Detune slightly
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq + 2, time); 

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = this.resonance * 3;
      
      // Filter automation is heavily dependent on the user knob + macro phase
      const cutoff = this.filterCutoff;
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.linearRampToValueAtTime(cutoff + 2000, time + 0.05);
      filter.frequency.exponentialRampToValueAtTime(cutoff, time + 0.2);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(velocity * 0.2, time + 0.02);
      gain.gain.linearRampToValueAtTime(0, time + 0.25);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      gain.connect(this.delayNode!);
      
      // Send to reverb if in Ethereal/Drift
      if (this.macroPhase === MacroPhase.DRIFT || this.currentMood === Mood.ETHEREAL) {
          gain.connect(this.reverbNode!);
      }

      osc1.start(time);
      osc1.stop(time + 0.3);
      osc2.start(time);
      osc2.stop(time + 0.3);

      this.log('exec', `pattern.note(${midiToNoteName(midi)})`);
  }

  private playArp(time: number, step: number) {
      // Handle Chord Mode (Stabs on beats)
      if (this.arpMode === ArpMode.CHORD) {
          // Only play on quarter notes (0, 4, 8, 12)
          if (step % 4 !== 0) return;

          // Pick a random root degree from the scale for the chord
          // Weighted towards 0 (Root), 2 (3rd), 4 (5th) for stability
          const degrees = [0, 0, 2, 3, 4, 5, 6];
          const rootIndex = degrees[Math.floor(Math.random() * degrees.length)];
          
          // Build a Triad (Root, 3rd, 5th) wrapped around scale length
          const chordIndices = [
              rootIndex,
              (rootIndex + 2) % this.currentScale.length,
              (rootIndex + 4) % this.currentScale.length
          ];

          const chordNames: string[] = [];

          chordIndices.forEach((idx, i) => {
              const octaveOffset = i === 1 ? 12 : 0; // Spread voicing
              const note = this.rootNote + this.currentScale[idx] + octaveOffset;
              const freq = midiToFreq(note);
              this.playChordVoice(time, freq);
              chordNames.push(midiToNoteName(note));
          });

          this.log('exec', `chord.stab([${chordNames.join(', ')}])`);
          return;
      }

      // STANDARD ARP LOGIC
      const scaleLen = this.currentScale.length;
      let index = 0;

      switch(this.arpMode) {
          case ArpMode.UP:
              index = step % scaleLen;
              break;
          case ArpMode.DOWN:
              index = (scaleLen - 1) - (step % scaleLen);
              break;
          case ArpMode.RANDOM:
              index = Math.floor(Math.random() * scaleLen);
              break;
          case ArpMode.CONVERGE:
              // 0, 7, 1, 6, 2, 5...
              const half = Math.ceil(scaleLen / 2);
              const s = step % scaleLen;
              index = (s % 2 === 0) ? (s/2) : (scaleLen - 1 - (s-1)/2);
              break;
      }

      const octave = (step % 8 >= 4) ? 12 : 0; 
      const midi = this.rootNote + this.currentScale[index] + 12 + octave;
      const freq = midiToFreq(midi);

      const osc = this.ctx!.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.filterCutoff * 2, time);
      filter.Q.value = this.resonance * 2;

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      gain.connect(this.delayNode!);

      osc.start(time);
      osc.stop(time + 0.25);
  }

  private playChordVoice(time: number, freq: number) {
      // Supersaw-ish Stab
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      // Separate filter for chord stabs
      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = this.resonance;
      
      // Snappy envelope
      const cutoff = this.filterCutoff;
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.linearRampToValueAtTime(cutoff + 3000, time + 0.02);
      filter.frequency.exponentialRampToValueAtTime(cutoff, time + 0.3);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.08, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      gain.connect(this.delayNode!);
      
      // Add some reverb for space
      if (this.reverbNode) {
          const reverbSend = this.ctx!.createGain();
          reverbSend.gain.value = 0.3;
          gain.connect(reverbSend);
          reverbSend.connect(this.reverbNode);
      }

      osc.start(time);
      osc.stop(time + 0.45);
  }

  // ----------------------------------------------------------------
  // UTILITIES
  // ----------------------------------------------------------------
  
  private createReverbImpulse(duration: number) {
    const rate = this.ctx!.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx!.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      left[i] = (Math.random() * 2 - 1) * Math.pow(n / length, 2);
      right[i] = (Math.random() * 2 - 1) * Math.pow(n / length, 2);
    }
    return impulse;
  }
}