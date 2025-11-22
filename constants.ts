import { Scale } from './types';

// Base Frequency for A4
export const A4 = 440;

// Musical Scales (Strict Pentatonic - 5 notes per octave)
// These scales remove dissonant intervals (tritones/semitones) for a smoother, "floating" trance sound.
export const SCALES: Record<string, Scale> = {
  // Minor Pentatonic (The standard for Deep Trance)
  // Intervals: Root, b3, 4, 5, b7
  MINOR: [0, 3, 5, 7, 10],

  // Hirajoshi (Japanese Scale - Dark/Psytrance vibe)
  // Intervals: Root, 2, b3, 5, b6 (Mapped to closest semitones)
  PHRYGIAN: [0, 2, 3, 7, 8], 

  // Egyptian / Suspended (Ethereal/Floating vibe)
  // Intervals: Root, 2, 4, 5, b7
  DORIAN: [0, 2, 5, 7, 10],

  // "In-Sen" or Exotic Pentatonic (Euphoric/Goa vibe)
  // A subset of Harmonic Minor
  HARMONIC_MINOR: [0, 1, 5, 7, 8],
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