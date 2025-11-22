export enum Mood {
  ETHEREAL = 'ETHEREAL',
  DRIVING = 'DRIVING',
  DARK = 'DARK',
  EUPHORIC = 'EUPHORIC',
}

export enum ArpMode {
  OFF = 'OFF',
  UP = 'UP',
  DOWN = 'DOWN',
  RANDOM = 'RANDOM',
  CONVERGE = 'CONVERGE',
  CHORD = 'CHORD',
}

export enum MacroPhase {
  DRIFT = 'DRIFT',
  BUILD = 'BUILD',
  PEAK = 'PEAK',
  COMEDOWN = 'COMEDOWN',
}

export enum DrumKit {
  TRANCE = 'TRANCE',
  ANALOG_808 = '808',
  VINTAGE_909 = '909',
  ACOUSTIC = 'ACOUSTIC',
}

export interface AudioState {
  isPlaying: boolean;
  tempo: number; // BPM
  filterCutoff: number; // 0 to 1 normalized
  resonance: number; // 0 to 1 normalized
  mood: Mood;
  generationString: string; // A visual representation of the current 'seed'
  timeElapsed: number;
}

export interface Pattern {
  id: string;
  steps: (number | null)[]; // MIDI offsets from root, or null for rest
  velocity: number[]; // 0-1
  offsets?: number[]; // -0.5 to 0.5 representing percentage of a 16th note shift
  generation: number;
  parent?: string;
  score?: number; // Fitness score for evolutionary selection
}

export interface Note {
  freq: number;
  duration: number;
  time: number;
  type: 'bass' | 'lead' | 'pad';
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'exec' | 'event';
}

export type Scale = number[];

// --- NEW ADVANCED TYPES ---

export type SynthesisType = 'SUBTRACTIVE' | 'FM';

export interface SynthPatch {
  type: SynthesisType;
  waveform: OscillatorType;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  detuneAmount: number;
  fmDepth: number;
  harmonicRatio: number; // FM: Modulator freq multiplier
  filterType: BiquadFilterType;
}

export interface ChordProgression {
  rootOffsets: number[]; // e.g., [0, -2, 5, 7] relative to key center
  barLength: number; // How many bars per chord
}

export interface EvolutionLocks {
  melody: boolean;    // If true, pattern steps/velocity won't change
  timbre: boolean;    // If true, synth patch (ADSR, Wave) won't change
  harmony: boolean;   // If true, chord progression/key won't change
  rhythm: boolean;    // If true, drum patterns won't change
}

export interface EvolutionState {
  isAuto: boolean;       // Master Auto-Evolve Switch
  locks: EvolutionLocks; // Granular control
}