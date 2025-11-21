import React, { useEffect, useRef, useState } from 'react';
import { AudioEngine } from './services/AudioEngine';
import Visualizer from './components/Visualizer';
import { ControlPanel } from './components/ControlPanel';
import CodeLog from './components/CodeLog';
import LegalModal from './components/LegalModal';
import { Mood, ArpMode, LogEntry } from './types';

const App: React.FC = () => {
  const engineRef = useRef<AudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [generationMeta, setGenerationMeta] = useState<string>("SYSTEM READY // WAITING FOR INPUT");
  const [phaseMeta, setPhaseMeta] = useState<string>("DRIFT");
  const [genCount, setGenCount] = useState<string>("0");
  
  // Audio State
  const [mood, setMood] = useState<Mood>(Mood.ETHEREAL);
  const [arpMode, setArpMode] = useState<ArpMode>(ArpMode.OFF);
  const [cutoff, setCutoff] = useState(0.3);
  const [resonance, setResonance] = useState(0.1);

  // UI State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [legalType, setLegalType] = useState<'privacy' | 'terms' | null>(null);

  // Initialize Engine (Lazy)
  useEffect(() => {
    engineRef.current = new AudioEngine();
    engineRef.current.setCallback((step, meta) => {
        // Parse meta string "PEAK | GEN:5 | P:xy7z"
        const parts = meta.split('|');
        if (parts.length >= 3) {
            setPhaseMeta(parts[0].trim());
            setGenCount(parts[1].replace('GEN:', '').trim());
            setGenerationMeta(parts[2].trim());
        } else {
            setGenerationMeta(meta);
        }
    });
    engineRef.current.setLogCallback((entry) => {
      setLogs(prev => [...prev.slice(-20), entry]);
    });
    return () => {
      if (engineRef.current) engineRef.current.stop();
    };
  }, []);

  // Sync State to Engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateParams(cutoff, resonance);
    }
  }, [cutoff, resonance]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setMood(mood);
    }
  }, [mood]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setArpMode(arpMode);
    }
  }, [arpMode]);

  const togglePlay = async () => {
    if (!engineRef.current) return;

    if (!isPlaying) {
      try {
        await engineRef.current.initialize();
        engineRef.current.start();
        setAnalyser(engineRef.current.getAnalyser());
        setIsPlaying(true);
      } catch (e) {
        console.error("Audio Init Failed", e);
        setGenerationMeta("ERROR: AUDIO CONTEXT BLOCKED");
      }
    } else {
      engineRef.current.stop();
      setIsPlaying(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Background Visualizer */}
      <Visualizer analyser={analyser} isPlaying={isPlaying} />

      {/* Code Overlay (Left side background) */}
      <div className="absolute top-0 left-0 w-full md:w-1/3 h-full pointer-events-none z-5 p-4 opacity-40">
        <CodeLog logs={logs} />
      </div>

      {/* Main UI Container */}
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-5xl px-4 mb-16">
        
        {/* Header / Title */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-fuchsia-400 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            NEURO<span className="text-cyan-400">TRANCE</span>
          </h1>
          <div className="flex justify-center gap-4 text-xs md:text-sm tracking-widest font-mono">
            <span className="text-cyan-600">EVOLVING GENETIC ALGORITHM</span>
            <span className="text-fuchsia-600">V.2.0.1</span>
          </div>
        </div>

        {/* Start Button (Center Stage) */}
        {!isPlaying && (
          <button 
            onClick={togglePlay}
            className="group relative px-12 py-6 bg-transparent overflow-hidden rounded-full border border-cyan-500/50 hover:border-cyan-400 transition-all duration-500"
          >
            <div className="absolute inset-0 w-full h-full bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors duration-500"></div>
            <div className="absolute inset-0 w-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent group-hover:w-full transition-all duration-700 ease-out"></div>
            <span className="relative text-cyan-100 font-mono text-xl tracking-widest group-hover:text-white">
              INITIATE_SEQUENCE
            </span>
          </button>
        )}

        {/* Active Controls */}
        {isPlaying && (
          <div className="flex flex-col md:flex-row gap-8 items-start w-full justify-center animate-fade-in-up">
            
            {/* Data Stream Panel (Left Stats) */}
            <div className="hidden lg:block w-64 h-64 border-r-2 border-fuchsia-900/30 pr-4 pt-2 font-mono text-xs text-right select-none bg-black/20 backdrop-blur-sm">
               <div className="mb-2 text-fuchsia-500">:: EVOLUTIONARY STATUS ::</div>
               <div className="leading-relaxed text-fuchsia-100/80">
                 <div className="mb-4">
                   <span className="text-fuchsia-700 mr-2">PHASE</span>
                   <span className="text-xl font-bold">{phaseMeta}</span>
                 </div>
                 <div className="mb-4">
                    <span className="text-fuchsia-700 mr-2">GENERATION</span>
                    <span className="text-xl font-bold">{genCount}</span>
                 </div>
                 <div className="mb-4">
                    <span className="text-fuchsia-700 mr-2">PATTERN ID</span>
                    <span className="text-lg">{generationMeta.replace('P:', '')}</span>
                 </div>
               </div>
            </div>

            <ControlPanel 
              currentMood={mood}
              setMood={setMood}
              currentArpMode={arpMode}
              setArpMode={setArpMode}
              cutoff={cutoff}
              setCutoff={setCutoff}
              resonance={resonance}
              setResonance={setResonance}
            />
            
            {/* Right filler for balance */}
            <div className="hidden lg:block w-64 h-64 border-l-2 border-cyan-900/30 pl-4 pt-2 font-mono text-xs text-cyan-800/80 select-none bg-black/20 backdrop-blur-sm">
               <div className="mb-2 text-cyan-500">:: RUNTIME_STATS ::</div>
               <div className="leading-relaxed">
                 <div>STATUS: ONLINE</div>
                 <div>BPM: 138</div>
                 <div>SAMPLE_RATE: 44.1kHz</div>
                 <br/>
                 {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="opacity-50 overflow-hidden truncate">
                      {Math.random().toString(16).substring(2, 14).toUpperCase()}
                    </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* Stop Button (Small, bottom) */}
        {isPlaying && (
          <button 
            onClick={togglePlay}
            className="mt-8 text-xs font-mono text-red-900 hover:text-red-500 border border-red-900/30 px-4 py-1 rounded hover:border-red-500 transition-colors"
          >
            TERMINATE
          </button>
        )}
      </div>

      {/* Footer & Legal */}
      <div className="absolute bottom-0 left-0 right-0 w-full z-20 flex flex-col items-center gap-2 pb-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-8 pointer-events-auto">
        
        {/* Status Line */}
        <div className="text-[10px] text-cyan-900/60 font-mono tracking-widest pointer-events-none mb-1">
           NEUROTRANCE_ENGINE // GEN_{genCount} // {phaseMeta}
        </div>

        {/* Links */}
        <div className="flex gap-4 md:gap-6 text-[10px] text-cyan-700 font-mono uppercase tracking-wider items-center">
          <span className="opacity-70">&copy; {new Date().getFullYear()} NeuroTrance</span>
          <span className="text-cyan-900">|</span>
          <button onClick={() => setLegalType('privacy')} className="hover:text-cyan-400 transition-colors">Privacy</button>
          <button onClick={() => setLegalType('terms')} className="hover:text-cyan-400 transition-colors">Terms</button>
          <span className="text-cyan-900">|</span>
          <a href="mailto:neurotrance@4ourmedia.com" className="hover:text-cyan-400 transition-colors">Contact</a>
        </div>
      </div>

      {/* Legal Modal Overlay */}
      <LegalModal 
        isOpen={!!legalType} 
        type={legalType} 
        onClose={() => setLegalType(null)} 
      />
    </div>
  );
};

export default App;