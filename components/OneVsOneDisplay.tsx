import React, { useState, useEffect } from 'react';
import { Player, OneVsOneSession, OneVsOneMatch } from '../types';
import { Button } from './Button';

interface Props {
  session: OneVsOneSession;
  onUpdateSession: (session: OneVsOneSession) => void;
  onEndSession: () => void;
}

export function OneVsOneDisplay({ session, onUpdateSession, onEndSession }: Props) {
  const [hero1Input, setHero1Input] = useState('');
  const [hero2Input, setHero2Input] = useState('');
  const [roomInput, setRoomInput] = useState(session.currentRoomId || '');
  const [error, setError] = useState<string | null>(null);
  const [newChallengerName, setNewChallengerName] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  useEffect(() => {
    if (session.currentRoomId) {
      setRoomInput(session.currentRoomId);
    }
  }, [session.currentRoomId]);

  const handleAddChallenger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChallengerName.trim()) return;
    
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: newChallengerName.trim(),
      isActive: true,
      roles: []
    };
    
    // If there's no next player (e.g., queue was empty and match finished),
    // we might need to set them as nextPlayer if status is picking.
    // But usually, if status is finished, we don't add.
    // Let's just add to queue. If nextPlayer is null and status is picking, we should assign them.
    if (!session.nextPlayer && session.status === 'picking') {
      onUpdateSession({
        ...session,
        nextPlayer: newPlayer
      });
    } else {
      onUpdateSession({
        ...session,
        playersQueue: [...session.playersQueue, newPlayer]
      });
    }
    setNewChallengerName('');
  };

  const handleEndSessionEarly = () => {
    onUpdateSession({
      ...session,
      status: 'finished'
    });
  };

  const handleStartMatch = () => {
    if (!hero1Input.trim() || !hero2Input.trim()) {
      setError("Both players must select a hero.");
      return;
    }
    
    if (!roomInput.trim() || roomInput.length < 4) {
      setError("Please enter a valid 4-digit Room ID.");
      return;
    }
    
    const h1 = hero1Input.trim().toLowerCase();
    const h2 = hero2Input.trim().toLowerCase();

    if (h1 === h2) {
      setError("Players cannot pick the same hero.");
      return;
    }

    if (session.usedHeroes.includes(h1)) {
      setError(`Hero ${hero1Input} has already been used in this session.`);
      return;
    }

    if (session.usedHeroes.includes(h2)) {
      setError(`Hero ${hero2Input} has already been used in this session.`);
      return;
    }

    setError(null);
    onUpdateSession({
      ...session,
      status: 'battling',
      currentHero1: hero1Input.trim(),
      currentHero2: hero2Input.trim(),
      currentRoomId: roomInput.trim()
    });
  };

  const handleMatchEnd = (winnerIndex: 1 | 2) => {
    const winner = winnerIndex === 1 ? session.currentPlayer! : session.nextPlayer!;
    const loser = winnerIndex === 1 ? session.nextPlayer! : session.currentPlayer!;
    
    const matchRecord: OneVsOneMatch = {
      id: crypto.randomUUID(),
      player1: session.currentPlayer!,
      player2: session.nextPlayer!,
      hero1: session.currentHero1,
      hero2: session.currentHero2,
      winnerId: winner.id
    };

    const winnerHero = winnerIndex === 1 ? session.currentHero1 : session.currentHero2;
    const loserHero = winnerIndex === 1 ? session.currentHero2 : session.currentHero1;

    const newUsedHeroes = [...session.usedHeroes, loserHero.toLowerCase()];
    const newHistory = [...session.matchHistory, matchRecord];
    
    const newStreak = winnerIndex === 1 ? session.currentStreak + 1 : 1;

    if (session.playersQueue.length === 0) {
      // Session finished
      onUpdateSession({
        ...session,
        currentPlayer: winner,
        nextPlayer: null,
        usedHeroes: newUsedHeroes,
        matchHistory: newHistory,
        currentStreak: newStreak,
        status: 'finished'
      });
    } else {
      // Next match
      const nextQueue = [...session.playersQueue];
      const nextP = nextQueue.shift()!;
      
      onUpdateSession({
        ...session,
        currentPlayer: winner,
        nextPlayer: nextP,
        playersQueue: nextQueue,
        usedHeroes: newUsedHeroes,
        matchHistory: newHistory,
        currentStreak: newStreak,
        status: 'picking',
        currentHero1: winnerHero,
        currentHero2: '',
        currentRoomId: '' // Clear room ID for the next match
      });
      setHero1Input(winnerHero);
      setHero2Input('');
      setRoomInput('');
    }
  };

  if (session.status === 'finished') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-black animate-fade-in font-orbitron">
        <h2 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] mb-4">CHAMPION</h2>
        <div className="bg-gradient-to-b from-yellow-900/40 to-black p-12 border-2 border-yellow-500/50 clip-corner-lg mb-8 relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
          <p className="text-7xl font-black italic text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] relative z-10">
            {session.currentPlayer?.name}
          </p>
          <p className="text-xl text-yellow-500 mt-6 font-bold tracking-[0.2em] relative z-10">FINAL STREAK: {session.currentStreak}</p>
        </div>
        <Button onClick={onEndSession} variant="primary" className="text-xl px-12 py-4">BACK TO LOBBY</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden font-orbitron relative">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>

      {/* Header */}
      <header className="flex justify-between items-center p-4 md:p-6 z-20 bg-black/60 border-b border-white/10 backdrop-blur-sm relative">
        <div className="flex items-center gap-6">
          <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 tracking-wider drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">KING OF THE HILL</h2>
          <div className="bg-yellow-500/20 border border-yellow-500/50 px-4 py-1 rounded-full flex items-center gap-2">
            <span className="text-yellow-500 text-xs font-bold tracking-widest uppercase">Streak</span>
            <span className="text-white font-black text-lg">{session.currentStreak}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer group">
            <span className="text-xs font-bold tracking-widest uppercase text-gray-400 group-hover:text-white transition-colors">Allow Recall</span>
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={session.allowRecall}
                onChange={(e) => onUpdateSession({ ...session, allowRecall: e.target.checked })}
              />
              <div className={`block w-12 h-6 rounded-full transition-colors border ${session.allowRecall ? 'bg-green-600 border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-800 border-gray-600'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${session.allowRecall ? 'transform translate-x-6' : ''}`}></div>
            </div>
          </label>
          <button onClick={handleEndSessionEarly} className="text-xs font-bold tracking-widest uppercase text-red-500 hover:text-red-400 hover:bg-red-500/10 px-4 py-2 border border-red-500/30 transition-all rounded">END SESSION</button>
        </div>
      </header>

      {/* Main VS Area */}
      <div className="flex-1 flex flex-col md:flex-row relative z-10">
        {/* Left Side - King */}
        <div className="flex-1 bg-gradient-to-br from-cyan-900/30 to-black flex flex-col items-center justify-center p-8 relative border-b md:border-b-0 md:border-r border-cyan-500/30 overflow-hidden group">
           {/* Diagonal slash effect */}
           <div className="absolute inset-0 bg-cyan-500/5 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-1000 pointer-events-none"></div>
           
           <div className="absolute top-6 left-6 text-cyan-500 font-black text-2xl tracking-[0.3em] uppercase opacity-80">KING</div>
           
           <div className="relative z-10 flex flex-col items-center w-full max-w-md">
             <h2 className="text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-600 drop-shadow-[0_0_15px_rgba(0,255,255,0.6)] uppercase text-center mb-8 transform -skew-x-6">
               {session.currentPlayer?.name}
             </h2>
             
             {session.status === 'picking' ? (
               <div className="w-full bg-black/60 p-6 border-l-4 border-cyan-500 backdrop-blur-sm">
                 <label className="block text-cyan-400 text-sm font-bold tracking-widest uppercase mb-3">Select Hero</label>
                 <input 
                   type="text" 
                   value={hero1Input}
                   onChange={e => setHero1Input(e.target.value)}
                   className="w-full bg-cyan-950/30 border-b-2 border-cyan-500/50 p-4 text-2xl text-white font-black italic focus:border-cyan-400 focus:bg-cyan-900/50 outline-none transition-all placeholder-cyan-800/50 text-center uppercase"
                   placeholder="HERO NAME"
                 />
               </div>
             ) : (
               <div className="w-full bg-cyan-900/20 p-6 border-l-4 border-cyan-500 backdrop-blur-sm flex flex-col items-center">
                 <p className="text-cyan-400 text-sm font-bold tracking-widest uppercase mb-2">Playing as</p>
                 <p className="text-4xl font-black italic text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] uppercase">{session.currentHero1}</p>
               </div>
             )}
           </div>
        </div>

        {/* Right Side - Challenger */}
        <div className="flex-1 bg-gradient-to-bl from-red-900/30 to-black flex flex-col items-center justify-center p-8 relative border-t md:border-t-0 md:border-l border-red-500/30 overflow-hidden group">
           {/* Diagonal slash effect */}
           <div className="absolute inset-0 bg-red-500/5 transform skew-x-12 -translate-x-full group-hover:translate-x-0 transition-transform duration-1000 pointer-events-none"></div>

           <div className="absolute top-6 right-6 text-red-500 font-black text-2xl tracking-[0.3em] uppercase opacity-80">CHALLENGER</div>
           
           <div className="relative z-10 flex flex-col items-center w-full max-w-md">
             <h2 className="text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-l from-red-400 to-orange-600 drop-shadow-[0_0_15px_rgba(255,0,0,0.6)] uppercase text-center mb-8 transform skew-x-6">
               {session.nextPlayer?.name}
             </h2>
             
             {session.status === 'picking' ? (
               <div className="w-full bg-black/60 p-6 border-r-4 border-red-500 backdrop-blur-sm">
                 <label className="block text-red-400 text-sm font-bold tracking-widest uppercase mb-3 text-right">Select Hero</label>
                 <input 
                   type="text" 
                   value={hero2Input}
                   onChange={e => setHero2Input(e.target.value)}
                   className="w-full bg-red-950/30 border-b-2 border-red-500/50 p-4 text-2xl text-white font-black italic focus:border-red-400 focus:bg-red-900/50 outline-none transition-all placeholder-red-800/50 text-center uppercase"
                   placeholder="HERO NAME"
                 />
               </div>
             ) : (
               <div className="w-full bg-red-900/20 p-6 border-r-4 border-red-500 backdrop-blur-sm flex flex-col items-center">
                 <p className="text-red-400 text-sm font-bold tracking-widest uppercase mb-2">Playing as</p>
                 <p className="text-4xl font-black italic text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] uppercase">{session.currentHero2}</p>
               </div>
             )}
           </div>
        </div>

        {/* Center VS & Controls */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
           <div className="text-[8rem] md:text-[12rem] font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] leading-none transform -skew-x-12">VS</div>
           
           <div className="pointer-events-auto mt-4 md:mt-8 flex flex-col items-center bg-black/90 p-6 border-y-4 border-yellow-500 backdrop-blur-md min-w-[300px] shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              {session.status === 'picking' ? (
                <div className="w-full flex flex-col items-center">
                  <div className="w-full mb-6">
                    <label className="block text-center text-yellow-500 text-xs font-bold tracking-widest uppercase mb-2">Room ID</label>
                    <input 
                      type="text" 
                      value={roomInput}
                      onChange={e => setRoomInput(e.target.value)}
                      className="w-full bg-black border-2 border-yellow-500/50 p-3 text-xl text-center text-white font-black tracking-widest focus:border-yellow-400 outline-none transition-colors uppercase"
                      placeholder="ENTER ID"
                      maxLength={6}
                    />
                  </div>
                  {error && <p className="text-red-500 text-xs font-bold text-center mb-4 bg-red-950/50 p-2 border border-red-500/30 w-full">{error}</p>}
                  <button 
                    onClick={handleStartMatch} 
                    className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-black italic text-2xl py-4 uppercase tracking-widest hover:from-yellow-500 hover:to-yellow-400 transform hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                  >
                    FIGHT!
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 px-6 py-2 mb-6">
                    <p className="text-yellow-500 text-xs font-bold tracking-widest uppercase text-center mb-1">Room ID</p>
                    <p className="text-2xl font-black text-white tracking-widest text-center">{session.currentRoomId}</p>
                  </div>
                  <p className="text-sm text-red-500 font-bold tracking-widest uppercase animate-pulse mb-6">MATCH IN PROGRESS</p>
                  <div className="flex gap-4 w-full justify-center">
                    <button onClick={() => handleMatchEnd(1)} className="flex-1 bg-cyan-900/80 border border-cyan-500 text-cyan-400 font-bold py-3 hover:bg-cyan-800 hover:text-white transition-colors uppercase tracking-wider text-sm">P1 WINS</button>
                    <button onClick={() => handleMatchEnd(2)} className="flex-1 bg-red-900/80 border border-red-500 text-red-400 font-bold py-3 hover:bg-red-800 hover:text-white transition-colors uppercase tracking-wider text-sm">P2 WINS</button>
                  </div>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Lower Dashboard: Queue, Banned Heroes, and History */}
      <div className="flex flex-col bg-black/80 border-t border-white/10 z-20 relative flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">
          
          {/* Challengers Queue */}
          <div className="p-4 md:p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                WAITING LIST ({session.playersQueue.length})
              </h4>
              <form onSubmit={handleAddChallenger} className="flex">
                <input 
                  type="text" 
                  value={newChallengerName}
                  onChange={(e) => setNewChallengerName(e.target.value)}
                  placeholder="NEW CHALLENGER"
                  className="bg-gray-900/50 border border-gray-700 text-xs px-3 py-1.5 text-white uppercase focus:border-yellow-500 outline-none w-32 md:w-48 transition-colors"
                />
                <button type="submit" className="bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold px-4 py-1.5 uppercase transition-colors">ADD</button>
              </form>
            </div>
            <div className="flex flex-wrap gap-2">
              {session.playersQueue.map((p, i) => (
                <div key={p.id} className="bg-gray-800/50 border border-gray-700/50 rounded-full px-3 py-1 flex items-center gap-2">
                  <span className="bg-gray-700 text-gray-300 text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full">{i + 1}</span>
                  <span className="text-gray-200 text-xs font-bold uppercase">{p.name}</span>
                </div>
              ))}
              {session.playersQueue.length === 0 && <span className="text-xs text-gray-600 font-bold italic py-1">QUEUE IS EMPTY</span>}
            </div>
          </div>

          {/* Banned Heroes */}
          <div className="p-4 md:p-6 flex flex-col">
            <h4 className="text-sm text-red-500/80 font-bold tracking-widest uppercase mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              BANNED HEROES
            </h4>
            <div className="flex flex-wrap gap-2">
              {session.usedHeroes.map((h, i) => (
                <span key={i} className="bg-red-950/30 border border-red-900/50 text-red-400/90 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {h}
                </span>
              ))}
              {session.usedHeroes.length === 0 && <span className="text-xs text-gray-600 font-bold italic py-1">NO HEROES BANNED YET</span>}
            </div>
          </div>
        </div>

        {/* History Toggle */}
        <button 
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          className="w-full py-2 bg-gray-900/50 hover:bg-gray-800/50 border-t border-white/5 text-gray-400 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
        >
          {isHistoryExpanded ? '▲ HIDE MATCH HISTORY ▲' : '▼ VIEW MATCH HISTORY ▼'}
        </button>

        {/* Expandable History */}
        {isHistoryExpanded && (
          <div className="max-h-[400px] overflow-y-auto p-4 md:p-6 bg-black/95 border-t border-white/5 custom-scrollbar">
            {session.matchHistory.length === 0 ? (
              <div className="p-8 text-center border border-[#1e3a5f] bg-[#0a1a2f]/40 rounded">
                <p className="text-[#8a9db8] font-cinzel tracking-widest text-sm">No match history recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...session.matchHistory].reverse().map((match, index) => {
                  const isP1Winner = match.winnerId === match.player1.id;
                  const winner = isP1Winner ? match.player1 : match.player2;
                  const loser = isP1Winner ? match.player2 : match.player1;
                  const winnerHero = isP1Winner ? match.hero1 : match.hero2;
                  const loserHero = isP1Winner ? match.hero2 : match.hero1;

                  return (
                    <div key={match.id} className="border border-[#1e3a5f] bg-[#05090f] clip-corner-sm flex flex-col md:flex-row overflow-hidden transition-all hover:border-[#dcb06b]/30">
                      {/* Match Number & Winner Indicator */}
                      <div className="bg-yellow-600/20 border-r border-yellow-600/30 flex items-center justify-center p-4 min-w-[80px]">
                        <span className="text-yellow-500 font-black text-xl">#{session.matchHistory.length - index}</span>
                      </div>

                      {/* Match Details */}
                      <div className="flex-1 flex flex-col md:flex-row items-center justify-between p-4 gap-4">
                        {/* Winner */}
                        <div className="flex-1 flex items-center gap-4 w-full">
                          <div className="w-1 h-10 bg-yellow-500 shadow-[0_0_10px_#eab308]"></div>
                          <div>
                            <div className="text-xs text-yellow-500 font-bold tracking-widest uppercase mb-1">WINNER</div>
                            <div className="font-orbitron font-bold text-white text-lg">{winner.name}</div>
                            <div className="text-xs text-gray-400 uppercase">{winnerHero}</div>
                          </div>
                        </div>

                        {/* VS */}
                        <div className="text-gray-600 font-black italic px-4">VS</div>

                        {/* Loser */}
                        <div className="flex-1 flex items-center gap-4 w-full justify-end text-right">
                          <div>
                            <div className="text-xs text-gray-500 font-bold tracking-widest uppercase mb-1">DEFEATED</div>
                            <div className="font-orbitron font-bold text-gray-400 text-lg">{loser.name}</div>
                            <div className="text-xs text-gray-600 uppercase">{loserHero}</div>
                          </div>
                          <div className="w-1 h-10 bg-gray-700"></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
