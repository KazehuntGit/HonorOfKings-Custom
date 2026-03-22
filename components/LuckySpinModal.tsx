import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { Player } from '../types';

interface LuckySpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  players?: Player[];
}

export const LuckySpinModal: React.FC<LuckySpinModalProps> = ({ isOpen, onClose, players = [] }) => {
  const [input, setInput] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);

  // Parse input into items
  useEffect(() => {
    const newItems = input.split('\n').map(s => s.trim()).filter(s => s);
    setItems(newItems);
  }, [input]);

  const loadActivePlayers = () => {
    if (players.length > 0) {
      setInput(players.map(p => p.name).join('\n'));
    }
  };

  // Draw wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, width, height);

    if (items.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e3a5f';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#dcb06b';
      ctx.stroke();
      ctx.fillStyle = '#8a9db8';
      ctx.font = '16px Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD ITEMS TO SPIN', centerX, centerY);
      return;
    }

    const sliceAngle = (2 * Math.PI) / items.length;

    // Colors for slices
    const colors = ['#0a1a2f', '#1e3a5f', '#2d4a6d', '#05090f'];

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    for (let i = 0; i < items.length; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, i * sliceAngle, (i + 1) * sliceAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#dcb06b';
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.rotate(i * sliceAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f0f4f8';
      ctx.font = 'bold 14px Orbitron';
      
      // Truncate text if too long
      let text = items[i];
      if (text.length > 15) text = text.substring(0, 12) + '...';
      
      ctx.fillText(text, radius - 20, 5);
      ctx.restore();
    }

    ctx.restore();

    // Draw center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
    ctx.fillStyle = '#dcb06b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#05090f';
    ctx.stroke();

    // Draw pointer (top)
    ctx.beginPath();
    ctx.moveTo(centerX - 15, 10);
    ctx.lineTo(centerX + 15, 10);
    ctx.lineTo(centerX, 35);
    ctx.closePath();
    ctx.fillStyle = '#ff4444';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

  }, [items, rotation]);

  const spin = () => {
    if (items.length === 0 || isSpinning) return;
    setIsSpinning(true);
    setWinner(null);

    const spinDuration = Math.floor(Math.random() * 4000) + 5000; // Random duration between 5s and 9s
    const startRotation = rotation;
    // Random extra spins (10 to 20 full rotations) + random stop angle
    const extraSpins = (Math.floor(Math.random() * 10) + 10) * 2 * Math.PI;
    const randomStop = Math.random() * 2 * Math.PI;
    const targetRotation = startRotation + extraSpins + randomStop;

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      
      // Easing function (easeOutQuint) - very smooth deceleration to a complete stop without snapping
      const easeProgress = 1 - Math.pow(1 - progress, 5);
      
      const currentRotation = startRotation + (targetRotation - startRotation) * easeProgress;
      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        
        // Calculate winner
        // The pointer is at the top (angle -PI/2 relative to center)
        // But our drawing starts at 0 (right) and goes clockwise.
        // Let's normalize the final rotation
        const normalizedRotation = currentRotation % (2 * Math.PI);
        
        // The pointer is at 270 degrees (or -PI/2)
        // We need to find which slice is under the pointer.
        // Slice i covers angle [i*sliceAngle + rot, (i+1)*sliceAngle + rot]
        // We want to find i such that 3*PI/2 (270 deg) is in that range.
        const pointerAngle = (3 * Math.PI) / 2;
        
        // Adjust pointer angle relative to the rotated wheel
        let relativeAngle = (pointerAngle - normalizedRotation) % (2 * Math.PI);
        if (relativeAngle < 0) relativeAngle += 2 * Math.PI;
        
        const sliceAngle = (2 * Math.PI) / items.length;
        const winningIndex = Math.floor(relativeAngle / sliceAngle);
        
        setWinner(items[winningIndex]);
      }
    };

    requestAnimationFrame(animate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isSpinning && onClose()}></div>
      <div className="relative w-full max-w-4xl bg-[#0a1a2f] border border-[#dcb06b] clip-corner-md shadow-[0_0_30px_rgba(220,176,107,0.3)] animate-slide-in flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Left Side: Input */}
        <div className="w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-[#dcb06b]/20 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[#dcb06b] font-cinzel font-bold text-lg tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              LUCKY SPIN
            </h3>
            <button onClick={onClose} disabled={isSpinning} className="text-[#8a9db8] hover:text-white transition-colors md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <p className="text-[#8a9db8] text-[10px] font-orbitron uppercase tracking-widest">
              Enter items to spin (one per line)
            </p>
            {players.length > 0 && (
              <button 
                onClick={loadActivePlayers}
                disabled={isSpinning}
                className="text-[#dcb06b] hover:text-white text-[10px] font-orbitron uppercase tracking-widest transition-colors"
              >
                Load Roster
              </button>
            )}
          </div>
          <textarea 
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isSpinning}
            placeholder="Player 1&#10;Player 2&#10;Player 3"
            className="w-full flex-grow bg-[#05090f] border border-[#1e3a5f] p-3 text-[#f0f4f8] focus:outline-none focus:border-[#dcb06b] clip-corner-sm font-orbitron resize-none text-sm min-h-[150px]"
          />
          <div className="mt-4 text-[#8a9db8] text-[10px] font-orbitron text-right">
            {items.length} items loaded
          </div>
        </div>

        {/* Right Side: Wheel */}
        <div className="w-full md:w-2/3 p-6 flex flex-col items-center justify-center relative">
          <button onClick={onClose} disabled={isSpinning} className="absolute top-4 right-4 text-[#8a9db8] hover:text-white transition-colors hidden md:block">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center mb-6">
            <canvas 
              ref={canvasRef} 
              width={400} 
              height={400} 
              className="w-full h-full drop-shadow-[0_0_15px_rgba(220,176,107,0.2)]"
            />
          </div>

          {winner && !isSpinning && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-[#0a1a2f]/95 border-2 border-[#dcb06b] p-6 clip-corner-md shadow-[0_0_50px_rgba(220,176,107,0.5)] animate-bounce-in text-center">
                <p className="text-[#8a9db8] text-xs font-orbitron uppercase tracking-widest mb-2">WINNER!</p>
                <p className="text-[#dcb06b] text-3xl font-cinzel font-black tracking-wider">{winner}</p>
              </div>
            </div>
          )}

          <Button 
            onClick={spin} 
            disabled={isSpinning || items.length < 2}
            className="w-full max-w-xs text-lg py-4 shadow-[0_0_20px_rgba(220,176,107,0.3)]"
          >
            {isSpinning ? 'SPINNING...' : 'SPIN THE WHEEL'}
          </Button>
        </div>
      </div>
    </div>
  );
};
