import React from 'react';
import { Mood, ArpMode } from '../types';

interface ControlPanelProps {
  currentMood: Mood;
  setMood: (m: Mood) => void;
  currentArpMode: ArpMode;
  setArpMode: (m: ArpMode) => void;
  cutoff: number;
  setCutoff: (v: number) => void;
  resonance: number;
  setResonance: (v: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentMood,
  setMood,
  currentArpMode,
  setArpMode,
  cutoff,
  setCutoff,
  resonance,
  setResonance,
}) => {
  return (
    <div className="bg-black/80 backdrop-blur-md border border-cyan-900/50 p-6 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.1)] w-full max-w-md z-10 relative">
      <h2 className="text-cyan-400 text-xl mb-4 font-bold tracking-widest border-b border-cyan-900/50 pb-2">
        SYSTEM CONTROLS
      </h2>

      {/* Mood Selectors */}
      <div className="mb-4">
        <label className="text-xs text-cyan-600 uppercase tracking-wider mb-2 block">Emotional State</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(Mood).map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={`
                py-2 text-xs font-mono transition-all duration-300 border
                ${currentMood === m 
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                  : 'bg-transparent border-cyan-900/30 text-cyan-700 hover:border-cyan-600'}
              `}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Arp Selectors */}
      <div className="mb-6">
        <label className="text-xs text-green-600 uppercase tracking-wider mb-2 block">Arpeggiator Logic</label>
        <div className="flex flex-wrap gap-2">
          {Object.values(ArpMode).map((m) => (
            <button
              key={m}
              onClick={() => setArpMode(m)}
              className={`
                flex-1 py-1 text-[10px] font-mono transition-all duration-300 border
                ${currentArpMode === m 
                  ? 'bg-green-500/20 border-green-400 text-green-100' 
                  : 'bg-transparent border-green-900/30 text-green-700 hover:border-green-600'}
              `}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-6">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-fuchsia-500 uppercase tracking-wider">Filter Cutoff</label>
            <span className="text-xs text-fuchsia-300 font-mono">{Math.round(cutoff * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={cutoff}
            onChange={(e) => setCutoff(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 hover:accent-fuchsia-400"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-violet-500 uppercase tracking-wider">Resonance</label>
            <span className="text-xs text-violet-300 font-mono">{Math.round(resonance * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.01"
            value={resonance}
            onChange={(e) => setResonance(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400"
          />
        </div>
      </div>
    </div>
  );
};