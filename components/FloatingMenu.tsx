import React, { useState, useEffect } from 'react';

interface FloatingMenuProps {
  onOpenLuckySpin?: () => void;
  onOpenBroadcast?: () => void;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ onOpenLuckySpin, onOpenBroadcast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [time, setTime] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      setTime(new Intl.DateTimeFormat(undefined, options).format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[2000] flex flex-col items-end gap-2">
      {isExpanded && (
        <div className="flex flex-col items-end gap-2 animate-fade-in">
          {/* Clock */}
          <div className="bg-[#0a1a2f]/90 backdrop-blur-md border border-[#dcb06b] px-4 py-2 clip-corner-sm shadow-[0_0_10px_rgba(220,176,107,0.3)] flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#dcb06b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-orbitron font-bold text-[#dcb06b] tracking-widest">{time}</span>
          </div>

          {/* Fullscreen Toggle */}
          <button 
            onClick={toggleFullscreen}
            className="bg-[#0a1a2f]/90 backdrop-blur-md border border-[#dcb06b] text-[#dcb06b] px-4 py-2 flex items-center gap-2 clip-corner-sm hover:bg-[#dcb06b] hover:text-black transition-all shadow-[0_0_10px_rgba(220,176,107,0.3)] hover:scale-105"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20H5v-4m14 4h-4v-4M9 4H5v4m14-4h-4v4" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
            <span className="font-orbitron font-bold text-sm">{isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}</span>
          </button>

          {/* Spin Wheel */}
          {onOpenLuckySpin && (
            <button 
              onClick={() => { onOpenLuckySpin(); setIsExpanded(false); }}
              className="bg-[#0a1a2f]/90 backdrop-blur-md border border-[#dcb06b] text-[#dcb06b] px-4 py-2 flex items-center gap-2 clip-corner-sm hover:bg-[#dcb06b] hover:text-black transition-all shadow-[0_0_10px_rgba(220,176,107,0.3)] hover:scale-105"
              title="Lucky Spin"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="font-orbitron font-bold text-sm">SPIN WHEEL</span>
            </button>
          )}

          {/* Broadcast */}
          {onOpenBroadcast && (
            <button 
              onClick={() => { onOpenBroadcast(); setIsExpanded(false); }}
              className="bg-[#0a1a2f]/90 backdrop-blur-md border border-[#00d2ff] text-[#00d2ff] px-4 py-2 flex items-center gap-2 clip-corner-sm hover:bg-[#00d2ff] hover:text-black transition-all shadow-[0_0_10px_rgba(0,210,255,0.3)] hover:scale-105"
              title="Broadcast"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-orbitron font-bold text-sm">BROADCAST</span>
            </button>
          )}
        </div>
      )}

      {/* Main Toggle Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-12 h-12 bg-[#0a1a2f]/90 backdrop-blur-md border border-[#dcb06b] text-[#dcb06b] flex items-center justify-center clip-corner-sm hover:bg-[#dcb06b] hover:text-black transition-all shadow-[0_0_15px_rgba(220,176,107,0.4)] hover:scale-110 ${isExpanded ? 'bg-[#dcb06b] text-black' : ''}`}
        title="Tools Menu"
      >
        {isExpanded ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        )}
      </button>
    </div>
  );
};
