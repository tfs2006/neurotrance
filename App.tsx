import React, { useEffect, useRef, useState } from 'react';
import { AudioEngine } from './services/AudioEngine';
import Visualizer from './components/Visualizer';
import { ControlPanel } from './components/ControlPanel';
import CodeLog from './components/CodeLog';
import LegalModal from './components/LegalModal';
import PatternDisplay from './components/PatternDisplay';
import { Mood, ArpMode, LogEntry, DrumKit, MacroPhase, Pattern, SynthesisType, EvolutionLocks, SynthPatch } from './types';
import { BASE_TEMPO, SCALES } from './constants';

const App: React.FC = () => {
  const engineRef = useRef<AudioEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [generationMeta, setGenerationMeta] = useState<string>("SYSTEM READY // WAITING FOR INPUT");
  const [phaseMeta, setPhaseMeta] = useState<string>("DRIFT");
  const [genCount, setGenCount] = useState<string>("0");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [activePattern, setActivePattern] = useState<Pattern | null>(null);
  
  // Audio State
  const [mood, setMood] = useState<Mood>(Mood.ETHEREAL);
  const [arpMode, setArpMode] = useState<ArpMode>(ArpMode.OFF);
  const [drumKit, setDrumKit] = useState<DrumKit>(DrumKit.TRANCE);
  const [cutoff, setCutoff] = useState(0.3);
  const [resonance, setResonance] = useState(0.1);
  const [tempo, setTempo] = useState(BASE_TEMPO);
  const [volume, setVolume] = useState(0.6);
  const [reverbEnabled, setReverbEnabled] = useState(true);
  const [currentPatch, setCurrentPatch] = useState<SynthPatch | any>({});

  // Evolution State
  const [isAutoEvolve, setIsAutoEvolve] = useState(true);
  const [locks, setLocks] = useState<EvolutionLocks>({
      melody: false,
      timbre: false,
      harmony: false,
      rhythm: false
  });

  // UI State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [legalType, setLegalType] = useState<'privacy' | 'terms' | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Parse URL params
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const urlMood = params.get('mood');
      const urlBpm = params.get('bpm');
      if (urlMood && Object.values(Mood).includes(urlMood as Mood)) setMood(urlMood as Mood);
      if (urlBpm) { const bpm = parseFloat(urlBpm); if (!isNaN(bpm)) setTempo(bpm); }
  }, []);

  // Initialize Engine
  useEffect(() => {
    engineRef.current = new AudioEngine();
    engineRef.current.setCallback((step, meta) => {
        setCurrentStep(step);
        const parts = meta.split('|');
        if (parts.length >= 3) {
            setPhaseMeta(parts[0].trim());
            setGenCount(parts[1].replace('GEN:', '').trim());
            setGenerationMeta(parts[2].trim());
        } else { setGenerationMeta(meta); }
    });
    engineRef.current.setLogCallback((entry) => setLogs(prev => [...prev.slice(-20), entry]));
    engineRef.current.setPatternCallback((pattern) => setActivePattern({...pattern})); // Spread to force re-render
    engineRef.current.setPatchCallback((patch) => setCurrentPatch({...patch})); // Sync UI with Engine

    return () => { if (engineRef.current) engineRef.current.stop(); };
  }, []);

  // Sync State to Engine
  useEffect(() => { if (engineRef.current) engineRef.current.updateParams(cutoff, resonance); }, [cutoff, resonance]);
  useEffect(() => { if (engineRef.current) engineRef.current.setMood(mood); }, [mood]);
  useEffect(() => { if (engineRef.current) engineRef.current.setArpMode(arpMode); }, [arpMode]);
  useEffect(() => { if (engineRef.current) engineRef.current.setDrumKit(drumKit); }, [drumKit]);
  useEffect(() => { if (engineRef.current) engineRef.current.setTempo(tempo); }, [tempo]);
  useEffect(() => { if (engineRef.current) engineRef.current.setVolume(volume); }, [volume]);
  useEffect(() => { if (engineRef.current) engineRef.current.setReverb(reverbEnabled); }, [reverbEnabled]);
  
  // Sync Evolution State
  useEffect(() => {
      if (engineRef.current) engineRef.current.setEvolutionState(isAutoEvolve, locks);
  }, [isAutoEvolve, locks]);

  const handleSetSynthesisType = (type: SynthesisType) => {
      if (engineRef.current) engineRef.current.setSynthesisType(type);
  };

  const handleSetFMRatio = (ratio: number) => {
      if (engineRef.current) engineRef.current.setFMRatio(ratio);
  };

  const handleManualMutate = (target: 'melody' | 'timbre' | 'rhythm') => {
      if (engineRef.current) engineRef.current.manualMutate(target);
  };

  const handlePatchParamChange = (key: keyof SynthPatch, value: any) => {
      if (engineRef.current) engineRef.current.setPatchParam(key, value);
  };

  const handleStepClick = (index: number) => {
      if (engineRef.current) {
          engineRef.current.togglePatternStep(index);
          // Force update UI locks if auto mode was on
          if (isAutoEvolve) setLocks(prev => ({ ...prev, melody: true }));
      }
  };

  const togglePlay = async () => {
    if (!engineRef.current) return;
    if (!isPlaying) {
      try {
        await engineRef.current.initialize();
        engineRef.current.start();
        setAnalyser(engineRef.current.getAnalyser());
        setIsPlaying(true);
        // Grab initial patch state
        setCurrentPatch(engineRef.current.getCurrentPatch());
      } catch (e) { console.error("Audio Init Failed", e); setGenerationMeta("ERROR: AUDIO CONTEXT BLOCKED - TRY AGAIN"); }
    } else {
      engineRef.current.stop();
      setIsPlaying(false);
    }
  };

  const toggleRecording = async () => {
      if (!engineRef.current) return;
      if (!isRecording) { engineRef.current.startRecording(); setIsRecording(true); } 
      else {
          const blob = await engineRef.current.stopRecording();
          setIsRecording(false);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none'; a.href = url; a.download = `neurotrance_session_${Date.now()}.wav`;
          document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
      }
  };

  const handleShare = () => {
      const baseUrl = window.location.href.split('?')[0];
      const params = new URLSearchParams();
      params.set('mood', mood); params.set('bpm', tempo.toString());
      const url = `${baseUrl}?${params.toString()}`;
      navigator.clipboard.writeText(url);
      const prevMeta = generationMeta;
      setGenerationMeta("SESSION URL COPIED TO CLIPBOARD");
      setTimeout(() => setGenerationMeta(prevMeta), 2000);
  };

  const handleForcePhase = (phase: MacroPhase) => { if(engineRef.current) engineRef.current.forcePhase(phase); };

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center overflow-hidden font-sans">
      <Visualizer analyser={analyser} isPlaying={isPlaying} />

      {!isZenMode && (
        <div className="absolute top-0 left-0 w-full md:w-1/3 h-full pointer-events-none z-5 p-4 opacity-40 hidden md:block">
            <CodeLog logs={logs} />
        </div>
      )}

      {isPlaying && (
          <button 
            onClick={() => setIsZenMode(!isZenMode)}
            className="absolute top-4 right-4 z-50 text-gray-500 hover:text-white font-mono text-xs uppercase tracking-widest border border-transparent hover:border-white/20 p-2 rounded"
          >
              {isZenMode ? '[EXIT_ZEN]' : '[ZEN_MODE]'}
          </button>
      )}

      {!isZenMode && (
        <div className="relative z-10 flex flex-col items-center gap-4 md:gap-8 w-full max-w-6xl px-4 h-full md:h-auto justify-center">
            
            <div className="text-center space-y-2 mt-10 md:mt-0">
            <h1 className="text-4xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-fuchsia-400 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] select-none">
                NEURO<span className="text-cyan-400">SYNTH</span>
            </h1>
            <div className="flex justify-center gap-4 text-[10px] md:text-sm tracking-widest font-mono">
                <span className={isAutoEvolve ? "text-cyan-400 animate-pulse" : "text-gray-600"}>
                    {isAutoEvolve ? "AI_ARCHITECT_ONLINE" : "MANUAL_OVERRIDE_ACTIVE"}
                </span>
            </div>
            </div>

            {!isPlaying && (
            <button 
                onClick={togglePlay}
                className="group relative px-12 py-6 bg-transparent overflow-hidden rounded-full border border-cyan-500/50 hover:border-cyan-400 transition-all duration-500 mt-8"
            >
                <div className="absolute inset-0 w-full h-full bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors duration-500"></div>
                <span className="relative text-cyan-100 font-mono text-xl tracking-widest group-hover:text-white">
                INITIATE_SYSTEM
                </span>
            </button>
            )}

            {isPlaying && (
            <div className="flex flex-col md:flex-row gap-8 items-start w-full justify-center animate-fade-in-up flex-1 md:flex-auto">
                
                <div className="hidden lg:block w-64 h-64 border-r-2 border-fuchsia-900/30 pr-4 pt-2 font-mono text-xs text-right select-none bg-black/20 backdrop-blur-sm rounded-l-xl">
                <div className="mb-2 text-fuchsia-500 border-b border-fuchsia-900/30 pb-1">:: SYSTEM_STATUS ::</div>
                <div className="leading-relaxed text-fuchsia-100/80 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-fuchsia-700">PHASE</span>
                        <span className="text-xl font-bold animate-pulse">{phaseMeta}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-fuchsia-700">GEN</span>
                        <span className="text-xl font-bold">{genCount}</span>
                    </div>
                    <div className="mt-4 border-t border-fuchsia-900/30 pt-2 pointer-events-auto">
                        <div className="text-[10px] text-fuchsia-500 mb-1">ACTIVE DNA (CLICK TO EDIT)</div>
                        <PatternDisplay 
                            pattern={activePattern} 
                            currentStep={currentStep}
                            scale={engineRef.current?.getCurrentScale() || SCALES.MINOR}
                            rootNote={engineRef.current?.getRootNote() || 41}
                            onStepClick={handleStepClick}
                        />
                    </div>
                </div>
                </div>

                <ControlPanel 
                    currentMood={mood} setMood={setMood}
                    currentArpMode={arpMode} setArpMode={setArpMode}
                    currentDrumKit={drumKit} setDrumKit={setDrumKit}
                    cutoff={cutoff} setCutoff={setCutoff}
                    resonance={resonance} setResonance={setResonance}
                    tempo={tempo} setTempo={setTempo}
                    volume={volume} setVolume={setVolume}
                    reverbEnabled={reverbEnabled} setReverbEnabled={setReverbEnabled}
                    onForcePhase={handleForcePhase}
                    onSetSynthesisType={handleSetSynthesisType}
                    onSetFMRatio={handleSetFMRatio}
                    currentPatch={currentPatch}
                    isAutoEvolve={isAutoEvolve}
                    setIsAutoEvolve={setIsAutoEvolve}
                    locks={locks}
                    setLocks={setLocks}
                    onManualMutate={handleManualMutate}
                    onParamChange={handlePatchParamChange}
                />
                
                <div className="hidden lg:flex w-64 h-64 border-l-2 border-cyan-900/30 pl-4 pt-2 flex-col justify-between font-mono text-xs text-cyan-800/80 select-none bg-black/20 backdrop-blur-sm rounded-r-xl">
                    <div>
                        <div className="mb-2 text-cyan-500 border-b border-cyan-900/30 pb-1">:: DATA_IO ::</div>
                        <div className="space-y-2 pointer-events-auto">
                            <button 
                                onClick={toggleRecording}
                                className={`w-full border py-2 px-3 rounded flex items-center justify-between transition-all ${isRecording ? 'border-red-500 bg-red-900/20 text-red-100 animate-pulse' : 'border-cyan-900/50 hover:border-cyan-400 text-cyan-500 hover:text-cyan-100'}`}
                            >
                                <span>{isRecording ? 'RECORDING...' : 'EXPORT WAV'}</span>
                                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-600'}`} />
                            </button>

                            <button onClick={handleShare} className="w-full border border-cyan-900/50 hover:border-cyan-400 text-cyan-500 hover:text-cyan-100 py-2 px-3 rounded transition-colors text-left">
                                SHARE LINK
                            </button>
                        </div>
                    </div>
                    
                    <button onClick={togglePlay} className="w-full text-red-900 hover:text-red-500 border border-red-900/30 py-2 rounded hover:border-red-500 transition-colors pointer-events-auto">
                        SHUTDOWN
                    </button>
                </div>
            </div>
            )}
            
            {isPlaying && (
                <div className="lg:hidden w-full mt-4 pointer-events-auto">
                    <PatternDisplay 
                        pattern={activePattern} 
                        currentStep={currentStep}
                        scale={engineRef.current?.getCurrentScale() || SCALES.MINOR}
                        rootNote={engineRef.current?.getRootNote() || 41}
                        onStepClick={handleStepClick}
                    />
                </div>
            )}
        </div>
      )}

      {!isZenMode && (
        <div className="absolute bottom-0 left-0 right-0 w-full z-20 flex flex-col items-center gap-2 pb-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pointer-events-auto">
            {isPlaying && (
                <div className="md:hidden flex gap-4 mb-4">
                    <button onClick={toggleRecording} className={`w-12 h-12 rounded-full border flex items-center justify-center ${isRecording ? 'border-red-500 bg-red-900/20' : 'border-gray-700 bg-gray-900'}`}>
                        <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-red-500' : 'bg-gray-500'}`} />
                    </button>
                    <button onClick={togglePlay} className="w-12 h-12 rounded-full border border-red-900/50 bg-red-900/10 flex items-center justify-center text-red-500 text-xs font-bold">
                        OFF
                    </button>
                </div>
            )}
            <div className="flex gap-4 md:gap-6 text-[10px] text-cyan-700 font-mono uppercase tracking-wider items-center">
            <span className="opacity-70">&copy; {new Date().getFullYear()} NeuroSynth</span>
            <span className="text-cyan-900">|</span>
            <button onClick={() => setLegalType('privacy')} className="hover:text-cyan-400 transition-colors">Privacy</button>
            <button onClick={() => setLegalType('terms')} className="hover:text-cyan-400 transition-colors">Terms</button>
            <span className="text-cyan-900">|</span>
            <a href="mailto:neurotrance@4ourmedia.com" className="hover:text-cyan-400 transition-colors">Contact</a>
            </div>
        </div>
      )}
      <LegalModal isOpen={!!legalType} type={legalType} onClose={() => setLegalType(null)} />
    </div>
  );
};

export default App;