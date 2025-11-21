import React, { useRef, useState, useEffect } from 'react';
import { Mood, ArpMode, DrumKit, MacroPhase } from '../types';

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
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  currentMood,
  setMood,
  currentArpMode,
  setArpMode,
  currentDrumKit,
  setDrumKit,
  cutoff,
  setCutoff,
  resonance,
  setResonance,
  tempo,
  setTempo,
  volume,
  setVolume,
  reverbEnabled,
  setReverbEnabled,
  onForcePhase
}) => {
  const xyRef = useRef<HTMLDivElement>(null);
  const [isDraggingXY, setIsDraggingXY] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'synth' | 'mix'>('main');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // XY Pad Logic
  const handleXYMove = (clientX: number, clientY: number) => {
      if (!xyRef.current) return;
      const rect = xyRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1 - ((clientY - rect.top) / rect.height))); // Invert Y so up is more resonance
      
      setCutoff(x);
      setResonance(y);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDraggingXY(true);
      handleXYMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent scroll
      handleXYMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  useEffect(() => {
      const up = () => setIsDraggingXY(false);
      const move = (e: MouseEvent) => {
          if (isDraggingXY) handleXYMove(e.clientX, e.clientY);
      };
      window.addEventListener('mouseup', up);
      window.addEventListener('mousemove', move);
      return () => {
          window.removeEventListener('mouseup', up);
          window.removeEventListener('mousemove', move);
      };
  }, [isDraggingXY]);

  // Components for Tabs
  const MainControls = () => (
      <div className="space-y-4">
        {/* Moods */}
        <div>
            <label className="text-[10px] text-cyan-600 uppercase tracking-wider mb-1 block">Mood Matrix</label>
            <div className="grid grid-cols-2 gap-2">
            {Object.values(Mood).map((m) => (
                <button
                key={m}
                onClick={() => setMood(m)}
                className={`
                    py-2 text-[10px] font-mono transition-all duration-200 border rounded
                    ${currentMood === m 
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                    : 'bg-black/40 border-cyan-900/30 text-cyan-700 hover:border-cyan-600'}
                `}
                >
                {m}
                </button>
            ))}
            </div>
        </div>

        {/* Transition Buttons */}
        <div>
            <label className="text-[10px] text-fuchsia-600 uppercase tracking-wider mb-1 block">Force Transition (The Drop)</label>
            <div className="flex gap-2">
                <button 
                    onClick={() => onForcePhase(MacroPhase.BUILD)}
                    className="flex-1 py-3 bg-fuchsia-900/20 border border-fuchsia-600/50 text-fuchsia-300 text-xs font-bold hover:bg-fuchsia-600 hover:text-white transition-colors rounded"
                >
                    BUILD
                </button>
                <button 
                    onClick={() => onForcePhase(MacroPhase.PEAK)}
                    className="flex-1 py-3 bg-red-900/20 border border-red-600/50 text-red-300 text-xs font-bold hover:bg-red-600 hover:text-white transition-colors rounded animate-pulse"
                >
                    DROP!
                </button>
            </div>
        </div>
      </div>
  );

  const SynthControls = () => (
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
                className="w-full h-32 bg-gray-900 border border-yellow-900/50 rounded relative cursor-crosshair touch-none overflow-hidden"
            >
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-10">
                    {Array.from({length: 16}).map((_, i) => <div key={i} className="border border-yellow-500/20" />)}
                </div>
                <div 
                    className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.8)] transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75"
                    style={{ left: `${cutoff * 100}%`, top: `${(1 - resonance) * 100}%` }}
                />
            </div>
        </div>

        {/* Arp */}
        <div>
            <label className="text-[10px] text-green-600 uppercase tracking-wider mb-1 block">Arpeggiator</label>
            <div className="grid grid-cols-3 gap-1">
            {Object.values(ArpMode).map((m) => (
                <button
                key={m}
                onClick={() => setArpMode(m)}
                className={`
                    py-1 text-[9px] font-mono border rounded
                    ${currentArpMode === m 
                    ? 'bg-green-500/20 border-green-400 text-green-100' 
                    : 'bg-transparent border-green-900/30 text-green-700'}
                `}
                >
                {m}
                </button>
            ))}
            </div>
        </div>

        {/* Drum Kit */}
        <div>
            <label className="text-[10px] text-orange-600 uppercase tracking-wider mb-1 block">Drum Kit</label>
            <div className="grid grid-cols-2 gap-1">
             {Object.values(DrumKit).map((k) => (
                <button
                key={k}
                onClick={() => setDrumKit(k)}
                className={`
                    py-1 text-[9px] font-mono border rounded
                    ${currentDrumKit === k 
                    ? 'bg-orange-500/20 border-orange-400 text-orange-100' 
                    : 'bg-transparent border-orange-900/30 text-orange-700'}
                `}
                >
                {k}
                </button>
             ))}
            </div>
        </div>
      </div>
  );

  const MixControls = () => (
      <div className="space-y-6">
          {/* Tempo */}
          <div>
            <div className="flex justify-between mb-1">
                <label className="text-[10px] text-blue-500 uppercase tracking-wider">Tempo (BPM)</label>
                <span className="text-[10px] text-blue-300 font-mono">{Math.round(tempo)}</span>
            </div>
            <input
                type="range"
                min="120"
                max="150"
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Volume */}
          <div>
            <div className="flex justify-between mb-1">
                <label className="text-[10px] text-white uppercase tracking-wider">Master Vol</label>
                <span className="text-[10px] text-white font-mono">{Math.round(volume * 100)}%</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Reverb Toggle */}
          <div className="flex items-center justify-between p-2 border border-purple-900/30 rounded bg-purple-900/10">
              <span className="text-[10px] text-purple-400 uppercase tracking-wider">Reverb FX</span>
              <button 
                onClick={() => setReverbEnabled(!reverbEnabled)}
                className={`w-8 h-4 rounded-full relative transition-colors ${reverbEnabled ? 'bg-purple-500' : 'bg-gray-700'}`}
              >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${reverbEnabled ? 'left-4.5 translate-x-0.5' : 'left-0.5'}`} />
              </button>
          </div>
      </div>
  );

  // Mobile Toggle Button
  const MobileToggle = () => (
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed bottom-20 right-4 z-50 bg-cyan-900/80 text-cyan-100 p-3 rounded-full border border-cyan-500/50 shadow-lg backdrop-blur-sm"
      >
          {isMobileOpen ? '▼' : '▲'}
      </button>
  );

  return (
    <>
        <MobileToggle />
        <div className={`
            fixed bottom-0 left-0 w-full md:static md:w-96 md:rounded-xl z-40
            bg-black/90 md:bg-black/60 backdrop-blur-xl border-t md:border border-cyan-900/50 
            transition-transform duration-300 ease-in-out flex flex-col
            ${isMobileOpen ? 'translate-y-0' : 'translate-y-[90%] md:translate-y-0'}
        `}>
            {/* Drag Handle for Mobile */}
            <div 
                className="w-full h-6 flex items-center justify-center md:hidden cursor-pointer bg-gradient-to-b from-cyan-900/20 to-transparent"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                <div className="w-12 h-1 bg-cyan-700/50 rounded-full" />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-cyan-900/50">
                {[
                    { id: 'main', label: 'MAIN' },
                    { id: 'synth', label: 'SYNTH' },
                    { id: 'mix', label: 'MIX' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as any); setIsMobileOpen(true); }}
                        className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors
                            ${activeTab === tab.id ? 'text-cyan-400 bg-cyan-900/20 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-cyan-200'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="p-6 h-[400px] md:h-auto overflow-y-auto">
                {activeTab === 'main' && <MainControls />}
                {activeTab === 'synth' && <SynthControls />}
                {activeTab === 'mix' && <MixControls />}
            </div>
        </div>
    </>
  );
};