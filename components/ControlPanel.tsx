import React, { useRef, useState, useEffect } from 'react';
import { Mood, ArpMode, DrumKit, MacroPhase, SynthesisType, SynthPatch, EvolutionLocks } from '../types';

interface ControlPanelProps {
  currentMood: Mood;
  setMood: (m: Mood) => void;
  currentArpMode: ArpMode;
  setArpMode: (m: ArpMode) => void;
  currentDrumKit: DrumKit;
  setDrumKit: (k: DrumKit) => void;
  cutoff: number;
  setCutoff: (v: number) => void;
  resonance: number;
  setResonance: (v: number) => void;
  tempo: number;
  setTempo: (v: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  reverbEnabled: boolean;
  setReverbEnabled: (v: boolean) => void;
  onForcePhase: (p: MacroPhase) => void;
  onSetSynthesisType: (t: SynthesisType) => void;
  onSetFMRatio: (r: number) => void;
  currentPatch: SynthPatch;
  // Evolution Props
  isAutoEvolve: boolean;
  setIsAutoEvolve: (v: boolean) => void;
  locks: EvolutionLocks;
  setLocks: (l: EvolutionLocks) => void;
  onManualMutate: (target: 'melody' | 'timbre' | 'rhythm') => void;
  onParamChange: (key: keyof SynthPatch, value: any) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentMood, setMood, currentArpMode, setArpMode, currentDrumKit, setDrumKit,
  cutoff, setCutoff, resonance, setResonance, tempo, setTempo, volume, setVolume,
  reverbEnabled, setReverbEnabled, onForcePhase, onSetSynthesisType, onSetFMRatio,
  currentPatch, isAutoEvolve, setIsAutoEvolve, locks, setLocks, onManualMutate, onParamChange
}) => {
  const xyRef = useRef<HTMLDivElement>(null);
  const [isDraggingXY, setIsDraggingXY] = useState(false);
  const [activeTab, setActiveTab] = useState<'evo' | 'patch' | 'mix'>('evo');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // XY Pad Logic
  const handleXYMove = (clientX: number, clientY: number) => {
      if (!xyRef.current) return;
      const rect = xyRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1 - ((clientY - rect.top) / rect.height)));
      setCutoff(x);
      setResonance(y);
  };

  const handleMouseDown = (e: React.MouseEvent) => { setIsDraggingXY(true); handleXYMove(e.clientX, e.clientY); };
  const handleTouchMove = (e: React.TouchEvent) => { e.preventDefault(); handleXYMove(e.touches[0].clientX, e.touches[0].clientY); };

  useEffect(() => {
      const up = () => setIsDraggingXY(false);
      const move = (e: MouseEvent) => { if (isDraggingXY) handleXYMove(e.clientX, e.clientY); };
      window.addEventListener('mouseup', up);
      window.addEventListener('mousemove', move);
      return () => { window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', move); };
  }, [isDraggingXY]);

  const toggleLock = (key: keyof EvolutionLocks) => {
      setLocks({ ...locks, [key]: !locks[key] });
  };

  const EvolutionControls = () => (
      <div className="space-y-4">
          {/* Master Switch */}
          <div className="flex items-center justify-between p-3 border border-cyan-500/30 bg-cyan-900/20 rounded">
              <span className="text-xs font-bold text-cyan-300">EVOLUTION ENGINE</span>
              <button 
                onClick={() => setIsAutoEvolve(!isAutoEvolve)}
                className={`px-3 py-1 text-[10px] font-mono font-bold rounded border transition-all ${isAutoEvolve ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-black text-gray-500 border-gray-700'}`}
              >
                  {isAutoEvolve ? 'ONLINE' : 'OFFLINE'}
              </button>
          </div>

          {/* Gene Locks */}
          <div>
              <label className="text-[10px] text-fuchsia-500 uppercase tracking-wider mb-2 block">Gene Locking (Protect from AI)</label>
              <div className="grid grid-cols-2 gap-2">
                  {Object.keys(locks).map(key => (
                      <button 
                        key={key}
                        onClick={() => toggleLock(key as keyof EvolutionLocks)}
                        className={`p-2 text-[9px] uppercase font-mono border rounded flex justify-between items-center ${locks[key as keyof EvolutionLocks] ? 'border-red-500 bg-red-900/20 text-red-300' : 'border-gray-700 text-gray-500'}`}
                      >
                          <span>{key}</span>
                          <span className="text-[8px]">{locks[key as keyof EvolutionLocks] ? 'LOCKED' : 'OPEN'}</span>
                      </button>
                  ))}
              </div>
          </div>

          {/* Manual Mutation */}
          <div>
              <label className="text-[10px] text-yellow-500 uppercase tracking-wider mb-2 block">Manual Mutation Trigger</label>
              <div className="flex gap-2">
                  <button onClick={() => onManualMutate('melody')} className="flex-1 py-2 border border-yellow-700 text-yellow-600 text-[9px] hover:bg-yellow-900/30 rounded">
                      MUTATE MELODY
                  </button>
                  <button onClick={() => onManualMutate('timbre')} className="flex-1 py-2 border border-yellow-700 text-yellow-600 text-[9px] hover:bg-yellow-900/30 rounded">
                      MUTATE SOUND
                  </button>
                  <button onClick={() => onManualMutate('rhythm')} className="flex-1 py-2 border border-yellow-700 text-yellow-600 text-[9px] hover:bg-yellow-900/30 rounded">
                      MUTATE DRUMS
                  </button>
              </div>
          </div>
          
          {/* Mood */}
          <div>
            <label className="text-[10px] text-cyan-600 uppercase tracking-wider mb-1 block">Emotional Context</label>
            <div className="grid grid-cols-4 gap-1">
            {Object.values(Mood).map((m) => (
                <button
                key={m}
                onClick={() => setMood(m)}
                className={`py-1 text-[9px] font-mono border rounded truncate ${currentMood === m ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100' : 'border-cyan-900/30 text-cyan-700'}`}
                >
                {m.substring(0,4)}
                </button>
            ))}
            </div>
        </div>
      </div>
  );

  const PatchControls = () => (
      <div className="space-y-4">
        {/* XY Pad */}
        <div>
            <label className="text-[10px] text-yellow-500 uppercase tracking-wider mb-1 flex justify-between">
                <span>Filter / Resonance</span>
                <span className="text-yellow-300 opacity-50 font-mono text-[9px]">X: Cutoff | Y: Res</span>
            </label>
            <div 
                ref={xyRef}
                onMouseDown={handleMouseDown}
                onTouchStart={(e) => { setIsDraggingXY(true); handleTouchMove(e); }}
                onTouchMove={handleTouchMove}
                className="w-full h-20 bg-gray-900 border border-yellow-900/50 rounded relative cursor-crosshair touch-none overflow-hidden"
            >
                <div 
                    className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${cutoff * 100}%`, top: `${(1 - resonance) * 100}%` }}
                />
            </div>
        </div>

        {/* Engine Type */}
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
            <span>ENGINE: {currentPatch?.type}</span>
            <div className="flex gap-1">
                <button onClick={() => onSetSynthesisType('SUBTRACTIVE')} className={`px-2 py-1 rounded ${currentPatch?.type === 'SUBTRACTIVE' ? 'bg-yellow-600 text-white' : 'bg-gray-800'}`}>ANLG</button>
                <button onClick={() => onSetSynthesisType('FM')} className={`px-2 py-1 rounded ${currentPatch?.type === 'FM' ? 'bg-yellow-600 text-white' : 'bg-gray-800'}`}>FM</button>
            </div>
        </div>

        {/* FM Ratio */}
        {currentPatch?.type === 'FM' && (
             <div>
                <div className="flex justify-between mb-1">
                    <label className="text-[10px] text-yellow-500 uppercase tracking-wider">FM Color (Ratio)</label>
                    <span className="text-[10px] text-yellow-300 font-mono">{currentPatch.harmonicRatio}x</span>
                </div>
                <input
                    type="range" min="0.5" max="8" step="0.5"
                    value={currentPatch.harmonicRatio || 2}
                    onChange={(e) => onSetFMRatio(Number(e.target.value))}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            </div>
        )}

        {/* ADSR */}
        <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">Envelope Generator</label>
            <div className="grid grid-cols-4 gap-2">
                {['attack', 'decay', 'sustain', 'release'].map(param => (
                    <div key={param} className="flex flex-col items-center">
                        <input 
                            type="range" min="0.01" max="1" step="0.01"
                            value={currentPatch?.[param as keyof SynthPatch] as number || 0.1}
                            onChange={(e) => onParamChange(param as keyof SynthPatch, parseFloat(e.target.value))}
                            className="h-20 w-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500 [writing-mode:vertical-lr]"
                        />
                        <span className="text-[8px] uppercase mt-1 text-gray-500">{param.substring(0,1)}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Waveform */}
        <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Oscillator Shape</label>
            <div className="grid grid-cols-4 gap-1">
                {['sine', 'triangle', 'square', 'sawtooth'].map(wave => (
                    <button 
                        key={wave}
                        onClick={() => onParamChange('waveform', wave)}
                        className={`py-1 text-[8px] uppercase border rounded ${currentPatch?.waveform === wave ? 'bg-yellow-600/40 border-yellow-500 text-white' : 'border-gray-800 text-gray-600'}`}
                    >
                        {wave.substring(0,3)}
                    </button>
                ))}
            </div>
        </div>
      </div>
  );

  const MixControls = () => (
      <div className="space-y-6">
          <div>
            <label className="text-[10px] text-blue-500 uppercase tracking-wider mb-1 block">Tempo (BPM): {Math.round(tempo)}</label>
            <input type="range" min="120" max="150" value={tempo} onChange={(e) => setTempo(Number(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>
          <div>
            <label className="text-[10px] text-white uppercase tracking-wider mb-1 block">Master Vol: {Math.round(volume * 100)}%</label>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-white" />
          </div>
          <div>
            <label className="text-[10px] text-orange-500 uppercase tracking-wider mb-1 block">Drum Kit</label>
            <div className="grid grid-cols-2 gap-1">
             {Object.values(DrumKit).map((k) => (
                <button key={k} onClick={() => setDrumKit(k)} className={`py-1 text-[9px] font-mono border rounded ${currentDrumKit === k ? 'bg-orange-500/20 border-orange-400 text-orange-100' : 'bg-transparent border-orange-900/30 text-orange-700'}`}>{k}</button>
             ))}
            </div>
          </div>
          
          {/* Arp Mode */}
          <div>
            <label className="text-[10px] text-green-500 uppercase tracking-wider mb-1 block">Arp Mode</label>
            <div className="grid grid-cols-3 gap-1">
             {Object.values(ArpMode).map((m) => (
                <button key={m} onClick={() => setArpMode(m)} className={`py-1 text-[9px] font-mono border rounded ${currentArpMode === m ? 'bg-green-500/20 border-green-400 text-green-100' : 'bg-transparent border-green-900/30 text-green-700'}`}>{m}</button>
             ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-2 border border-purple-900/30 rounded bg-purple-900/10">
              <span className="text-[10px] text-purple-400 uppercase tracking-wider">Reverb FX</span>
              <button onClick={() => setReverbEnabled(!reverbEnabled)} className={`w-8 h-4 rounded-full relative transition-colors ${reverbEnabled ? 'bg-purple-500' : 'bg-gray-700'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${reverbEnabled ? 'left-4.5 translate-x-0.5' : 'left-0.5'}`} />
              </button>
          </div>
      </div>
  );

  const MobileToggle = () => (
      <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="md:hidden fixed bottom-20 right-4 z-50 bg-cyan-900/80 text-cyan-100 p-3 rounded-full border border-cyan-500/50 shadow-lg backdrop-blur-sm">
          {isMobileOpen ? '▼' : '▲'}
      </button>
  );

  return (
    <>
        <MobileToggle />
        <div className={`fixed bottom-0 left-0 w-full md:static md:w-96 md:rounded-xl z-40 bg-black/90 md:bg-black/60 backdrop-blur-xl border-t md:border border-cyan-900/50 transition-transform duration-300 ease-in-out flex flex-col ${isMobileOpen ? 'translate-y-0' : 'translate-y-[90%] md:translate-y-0'}`}>
            <div className="w-full h-6 flex items-center justify-center md:hidden cursor-pointer bg-gradient-to-b from-cyan-900/20 to-transparent" onClick={() => setIsMobileOpen(!isMobileOpen)}>
                <div className="w-12 h-1 bg-cyan-700/50 rounded-full" />
            </div>
            <div className="flex border-b border-cyan-900/50">
                {[ { id: 'evo', label: 'EVOLUTION' }, { id: 'patch', label: 'PATCH' }, { id: 'mix', label: 'MIX' } ].map(tab => (
                    <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setIsMobileOpen(true); }} className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors ${activeTab === tab.id ? 'text-cyan-400 bg-cyan-900/20 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-cyan-200'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="p-6 h-[400px] md:h-auto overflow-y-auto">
                {activeTab === 'evo' && <EvolutionControls />}
                {activeTab === 'patch' && <PatchControls />}
                {activeTab === 'mix' && <MixControls />}
            </div>
        </div>
    </>
  );
};