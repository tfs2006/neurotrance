import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
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
      ctx.fillStyle = 'rgba(5, 5, 10, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.8;
      
      // Draw Circular Spectrum
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < bufferLength; i += 4) { // Skip some bins for performance
        const amplitude = dataArray[i];
        const angle = (i / bufferLength) * Math.PI * 2;
        
        // Calculate bar height based on amplitude
        const barHeight = (amplitude / 255) * (radius * 0.8);
        
        // Inner point
        const x1 = centerX + Math.cos(angle) * (radius * 0.2);
        const y1 = centerY + Math.sin(angle) * (radius * 0.2);
        
        // Outer point
        const x2 = centerX + Math.cos(angle) * (radius * 0.2 + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius * 0.2 + barHeight);
        
        // Color based on freq
        const hue = (i / bufferLength) * 360 + (Date.now() / 50); // Cycle color
        ctx.strokeStyle = `hsl(${hue}, 80%, 50%)`;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Mirror for symmetry
        const angle2 = angle + Math.PI;
        const x3 = centerX + Math.cos(angle2) * (radius * 0.2);
        const y3 = centerY + Math.sin(angle2) * (radius * 0.2);
        const x4 = centerX + Math.cos(angle2) * (radius * 0.2 + barHeight);
        const y4 = centerY + Math.sin(angle2) * (radius * 0.2 + barHeight);

        ctx.beginPath();
        ctx.moveTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.stroke();
      }

      // Central "Bass" Pulse
      const bassAvg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      ctx.beginPath();
      ctx.arc(centerX, centerY, (bassAvg / 255) * 50, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 255, ${bassAvg / 500})`;
      ctx.fill();
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [analyser, isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full z-0"
    />
  );
};

export default Visualizer;