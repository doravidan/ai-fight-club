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

interface Team {
  id: string;
  teamName: string;
  personality: string;
  fighters: { name: string; type: string; maxHp: number }[];
}

interface QueueStatus {
  count: number;
  bots: string[];
  position?: number;
}

type GamePhase = 'select' | 'queuing' | 'matched' | 'battle' | 'result';

interface MatchState {
  player1: any;
  player2: any;
  turns: any[];
  status: string;
  winner: string | null;
}

interface PlayerStats {
  elo: number;
  gamesPlayed: number;
  wins: number;
  winRate: string;
  isNew: boolean;
  message: string;
}

export default function PlayPage() {
  const [phase, setPhase] = useState<GamePhase>('select');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [currentTurn, setCurrentTurn] = useState<any>(null);
  const [searchTime, setSearchTime] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  
  // Load teams
  useEffect(() => {
    fetch('/api/teams')
      .then(r => r.json())
      .then(data => {
        setTeams(data.teams || []);
        if (data.teams?.length > 0) {
          setSelectedTeam(data.teams[0].id);
        }
      });
  }, []);
  
  // Queue polling
  useEffect(() => {
    if (phase !== 'queuing' || !playerId) return;
    
    const timer = setInterval(() => {
      setSearchTime(s => s + 1);
      
      fetch('/api/arena/queue/status')
        .then(r => r.json())
        .then(status => {
          setQueueStatus(status);
          // Check if we got matched (we're no longer in queue)
          if (status.count === 0 || !status.bots.includes(playerName)) {
            // We might be matched - check for active match
            checkForMatch();
          }
        });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [phase, playerId, playerName]);
  
  // Auto-scroll battle log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [match?.turns]);
  
  const checkForMatch = async () => {
    // For now, we'll simulate finding a match
    // In production, this would check a match endpoint
  };
  
  const handleJoinQueue = async () => {
    if (!playerName.trim()) {
      alert('Enter your fighter name!');
      return;
    }
    
    try {
      // Register as a bot
      const regRes = await fetch('/api/arena/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName,
          callbackUrl: `${window.location.origin}/api/player-callback`,
        }),
      });
      const regData = await regRes.json();
      setPlayerId(regData.botId);
      setPlayerStats({
        elo: regData.elo,
        gamesPlayed: regData.gamesPlayed,
        wins: regData.wins,
        winRate: regData.winRate,
        isNew: regData.isNew,
        message: regData.message
      });
      
      // Join queue
      const queueRes = await fetch('/api/arena/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: regData.botId }),
      });
      const queueData = await queueRes.json();
      
      setQueueStatus({ count: 1, bots: [playerName], position: queueData.position });
      setPhase('queuing');
      setSearchTime(0);
      
      // If position is 0, we matched immediately
      if (queueData.position === 0) {
        // Start a quick match for demo purposes
        setTimeout(() => startQuickMatch(), 500);
      }
    } catch (err) {
      console.error('Failed to join queue:', err);
    }
  };
  
  const startQuickMatch = async () => {
    // For demo: start match with selected team vs random opponent
    const opponents = teams.filter(t => t.id !== selectedTeam);
    const opponent = opponents[Math.floor(Math.random() * opponents.length)] || teams[0];
    
    setPhase('matched');
    
    setTimeout(async () => {
      setPhase('battle');
      
      const res = await fetch('/api/match/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1: selectedTeam, team2: opponent.id }),
      });
      const { matchId } = await res.json();
      
      // Stream match events
      const eventSource = new EventSource(`/api/match/${matchId}/stream`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'start') {
          setMatch(data.data);
        } else if (data.type === 'turn') {
          setCurrentTurn(data.data);
          setMatch(prev => prev ? { ...prev, turns: [...prev.turns, data.data] } : prev);
        } else if (data.type === 'end') {
          setMatch(data.data);
          setPhase('result');
          eventSource.close();
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
      };
    }, 2000);
  };
  
  const handleLeaveQueue = async () => {
    if (playerId) {
      await fetch('/api/arena/queue/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: playerId }),
      });
    }
    setPhase('select');
    setPlayerId(null);
    setSearchTime(0);
  };
  
  const handlePlayAgain = () => {
    setPhase('select');
    setMatch(null);
    setCurrentTurn(null);
    setPlayerId(null);
  };
  
  const selectedTeamData = teams.find(t => t.id === selectedTeam);
  
  const getHpPercent = (hp: number, max: number) => Math.max(0, (hp / max) * 100);
  const getHpColor = (hp: number, max: number) => {
    const pct = hp / max;
    if (pct > 0.5) return 'bg-green-500';
    if (pct > 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Team Selection Phase
  if (phase === 'select') {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="gradient-text">🎮 Play Now</span>
            </h1>
            <p className="text-gray-400">Choose your team and enter the arena!</p>
          </div>
          
          {/* Player Name */}
          <div className="card mb-6">
            <label className="block text-sm text-gray-400 mb-2">Your Fighter Name</label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
              maxLength={20}
            />
          </div>
          
          {/* Team Selection */}
          <div className="card mb-6">
            <label className="block text-sm text-gray-400 mb-4">Select Your Team</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedTeam === team.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="text-2xl mb-2">
                    {team.fighters?.[0] && TYPE_EMOJI[team.fighters[0].type]}
                  </div>
                  <div className="font-bold">{team.teamName}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {team.fighters?.length || 0} fighters
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Team Preview */}
          {selectedTeamData && (
            <div className="card mb-6">
              <h3 className="text-lg font-bold mb-3">{selectedTeamData.teamName}</h3>
              <p className="text-gray-400 text-sm mb-4">{selectedTeamData.personality}</p>
              <div className="flex gap-3">
                {selectedTeamData.fighters?.map((f, i) => (
                  <div key={i} className={`flex-1 rounded-lg p-3 bg-gradient-to-br ${TYPE_COLORS[f.type]} bg-opacity-20`}>
                    <div className="text-lg">{TYPE_EMOJI[f.type]}</div>
                    <div className="font-bold text-sm">{f.name}</div>
                    <div className="text-xs text-gray-300">{f.maxHp} HP</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Join Button */}
          <button
            onClick={handleJoinQueue}
            disabled={!playerName.trim()}
            className="w-full btn-primary text-xl py-4 disabled:opacity-50"
          >
            ⚔️ FIND OPPONENT
          </button>
        </div>
      </div>
    );
  }
  
  // Queuing Phase
  if (phase === 'queuing') {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
        <div className="card text-center max-w-md w-full">
          <div className="text-6xl mb-6 animate-pulse">⚔️</div>
          <h2 className="text-2xl font-bold mb-2">Finding Opponent...</h2>
          <p className="text-gray-400 mb-6">
            {playerStats?.message || 'Searching for a worthy challenger'}
          </p>
          
          <div className="text-4xl font-mono mb-6">
            {Math.floor(searchTime / 60)}:{(searchTime % 60).toString().padStart(2, '0')}
          </div>
          
          {/* Player Stats */}
          {playerStats && !playerStats.isNew && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-2xl font-bold text-yellow-400">{playerStats.elo}</div>
                <div className="text-xs text-gray-400">ELO</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-2xl font-bold text-green-400">{playerStats.wins}</div>
                <div className="text-xs text-gray-400">Wins</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <div className="text-2xl font-bold">{playerStats.winRate}</div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
            </div>
          )}
          
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <div className="text-sm text-gray-400 mb-2">Your Team</div>
            <div className="font-bold">{selectedTeamData?.teamName}</div>
          </div>
          
          {queueStatus && queueStatus.count > 1 && (
            <div className="text-sm text-gray-400 mb-4">
              {queueStatus.count} fighters in queue
            </div>
          )}
          
          <button
            onClick={handleLeaveQueue}
            className="text-gray-400 hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }
  
  // Matched Phase
  if (phase === 'matched') {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen flex items-center justify-center">
        <div className="card text-center max-w-md w-full">
          <div className="text-6xl mb-6">🎯</div>
          <h2 className="text-3xl font-bold mb-2 gradient-text">OPPONENT FOUND!</h2>
          <p className="text-gray-400 mb-6">
            Get ready to battle!
          </p>
          
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">
                {selectedTeamData?.fighters?.[0] && TYPE_EMOJI[selectedTeamData.fighters[0].type]}
              </div>
              <div className="font-bold">{selectedTeamData?.teamName}</div>
              <div className="text-sm text-gray-400">You</div>
            </div>
            
            <div className="text-3xl font-bold text-gray-600">VS</div>
            
            <div className="text-center">
              <div className="text-3xl mb-2">❓</div>
              <div className="font-bold">???</div>
              <div className="text-sm text-gray-400">Opponent</div>
            </div>
          </div>
          
          <div className="mt-8 text-2xl animate-pulse">
            Loading battle...
          </div>
        </div>
      </div>
    );
  }
  
  // Battle Phase
  if ((phase === 'battle' || phase === 'result') && match) {
    const isWinner = match.winner === match.player1.name;
    
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Winner Banner */}
          {phase === 'result' && match.winner && (
            <div className={`card text-center py-8 mb-8 ${
              isWinner 
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 glow-gold'
                : 'bg-gradient-to-r from-red-500/20 to-orange-500/20'
            }`}>
              <div className="text-6xl mb-4">{isWinner ? '🏆' : '💀'}</div>
              <h2 className="text-4xl font-bold">
                {isWinner ? (
                  <span className="text-yellow-400">VICTORY!</span>
                ) : (
                  <span className="text-red-400">DEFEAT</span>
                )}
              </h2>
              <p className="text-gray-300 mt-2">{match.winner} wins!</p>
              
              <button
                onClick={handlePlayAgain}
                className="btn-primary mt-6"
              >
                🔄 Play Again
              </button>
            </div>
          )}
          
          {/* Score */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="card text-center px-8 border-2 border-purple-500">
              <div className="text-xs text-purple-400 mb-1">YOU</div>
              <div className="text-sm text-gray-400">{match.player1.name}</div>
              <div className="text-4xl font-bold text-green-400">{match.player1.knockouts}</div>
              <div className="text-xs text-gray-500">KOs</div>
            </div>
            <div className="text-4xl font-bold self-center text-gray-600">VS</div>
            <div className="card text-center px-8">
              <div className="text-xs text-gray-500 mb-1">OPPONENT</div>
              <div className="text-sm text-gray-400">{match.player2.name}</div>
              <div className="text-4xl font-bold text-green-400">{match.player2.knockouts}</div>
              <div className="text-xs text-gray-500">KOs</div>
            </div>
          </div>
          
          {/* Players */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Player 1 (You) */}
            <div className="card border-2 border-purple-500/50">
              <div className="text-xs text-purple-400 mb-2">👤 YOUR TEAM</div>
              {renderFighter(match.player1, currentTurn?.player1)}
            </div>
            
            {/* Player 2 (Opponent) */}
            <div className="card">
              <div className="text-xs text-gray-500 mb-2">🎯 OPPONENT</div>
              {renderFighter(match.player2, currentTurn?.player2)}
            </div>
          </div>
          
          {/* Battle Log */}
          <div className="card">
            <h3 className="text-xl font-bold mb-4">📜 Battle Log</h3>
            <div ref={logRef} className="max-h-64 overflow-y-auto space-y-2">
              {match.turns.flatMap((turn, i) => 
                turn.events.map((event: string, j: number) => (
                  <div 
                    key={`${i}-${j}`} 
                    className="py-2 px-3 bg-white/5 rounded-lg text-sm"
                  >
                    <span className="text-gray-500 mr-2">Turn {turn.turn}:</span>
                    {event}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Helper to render fighter
  function renderFighter(player: any, turnData: any) {
    const fighter = player.active;
    
    return (
      <>
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
      </>
    );
  }
  
  return null;
}
