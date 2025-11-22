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
  tempo: number; 
  filterCutoff: number; 
  resonance: number; 
  mood: Mood;
  generationString: string; 
  timeElapsed: number;
  chaos: number; 
}

export interface Pattern {
  id: string;
  steps: (number | null)[]; 
  velocity: number[]; 
  offsets?: number[]; 
  generation: number;
  parent?: string;
  score?: number; 
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
  harmonicRatio: number; 
  filterType: BiquadFilterType;
}

export interface ChordProgression {
  rootOffsets: number[]; 
  barLength: number; 
}

export interface EvolutionLocks {
  melody: boolean;    
  timbre: boolean;    
  harmony: boolean;   
  rhythm: boolean;    
}

export interface EvolutionState {
  isAuto: boolean;       
  locks: EvolutionLocks; 
}

// --- LIFE ENGINE TYPES ---

export type ParticleType = 'BUILDER' | 'THINKER' | 'FEELER';

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: ParticleType;
  energy: number; // 0-100 (Health)
  age: number;
  maxAge: number;
  connections: string[]; // IDs of connected particles (Mycelium network)
}

export interface BioStats {
  population: number;
  averageEnergy: number;
  dominantType: ParticleType;
  synergy: number; // 0-1 How connected the civilization is
}