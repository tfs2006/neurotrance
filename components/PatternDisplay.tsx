import React from 'react';
import { Pattern, Scale } from '../types';
import { midiToNoteName } from '../constants';

interface PatternDisplayProps {
  pattern: Pattern | null;
  currentStep: number;
  scale: Scale;
  rootNote: number;
  onStepClick?: (index: number) => void;
}

const PatternDisplay: React.FC<PatternDisplayProps> = ({ pattern, currentStep, scale, rootNote, onStepClick }) => {
  if (!pattern) return <div className="w-full h-32 bg-black/20 border border-cyan-900/30 flex items-center justify-center text-cyan-900">NO DNA</div>;

  return (
    <div className="w-full h-48 bg-black/40 border border-cyan-900/50 rounded-lg p-2 relative overflow-hidden backdrop-blur-sm select-none">
      <div className="absolute top-2 right-2 text-[10px] font-mono text-cyan-500 uppercase tracking-wider">
        GENETIC SEQUENCE: {pattern.id}
      </div>
      
      {/* Interactive Grid Layer */}
      <div className="absolute inset-0 z-20 grid grid-cols-16">
        {Array.from({ length: 16 }).map((_, i) => (
            <div 
                key={i} 
                onClick={() => onStepClick && onStepClick(i)}
                className="h-full w-full border-r border-cyan-500/10 hover:bg-cyan-500/10 cursor-pointer transition-colors"
            />
        ))}
      </div>

      {/* Background Grid Visuals */}
      <div className="absolute inset-0 z-0 grid grid-cols-16 gap-px opacity-10 pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => (
          <div 
            key={i} 
            className={`h-full border-r border-cyan-500 ${i % 4 === 0 ? 'border-opacity-50' : 'border-opacity-10'}`} 
          />
        ))}
      </div>

      {/* Playhead */}
      <div 
        className="absolute top-0 bottom-0 bg-cyan-400/20 border-l border-cyan-400 w-[6.25%] transition-all duration-75 pointer-events-none z-10"
        style={{ left: `${(currentStep / 16) * 100}%` }}
      />

      {/* Notes */}
      <div className="absolute inset-2 flex pointer-events-none">
         {pattern.steps.map((noteOffset, stepIndex) => {
            if (noteOffset === null) return null;
            const heightPct = Math.min(100, Math.max(0, (noteOffset / 24) * 100));
            const bottomPct = 10 + (heightPct * 0.8); 
            
            const velocity = pattern.velocity[stepIndex];
            const offset = pattern.offsets ? pattern.offsets[stepIndex] : 0; 
            const widthPct = 6.25;
            const leftPos = (stepIndex * widthPct) + (offset * widthPct); 

            return (
                <div
                    key={stepIndex}
                    className="absolute w-[5%] bg-cyan-400 rounded-sm shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-300 z-10"
                    style={{
                        bottom: `${bottomPct}%`,
                        left: `${leftPos}%`,
                        height: `${10 + (velocity * 30)}%`,
                        opacity: 0.3 + (velocity * 0.7),
                        borderTop: '2px solid rgba(255,255,255,0.8)'
                    }}
                >
                   <span className="hidden md:block absolute -top-4 left-0 text-[8px] font-mono text-cyan-200 whitespace-nowrap">
                     {midiToNoteName(rootNote + noteOffset)}
                   </span>
                </div>
            );
         })}
      </div>

      <div className="absolute bottom-1 left-2 text-[9px] text-cyan-800 font-mono">CLICK COLUMN TO EDIT GENE</div>
    </div>
  );
};

export default PatternDisplay;