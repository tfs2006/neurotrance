import { Scale } from './types';

// Base Frequency for A4
export const A4 = 440;

// Musical Scales (Intervallic distances in semitones)
export const SCALES: Record<string, Scale> = {
  MINOR: [0, 2, 3, 5, 7, 8, 10],
  PHRYGIAN: [0, 1, 3, 5, 7, 8, 10], // Darker, trance-like
  DORIAN: [0, 2, 3, 5, 7, 9, 10],
  HARMONIC_MINOR: [0, 2, 3, 5, 7, 8, 11],
};

// Helper to get frequency from MIDI note number
export const midiToFreq = (note: number): number => {
  return A4 * Math.pow(2, (note - 69) / 12);
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const midiToNoteName = (midi: number): string => {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
};

// Root notes for trance (usually F, G, A, A#)
export const ROOT_NOTES = [41, 43, 45, 46, 48]; // F2 to C3 range

// Trance specific constants
export const BASE_TEMPO = 138;
export const LOOKAHEAD = 25.0; // ms
export const SCHEDULE_AHEAD_TIME = 0.1; // s