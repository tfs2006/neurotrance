import React, { useRef, useEffect } from 'react';
import { LifeEngine } from '../services/LifeEngine';
import { Particle } from '../types';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  lifeEngine: LifeEngine;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying, lifeEngine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        lifeEngine.resize(canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear with fade for trails
      ctx.fillStyle = 'rgba(5, 5, 10, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // --- AUDIO SPECTRUM BACKGROUND ---
      ctx.globalAlpha = 0.3;
      const radius = Math.min(centerX, centerY) * 0.8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i += 8) {
        const amplitude = dataArray[i];
        const angle = (i / bufferLength) * Math.PI * 2;
        const barHeight = (amplitude / 255) * (radius * 0.5);
        const x1 = centerX + Math.cos(angle) * (radius * 0.4);
        const y1 = centerY + Math.sin(angle) * (radius * 0.4);
        const x2 = centerX + Math.cos(angle) * (radius * 0.4 + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius * 0.4 + barHeight);
        
        const hue = (i / bufferLength) * 360 + (Date.now() / 50);
        ctx.strokeStyle = `hsl(${hue}, 80%, 50%)`;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // --- PARTICLE CIVILIZATION LAYER ---
      const particles = lifeEngine.getParticles();
      
      // Draw Connections (Mycelium)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      particles.forEach(p => {
          // Draw simple lines to close neighbors (optimization: LifeEngine already calc'd distances but didn't store ref to obj, just ID.
          // To save perf, we draw lines if we iterate.
          // Actually, let's trust the visual density to imply connection or redraw simple distance check here for visuals only
      });
      
      // Draw Particles
      particles.forEach(p => {
          ctx.beginPath();
          const pRadius = 2 + (p.energy / 20);
          ctx.arc(p.x, p.y, pRadius, 0, Math.PI * 2);
          
          // Color by Type
          if (p.type === 'BUILDER') ctx.fillStyle = '#FACC15'; // Yellow
          else if (p.type === 'THINKER') ctx.fillStyle = '#22D3EE'; // Cyan
          else ctx.fillStyle = '#E879F9'; // Fuchsia (Feeler)
          
          ctx.fill();

          // Connection Lines to nearby
          // Visual only check (optimization: only check a few)
          particles.forEach(other => {
              if (p === other) return;
              const dx = p.x - other.x;
              const dy = p.y - other.y;
              if (Math.abs(dx) < 50 && Math.abs(dy) < 50) {
                  ctx.beginPath();
                  ctx.moveTo(p.x, p.y);
                  ctx.lineTo(other.x, other.y);
                  ctx.strokeStyle = `rgba(255,255,255, ${p.energy/200})`;
                  ctx.stroke();
              }
          });
      });

    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [analyser, isPlaying, lifeEngine]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full z-0"
    />
  );
};

export default Visualizer;