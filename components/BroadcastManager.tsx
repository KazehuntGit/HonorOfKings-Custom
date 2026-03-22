import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

export const BroadcastManager: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'youtube' | 'mirror' | 'cropping' | 'active'>('menu');
  const [activeSource, setActiveSource] = useState<'screen' | 'youtube' | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0, w: 1, h: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  // Floating window state
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 400 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const startScreenShare = async () => {
    try {
      // Request high resolution and frame rate
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 },
          frameRate: { ideal: 60, max: 60 }
        }, 
        audio: false 
      });
      setStream(mediaStream);
      setMode('cropping');
      setCrop({ x: 0, y: 0, w: 1, h: 1 }); // Reset crop
      setIsMinimized(false);
      setIsFullscreen(false);

      // Handle stream stop from browser UI
      mediaStream.getVideoTracks()[0].onended = () => {
        stopBroadcast();
      };
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  const startYoutubeMirror = () => {
    let videoId = '';
    const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([^"&?\/\s]{11})/);
    if (match) {
      videoId = match[1];
    }

    if (videoId) {
      setYoutubeVideoId(videoId);
      setActiveSource('youtube');
      setMode('active');
      setIsOpen(false);
      setIsMinimized(false);
      setIsFullscreen(false);
    } else {
      alert("Invalid YouTube URL. Please provide a valid YouTube video or livestream link.");
    }
  };

  const stopBroadcast = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setYoutubeUrl('');
    setYoutubeVideoId('');
    setActiveSource(null);
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
    setMode('menu');
    setIsOpen(false);
    setIsMinimized(false);
    setIsFullscreen(false);
    setPosition({ x: 20, y: 20 });
    setWindowSize({ width: 400 });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (isFullscreen) setIsFullscreen(false);
  };

  useEffect(() => {
    if (videoRef.current && stream && (mode === 'cropping' || (mode === 'active' && activeSource === 'screen'))) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Play error:", e));
    }
  }, [stream, mode, activeSource]);

  useEffect(() => {
    if (mode !== 'active' || activeSource !== 'screen' || !stream || isMinimized) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let animationFrameId: number;

    const draw = () => {
      if (video.paused || video.ended) return;
      const ctx = canvas.getContext('2d', { alpha: false }); // Optimize canvas context
      if (!ctx) return;

      const sx = crop.x * video.videoWidth;
      const sy = crop.y * video.videoHeight;
      const sWidth = crop.w * video.videoWidth;
      const sHeight = crop.h * video.videoHeight;

      if (sWidth === 0 || sHeight === 0) return;

      // Use device pixel ratio for sharper rendering
      const dpr = window.devicePixelRatio || 1;
      
      // Calculate display size based on fullscreen or window size
      let displayWidth, displayHeight;
      
      if (isFullscreen) {
        // Calculate aspect ratio preserving dimensions for fullscreen
        const screenRatio = window.innerWidth / window.innerHeight;
        const cropRatio = sWidth / sHeight;
        
        if (screenRatio > cropRatio) {
          displayHeight = window.innerHeight;
          displayWidth = displayHeight * cropRatio;
        } else {
          displayWidth = window.innerWidth;
          displayHeight = displayWidth / cropRatio;
        }
      } else {
        displayWidth = windowSize.width;
        displayHeight = displayWidth * (sHeight / sWidth);
      }

      // Set internal canvas resolution higher for sharpness
      if (canvas.width !== displayWidth * dpr) canvas.width = displayWidth * dpr;
      if (canvas.height !== displayHeight * dpr) canvas.height = displayHeight * dpr;
      
      // Set CSS display size
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw with DPR scaling
      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, displayWidth * dpr, displayHeight * dpr);
      animationFrameId = requestAnimationFrame(draw);
    };

    video.play().then(() => {
      draw();
    }).catch(err => console.error("Video play error:", err));

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [mode, stream, crop, windowSize, isMinimized, isFullscreen, activeSource]);

  // Auto-adjust window size based on browser viewport
  useEffect(() => {
    const handleResize = () => {
      if (isFullscreen || mode !== 'active') return;
      
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
      
      const maxWidth = viewportWidth * 0.95; 
      const maxHeight = viewportHeight * 0.85; 
      
      setWindowSize(prev => {
        let newWidth = prev.width;
        
        // If current width is larger than viewport allows, scale down
        if (newWidth > maxWidth) {
          newWidth = maxWidth;
        }
        
        // Also check height constraints (assuming roughly 16:9 aspect ratio)
        const estimatedHeight = newWidth * (9/16) + 40; // +40 for header
        if (estimatedHeight > maxHeight) {
          newWidth = (maxHeight - 40) * (16/9);
        }
        
        // Ensure minimum width
        newWidth = Math.max(200, newWidth);
        
        if (newWidth !== prev.width) {
          return { width: newWidth };
        }
        return prev;
      });

      // Adjust position to keep it on screen
      setPosition(prev => {
        let newX = prev.x;
        let newY = prev.y;
        
        const currentWidth = windowSize.width > maxWidth ? maxWidth : windowSize.width;
        const maxPosX = Math.max(0, viewportWidth - currentWidth);
        const maxPosY = Math.max(0, viewportHeight - (currentWidth * (9/16) + 40));
        
        if (newX > maxPosX) newX = maxPosX;
        if (newY > maxPosY) newY = maxPosY;
        
        if (newX !== prev.x || newY !== prev.y) {
          return { x: newX, y: newY };
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleResize);
    // Initial check
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen, mode, windowSize.width]);

  // Window Dragging Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingWindow && !isFullscreen) {
        const zoomLevel = parseFloat((document.body.style as any).zoom) || 1;
        setPosition({
          x: (e.clientX - dragOffset.x) / zoomLevel,
          y: (e.clientY - dragOffset.y) / zoomLevel
        });
      }
    };
    const handleMouseUp = () => setIsDraggingWindow(false);

    if (isDraggingWindow) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWindow, dragOffset, isFullscreen]);

  const handleWindowDragStart = (e: React.MouseEvent) => {
    if (isFullscreen) return;
    setIsDraggingWindow(true);
    const zoomLevel = parseFloat((document.body.style as any).zoom) || 1;
    setDragOffset({
      x: e.clientX - position.x * zoomLevel,
      y: e.clientY - position.y * zoomLevel
    });
  };

  // Cropping Drag Logic
  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const zoomLevel = parseFloat((document.body.style as any).zoom) || 1;
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsDragging(true);
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const zoomLevel = parseFloat((document.body.style as any).zoom) || 1;
    const x = Math.max(0, Math.min((e.clientX - rect.left) / zoomLevel, rect.width / zoomLevel));
    const y = Math.max(0, Math.min((e.clientY - rect.top) / zoomLevel, rect.height / zoomLevel));
    setCurrentPos({ x, y });
  };

  const handleCropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const zoomLevel = parseFloat((document.body.style as any).zoom) || 1;
    const rectWidth = rect.width / zoomLevel;
    const rectHeight = rect.height / zoomLevel;
    
    const x = Math.min(startPos.x, currentPos.x) / rectWidth;
    const y = Math.min(startPos.y, currentPos.y) / rectHeight;
    const w = Math.abs(currentPos.x - startPos.x) / rectWidth;
    const h = Math.abs(currentPos.y - startPos.y) / rectHeight;

    if (w > 0.05 && h > 0.05) {
      setCrop({ x, y, w, h });
    } else {
      setCrop({ x: 0, y: 0, w: 1, h: 1 });
    }
  };

  return (
    <>
      {/* Floating Button */}
      {mode !== 'active' && (
        <div className="fixed bottom-6 left-6 z-[200]">
          <button 
            onClick={() => setIsOpen(true)}
            className="bg-[#0a1a2f]/90 border border-[#00d2ff] text-[#00d2ff] px-4 py-2 clip-corner-sm font-orbitron font-bold shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:bg-[#00d2ff] hover:text-black transition-all flex items-center gap-2 backdrop-blur-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            BROADCAST
          </button>
        </div>
      )}

      {/* Main Modal */}
      {isOpen && mode !== 'active' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a1a2f] border border-[#dcb06b] p-6 clip-corner-md w-full max-w-2xl relative shadow-[0_0_30px_rgba(220,176,107,0.2)]">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-[#4a5f78] hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h2 className="text-2xl font-cinzel font-black text-[#dcb06b] mb-6 tracking-widest">BROADCAST OPTIONS</h2>

            {mode === 'menu' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  onClick={() => setMode('youtube')}
                  className="border border-[#ef4444]/50 bg-[#1a0505]/50 p-6 clip-corner-sm cursor-pointer hover:bg-[#ef4444]/20 hover:border-[#ef4444] transition-all group"
                >
                  <div className="text-[#ef4444] mb-4 group-hover:scale-110 transition-transform origin-left">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <h3 className="text-white font-orbitron font-bold text-lg mb-2">Embed YouTube Stream</h3>
                  <p className="text-[#8a9db8] text-sm font-inter">Paste a YouTube Livestream or Video link to mirror it directly inside the app.</p>
                </div>

                <div 
                  onClick={startScreenShare}
                  className="border border-[#00d2ff]/50 bg-[#0a1a2f]/50 p-6 clip-corner-sm cursor-pointer hover:bg-[#00d2ff]/20 hover:border-[#00d2ff] transition-all group"
                >
                  <div className="text-[#00d2ff] mb-4 group-hover:scale-110 transition-transform origin-left">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-orbitron font-bold text-lg mb-2">Web Screen Mirror</h3>
                  <p className="text-[#8a9db8] text-sm font-inter">Capture a specific window or screen and display it directly inside this app (e.g., mirroring your game).</p>
                </div>
              </div>
            )}

            {mode === 'youtube' && (
              <div className="animate-fade-in">
                <h3 className="text-xl text-white font-orbitron mb-4">Embed YouTube Stream</h3>
                <p className="text-[#8a9db8] mb-4 text-sm font-inter">Paste your YouTube Livestream or Video link below to mirror it directly inside the app.</p>
                <input 
                  type="text" 
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-[#05090f] border border-[#1e3a5f] p-3 text-[#f0f4f8] focus:outline-none focus:border-[#ef4444] transition-all clip-corner-sm font-orbitron tracking-wide mb-6"
                />
                <div className="flex gap-4 w-full justify-end">
                  <Button onClick={() => setMode('menu')} variant="secondary">BACK</Button>
                  <Button onClick={startYoutubeMirror} disabled={!youtubeUrl.trim()}>MIRROR YOUTUBE</Button>
                </div>
              </div>
            )}

            {mode === 'cropping' && (
              <div className="animate-fade-in flex flex-col items-center">
                <p className="text-[#8a9db8] mb-4 text-sm text-center">Drag a box over the video below to crop the specific area you want to mirror.</p>
                
                <div 
                  className="relative w-full max-w-xl bg-black border border-[#1e3a5f] overflow-hidden cursor-crosshair select-none"
                  onMouseDown={handleCropMouseDown}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  onMouseLeave={handleCropMouseUp}
                >
                  <video 
                    ref={videoRef} 
                    className="w-full h-auto block pointer-events-none" 
                    muted 
                    playsInline 
                  />
                  
                  {/* Dragging Overlay */}
                  {isDragging && (
                    <div 
                      className="absolute border-2 border-[#00d2ff] bg-[#00d2ff]/20 pointer-events-none"
                      style={{
                        left: Math.min(startPos.x, currentPos.x),
                        top: Math.min(startPos.y, currentPos.y),
                        width: Math.abs(currentPos.x - startPos.x),
                        height: Math.abs(currentPos.y - startPos.y),
                      }}
                    />
                  )}

                  {/* Existing Crop Overlay */}
                  {!isDragging && crop.w < 1 && (
                    <div 
                      className="absolute border-2 border-[#dcb06b] bg-[#dcb06b]/20 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                      style={{
                        left: `${crop.x * 100}%`,
                        top: `${crop.y * 100}%`,
                        width: `${crop.w * 100}%`,
                        height: `${crop.h * 100}%`,
                      }}
                    />
                  )}
                </div>

                <div className="flex gap-4 mt-6 w-full justify-center">
                  <Button onClick={stopBroadcast} variant="secondary">CANCEL</Button>
                  <Button onClick={() => { setActiveSource('screen'); setMode('active'); setIsOpen(false); }}>APPLY & MIRROR</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Floating Mirror Window */}
      {mode === 'active' && (activeSource === 'screen' ? stream : youtubeVideoId) && (
        <div 
          className={`fixed z-[150] bg-[#05090f] border ${activeSource === 'youtube' ? 'border-[#ef4444] shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-[#00d2ff] shadow-[0_0_30px_rgba(0,210,255,0.2)]'} flex flex-col overflow-hidden transition-all duration-300 ${
            isFullscreen 
              ? 'inset-0 border-none rounded-none z-[9999] flex items-center justify-center bg-black' 
              : isMinimized
                ? 'clip-corner-sm'
                : 'clip-corner-sm'
          }`}
          style={!isFullscreen ? { 
            left: position.x, 
            top: position.y,
            width: isMinimized ? '200px' : windowSize.width,
          } : {}}
        >
          {/* Window Header (Draggable) */}
          <div 
            className={`bg-[#0a1a2f] border-b ${activeSource === 'youtube' ? 'border-[#ef4444]/30' : 'border-[#00d2ff]/30'} p-2 flex justify-between items-center select-none ${isFullscreen ? 'absolute top-0 left-0 right-0 z-10 opacity-0 hover:opacity-100 transition-opacity' : 'cursor-move'}`}
            onMouseDown={handleWindowDragStart}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className={`${activeSource === 'youtube' ? 'text-[#ef4444]' : 'text-[#00d2ff]'} font-orbitron text-[10px] font-bold tracking-widest`}>
                {activeSource === 'youtube' ? 'YOUTUBE LIVE' : 'LIVE MIRROR'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!isFullscreen && (
                <button 
                  onClick={toggleMinimize}
                  className="text-[#8a9db8] hover:text-white transition-colors"
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  {isMinimized ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  )}
                </button>
              )}
              {!isMinimized && (
                <button 
                  onClick={toggleFullscreen}
                  className="text-[#8a9db8] hover:text-white transition-colors"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0l5-5M4 4h5M15 15l5 5m0 0l-5 5m5-5h-5" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  )}
                </button>
              )}
              <button 
                onClick={stopBroadcast}
                className="text-[#ef4444] hover:text-white transition-colors ml-1"
                title="Stop Mirroring"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Container */}
          <div className={`relative w-full bg-black group ${isFullscreen ? 'flex items-center justify-center h-full' : ''} ${isMinimized ? 'hidden' : 'block'}`}>
            {activeSource === 'screen' ? (
              <canvas ref={canvasRef} className="block" style={{ maxWidth: '100%', maxHeight: '100%' }} />
            ) : (
              <div className="w-full" style={{ aspectRatio: '16/9', maxHeight: isFullscreen ? '100vh' : 'auto' }}>
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                  className="pointer-events-auto"
                ></iframe>
              </div>
            )}
            
            {/* Resize Handle */}
            {!isFullscreen && (
              <div 
                className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const startWidth = windowSize.width;
                  const zoomLevel = parseFloat((document.body.style as any).zoom) || 1;
                  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
                  
                  const handleResizeMove = (moveEvent: MouseEvent) => {
                    const deltaX = (moveEvent.clientX - startX) / zoomLevel;
                    const newWidth = Math.max(200, Math.min(startWidth + deltaX, viewportWidth - position.x - 20));
                    setWindowSize({ width: newWidth });
                  };
                  
                  const handleResizeUp = () => {
                    window.removeEventListener('mousemove', handleResizeMove);
                    window.removeEventListener('mouseup', handleResizeUp);
                  };
                  
                  window.addEventListener('mousemove', handleResizeMove);
                  window.addEventListener('mouseup', handleResizeUp);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${activeSource === 'youtube' ? 'text-[#ef4444]' : 'text-[#00d2ff]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Hidden video element required for canvas drawing */}
          {activeSource === 'screen' && <video ref={videoRef} className="hidden" muted playsInline />}
        </div>
      )}
    </>
  );
};
