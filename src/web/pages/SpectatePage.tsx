import React, { useState, useEffect, useRef } from 'react';

const TYPE_EMOJI: Record<string, string> = {
  fire: '🔥', water: '💧', grass: '🌿', electric: '⚡',
  psychic: '🔮', fighting: '💪', dark: '🌑', normal: '⚪',
};

const TYPE_COLORS: Record<string, string> = {
  fire: 'from-red-500 to-orange-500',
  water: 'from-blue-500 to-cyan-500',
  grass: 'from-green-500 to-emerald-500',
  electric: 'from-yellow-400 to-amber-500',
  psychic: 'from-pink-500 to-purple-500',
  fighting: 'from-orange-600 to-red-600',
  dark: 'from-gray-700 to-gray-900',
  normal: 'from-gray-400 to-gray-500',
};

interface LiveMatch {
  id: string;
  player1: string;
  player2: string;
  player1Knockouts: number;
  player2Knockouts: number;
  currentTurn: number;
  spectators: number;
}

interface MatchState {
  player1: any;
  player2: any;
  turns: any[];
  currentTurn: number;
  status: string;
  winner: string | null;
}

export default function SpectatePage() {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [currentTurn, setCurrentTurn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  
  // Fetch live matches every 2 seconds
  useEffect(() => {
    const fetchLiveMatches = () => {
      fetch('/api/matches/live')
        .then(r => r.json())
        .then(data => {
          setLiveMatches(data.matches || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    
    fetchLiveMatches();
    const interval = setInterval(fetchLiveMatches, 2000);
    return () => clearInterval(interval);
  }, []);
  
  // Subscribe to match stream when selected
  useEffect(() => {
    if (!selectedMatch) return;
    
    // Close previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const eventSource = new EventSource(`/api/match/${selectedMatch}/stream`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'start') {
        setMatchState(data.data);
      } else if (data.type === 'turn') {
        setCurrentTurn(data.data);
        setMatchState(prev => prev ? { ...prev, turns: [...prev.turns, data.data], currentTurn: data.data.turn } : prev);
      } else if (data.type === 'end') {
        setMatchState(data.data);
      }
    };
    
    eventSource.onerror = () => {
      eventSource.close();
    };
    
    return () => {
      eventSource.close();
    };
  }, [selectedMatch]);
  
  // Auto-scroll battle log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [matchState?.turns]);
  
  const handleBack = () => {
    setSelectedMatch(null);
    setMatchState(null);
    setCurrentTurn(null);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  };
  
  const getHpPercent = (hp: number, max: number) => Math.max(0, (hp / max) * 100);
  const getHpColor = (hp: number, max: number) => {
    const pct = hp / max;
    if (pct > 0.5) return 'bg-green-500';
    if (pct > 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Watching a match
  if (selectedMatch && matchState) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={handleBack} className="btn btn-secondary">
              ← Back to Live Matches
            </button>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-red-400 font-bold">LIVE</span>
            </div>
          </div>
          
          {/* Winner Banner */}
          {matchState.winner && (
            <div className="card glow-gold text-center py-8 mb-8 bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-4xl font-bold text-yellow-400">{matchState.winner} WINS!</h2>
            </div>
          )}
          
          {/* Score */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="card text-center px-8">
              <div className="text-sm text-gray-400">{matchState.player1.name}</div>
              <div className="text-4xl font-bold text-green-400">{matchState.player1.knockouts}</div>
              <div className="text-xs text-gray-500">KOs</div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-gray-600">VS</div>
              <div className="text-sm text-gray-500 mt-1">Turn {matchState.currentTurn || 0}</div>
            </div>
            <div className="card text-center px-8">
              <div className="text-sm text-gray-400">{matchState.player2.name}</div>
              <div className="text-4xl font-bold text-green-400">{matchState.player2.knockouts}</div>
              <div className="text-xs text-gray-500">KOs</div>
            </div>
          </div>
          
          {/* Players */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[matchState.player1, matchState.player2].map((player, idx) => {
              const turnData = currentTurn ? (idx === 0 ? currentTurn.player1 : currentTurn.player2) : null;
              const fighter = player.active;
              
              return (
                <div key={idx} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {fighter && TYPE_EMOJI[fighter.type]} {player.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">KOs:</span>
                      <span className="text-2xl font-bold text-yellow-400">{player.knockouts}/3</span>
                    </div>
                  </div>
                  
                  {fighter && (
                    <div className={`rounded-xl p-4 bg-gradient-to-br ${TYPE_COLORS[fighter.type]} bg-opacity-20 mb-4`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-lg font-bold">{fighter.name}</span>
                        <span className="px-2 py-1 rounded-full bg-black/30 text-sm">
                          {fighter.type.toUpperCase()}
                        </span>
                      </div>
                      
                      {/* HP Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>HP</span>
                          <span>{fighter.hp}/{fighter.maxHp}</span>
                        </div>
                        <div className="h-4 bg-black/30 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getHpColor(fighter.hp, fighter.maxHp)} transition-all duration-500`}
                            style={{ width: `${getHpPercent(fighter.hp, fighter.maxHp)}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Energy */}
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-300 mr-2">Energy:</span>
                        {[...Array(5)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                              i < player.energy ? 'bg-yellow-400 text-black' : 'bg-black/30'
                            }`}
                          >
                            {i < player.energy ? '⚡' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Bench */}
                  {player.bench?.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-400 mb-2">Bench:</div>
                      <div className="flex gap-2">
                        {player.bench.map((f: any, i: number) => (
                          <div key={i} className="flex-1 bg-white/5 rounded-lg p-2 text-center text-sm">
                            <div>{TYPE_EMOJI[f.type]} {f.name}</div>
                            <div className="text-gray-400">{f.hp}/{f.maxHp}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Thinking & Trash Talk */}
                  {turnData && (
                    <div className="space-y-2">
                      <div className="bg-purple-500/10 border-l-2 border-purple-500 rounded-r-lg p-3">
                        <div className="text-xs text-purple-400 mb-1">💭 Strategy</div>
                        <div className="text-sm italic">"{turnData.thinking}"</div>
                      </div>
                      {turnData.trashTalk && turnData.trashTalk !== '...' && (
                        <div className="bg-orange-500/10 border-l-2 border-orange-500 rounded-r-lg p-3">
                          <div className="text-xs text-orange-400 mb-1">🗣️ Trash Talk</div>
                          <div className="text-sm">"{turnData.trashTalk}"</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Battle Log */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">📜 Battle Log</h3>
            <div ref={logRef} className="max-h-64 overflow-y-auto space-y-2">
              {matchState.turns?.flatMap((turn, i) => 
                turn.events?.map((event: string, j: number) => (
                  <div 
                    key={`${i}-${j}`} 
                    className="py-2 px-3 bg-white/5 rounded-lg text-sm"
                  >
                    <span className="text-gray-500 mr-2">Turn {turn.turn}:</span>
                    {event}
                  </div>
                )) || []
              )}
              {(!matchState.turns || matchState.turns.length === 0) && (
                <div className="text-center text-gray-500 py-8">
                  Waiting for battle to start...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Live matches list
  return (
    <div className="pt-24 pb-16 px-4 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">👀 Spectate</span>
          </h1>
          <p className="text-gray-400">Watch live battles in real-time</p>
        </div>
        
        {/* Live indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-lg">
            <span className="text-red-400 font-bold">{liveMatches.length}</span>
            <span className="text-gray-400"> live {liveMatches.length === 1 ? 'battle' : 'battles'}</span>
          </span>
        </div>
        
        {/* Live matches */}
        {loading ? (
          <div className="card text-center py-16">
            <div className="text-4xl animate-spin mb-4">⚔️</div>
            <p className="text-gray-400">Finding live battles...</p>
          </div>
        ) : liveMatches.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">😴</div>
            <h2 className="text-2xl font-bold mb-2">No Live Battles</h2>
            <p className="text-gray-400 mb-6">
              The arena is quiet right now. Be the first to fight!
            </p>
            <a href="#play" className="btn btn-primary">
              🎮 Start a Battle
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {liveMatches.map(match => (
              <div 
                key={match.id}
                className="card hover:border-purple-500/50 transition-all cursor-pointer"
                onClick={() => setSelectedMatch(match.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Live badge */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="text-xs text-red-400 font-bold">LIVE</span>
                    </div>
                    
                    {/* Teams */}
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="font-bold">{match.player1}</div>
                        <div className="text-2xl font-bold text-green-400">{match.player1Knockouts}</div>
                      </div>
                      <div className="text-gray-500 text-2xl">vs</div>
                      <div className="text-center">
                        <div className="font-bold">{match.player2}</div>
                        <div className="text-2xl font-bold text-green-400">{match.player2Knockouts}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Turn {match.currentTurn}</div>
                      <div className="text-xs text-gray-500">
                        👁️ {match.spectators} watching
                      </div>
                    </div>
                    <button className="btn btn-primary">
                      Watch →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Recent battles link */}
        <div className="text-center mt-8">
          <a href="#arena" className="text-gray-400 hover:text-white transition">
            Or watch recorded battles →
          </a>
        </div>
      </div>
    </div>
  );
}
