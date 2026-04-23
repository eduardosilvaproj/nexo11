import { useEffect, useRef } from 'react';

export const CanvasWaves = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const drawWave = (color: string, amplitude: number, frequency: number, speed: number, opacity: number) => {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 2;

        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin(x * frequency + offset * speed) * amplitude;
          ctx.lineTo(x, y);
        }
        
        ctx.stroke();
      };

      // Blue wave
      drawWave('#1a7fe8', 20, 0.01, 0.02, 0.5);
      // Green wave
      drawWave('#22c97a', 15, 0.015, -0.015, 0.4);
      // Subtle white wave
      drawWave('#ffffff', 10, 0.02, 0.01, 0.1);

      offset += 1;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-32 opacity-40" />;
};
