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
  generation: number;
  parent?: string;
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