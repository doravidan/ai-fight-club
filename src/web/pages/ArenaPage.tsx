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

interface Attack {
  name: string;
  energyCost: number;
  damage: number;
}

interface Fighter {
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  attacks: Attack[];
  weakness: string;
}

interface Player {
  name: string;
  active: Fighter | null;
  bench: Fighter[];
  energy: number;
  knockouts: number;
}

interface TurnResult {
  turn: number;
  player1: { fighter: string; thinking: string; trashTalk: string; damage: number };
  player2: { fighter: string; thinking: string; trashTalk: string; damage: number };
  events: string[];
}

interface MatchState {
  player1: Player;
  player2: Player;
  turns: TurnResult[];
  status: string;
  winner: string | null;
}

interface Team {
  id: string;
  teamName: string;
}

export default function ArenaPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [team1, setTeam1] = useState('team-fire');
  const [team2, setTeam2] = useState('team-water');
  const [match, setMatch] = useState<MatchState | null>(null);
  const [currentTurn, setCurrentTurn] = useState<TurnResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    fetch('/api/teams')
      .then(r => r.json())
      .then(data => setTeams(data.teams || []))
      .catch(() => setTeams([
        { id: 'team-fire', teamName: 'Team Inferno' },
        { id: 'team-water', teamName: 'Team Tsunami' },
      ]));
  }, []);
  
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [match?.turns]);
  
  const startMatch = async () => {
    setIsLoading(true);
    setMatch(null);
    setCurrentTurn(null);
    
    try {
      const res = await fetch('/api/match/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team1, team2 }),
      });
      const { matchId } = await res.json();
      
      const eventSource = new EventSource(`/api/match/${matchId}/stream`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'start') {
          setMatch(data.data);
          setIsLoading(false);
        } else if (data.type === 'turn') {
          setCurrentTurn(data.data);
          setMatch(prev => prev ? { ...prev, turns: [...prev.turns, data.data] } : prev);
        } else if (data.type === 'end') {
          setMatch(data.data);
          eventSource.close();
        }
      };
      
      eventSource.onerror = () => {
        setIsLoading(false);
        eventSource.close();
      };
    } catch {
      setIsLoading(false);
    }
  };
  
  const getHpPercent = (hp: number, max: number) => Math.max(0, (hp / max) * 100);
  const getHpColor = (hp: number, max: number) => {
    const pct = hp / max;
    if (pct > 0.5) return 'bg-green-500';
    if (pct > 0.25) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const renderPlayer = (player: Player, turn: TurnResult | null, isPlayer1: boolean) => {
    const turnData = turn ? (isPlayer1 ? turn.player1 : turn.player2) : null;
    const fighter = player.active;
    
    return (
      <div className="card">
        {/* Team Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            {fighter && TYPE_EMOJI[fighter.type]} {player.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">KOs:</span>
            <span className="text-2xl font-bold text-yellow-400">{player.knockouts}/3</span>
          </div>
        </div>
        
        {/* Active Fighter */}
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
            <div className="flex items-center gap-1 mb-3">
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
            
            {/* Attacks */}
            <div className="grid grid-cols-2 gap-2">
              {fighter.attacks?.map((atk, i) => (
                <div key={i} className="bg-black/30 rounded-lg p-2 text-sm">
                  <div className="font-bold">{atk.name}</div>
                  <div className="text-gray-300">{atk.energyCost}⚡ → {atk.damage} dmg</div>
                </div>
              ))}
            </div>
            
            {/* Weakness */}
            <div className="text-sm text-gray-300 mt-2">
              Weak to: {TYPE_EMOJI[fighter.weakness]} {fighter.weakness}
            </div>
          </div>
        )}
        
        {/* Bench */}
        {player.bench.length > 0 && (
          <div>
            <div className="text-sm text-gray-400 mb-2">Bench:</div>
            <div className="flex gap-2">
              {player.bench.map((f, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-lg p-2 text-center text-sm">
                  <div>{TYPE_EMOJI[f.type]} {f.name}</div>
                  <div className="text-gray-400">{f.hp}/{f.maxHp} HP</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Thinking & Trash Talk */}
        {turnData && (
          <div className="mt-4 space-y-2">
            <div className="bg-purple-500/10 border-l-2 border-purple-500 rounded-r-lg p-3">
              <div className="text-xs text-purple-400 mb-1">💭 Strategy</div>
              <div className="text-sm italic">"{turnData.thinking}"</div>
            </div>
            {turnData.trashTalk && (
              <div className="bg-orange-500/10 border-l-2 border-orange-500 rounded-r-lg p-3">
                <div className="text-xs text-orange-400 mb-1">🗣️ Trash Talk</div>
                <div className="text-sm">"{turnData.trashTalk}"</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="pt-24 pb-16 px-4 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">⚔️ Battle Arena</span>
          </h1>
          <p className="text-gray-400">Watch AI fighters battle in real-time</p>
        </div>
        
        {/* Team Selection */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <select 
              value={team1} 
              onChange={e => setTeam1(e.target.value)}
              className="w-full md:w-48 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
            >
              {teams.map(t => <option key={t.id} value={t.id}>{t.teamName}</option>)}
            </select>
            
            <span className="text-3xl">⚔️</span>
            
            <select 
              value={team2} 
              onChange={e => setTeam2(e.target.value)}
              className="w-full md:w-48 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
            >
              {teams.map(t => <option key={t.id} value={t.id}>{t.teamName}</option>)}
            </select>
            
            <button 
              onClick={startMatch}
              disabled={isLoading}
              className="btn-primary w-full md:w-auto disabled:opacity-50"
            >
              {isLoading ? '⏳ Loading...' : '🎴 START BATTLE!'}
            </button>
          </div>
        </div>
        
        {/* Battle Area */}
        {match && (
          <>
            {/* Winner Banner */}
            {match.winner && (
              <div className="card glow-gold text-center py-8 mb-8 bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-4xl font-bold text-yellow-400">{match.winner} WINS!</h2>
              </div>
            )}
            
            {/* Score */}
            <div className="flex justify-center gap-8 mb-8">
              <div className="card text-center px-8">
                <div className="text-sm text-gray-400">{match.player1.name}</div>
                <div className="text-4xl font-bold text-green-400">{match.player1.knockouts}</div>
                <div className="text-xs text-gray-500">KOs</div>
              </div>
              <div className="text-4xl font-bold self-center text-gray-600">VS</div>
              <div className="card text-center px-8">
                <div className="text-sm text-gray-400">{match.player2.name}</div>
                <div className="text-4xl font-bold text-green-400">{match.player2.knockouts}</div>
                <div className="text-xs text-gray-500">KOs</div>
              </div>
            </div>
            
            {/* Players */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {renderPlayer(match.player1, currentTurn, true)}
              {renderPlayer(match.player2, currentTurn, false)}
            </div>
            
            {/* Battle Log */}
            <div className="card">
              <h3 className="text-xl font-bold mb-4">📜 Battle Log</h3>
              <div 
                ref={logRef}
                className="max-h-64 overflow-y-auto space-y-2"
              >
                {match.turns.flatMap((turn, i) => 
                  turn.events.map((event, j) => (
                    <div 
                      key={`${i}-${j}`} 
                      className="py-2 px-3 bg-white/5 rounded-lg text-sm"
                    >
                      <span className="text-gray-500 mr-2">Turn {turn.turn}:</span>
                      {event}
                    </div>
                  ))
                )}
                {match.turns.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    Battle starting...
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Empty State */}
        {!match && !isLoading && (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold mb-2">Select Teams & Fight!</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Choose two teams above and click "START BATTLE!" to watch AI fighters duke it out
            </p>
            <div className="mt-8 text-gray-500">
              <p>🔥 Fire → 🌿 Grass → 💧 Water → 🔥 Fire</p>
              <p className="text-sm mt-2">Type advantages deal +20 bonus damage!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
