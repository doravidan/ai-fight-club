import React, { useState, useEffect, useRef } from 'react';

const TYPE_COLORS: Record<string, string> = {
  fire: '#FF6B35',
  water: '#4A90D9',
  grass: '#7AC74C',
  electric: '#F7D02C',
  psychic: '#F95587',
  fighting: '#C22E28',
  dark: '#705746',
  normal: '#A8A878',
};

const TYPE_EMOJI: Record<string, string> = {
  fire: '🔥',
  water: '💧',
  grass: '🌿',
  electric: '⚡',
  psychic: '🔮',
  fighting: '💪',
  dark: '🌑',
  normal: '⚪',
};

interface Attack {
  name: string;
  energyCost: number;
  damage: number;
  effect?: string;
}

interface FighterCard {
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  attacks: Attack[];
  weakness: string;
  catchphrase: string;
}

interface Player {
  name: string;
  active: FighterCard | null;
  bench: FighterCard[];
  energy: number;
  knockouts: number;
}

interface TurnResult {
  turn: number;
  player1: {
    fighter: string;
    thinking: string;
    trashTalk: string;
    damage: number;
  };
  player2: {
    fighter: string;
    thinking: string;
    trashTalk: string;
    damage: number;
  };
  events: string[];
}

interface MatchState {
  id: string;
  player1: Player;
  player2: Player;
  turns: TurnResult[];
  status: string;
  winner: string | null;
}

interface Team {
  id: string;
  teamName: string;
  personality: string;
  fighters: { name: string; type: string; maxHp: number }[];
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '42px',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #FF6B35, #4A90D9, #7AC74C)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '5px',
  },
  subtitle: {
    color: '#888',
    fontSize: '16px',
  },
  arena: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '20px',
    padding: '25px',
    marginBottom: '20px',
  },
  playersRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
    marginBottom: '20px',
  },
  playerPanel: {
    flex: 1,
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '15px',
    padding: '20px',
  },
  teamName: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  activeCard: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '15px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  cardName: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  typeTag: {
    padding: '4px 12px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
  },
  statBar: {
    marginBottom: '8px',
  },
  statLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
    fontSize: '13px',
  },
  barBg: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
    height: '16px',
    overflow: 'hidden',
  },
  attacks: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
  },
  attackBtn: {
    flex: 1,
    padding: '8px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    fontSize: '11px',
    textAlign: 'left' as const,
  },
  bench: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
  },
  benchCard: {
    flex: 1,
    padding: '8px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    fontSize: '12px',
    textAlign: 'center' as const,
  },
  thoughtBubble: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '12px',
    marginTop: '12px',
  },
  thoughtLabel: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px',
  },
  thoughtText: {
    fontSize: '13px',
    fontStyle: 'italic',
  },
  trashTalk: {
    background: 'rgba(255,107,53,0.15)',
    borderLeft: '3px solid #FF6B35',
    padding: '8px 12px',
    marginTop: '8px',
    borderRadius: '0 8px 8px 0',
    fontSize: '13px',
  },
  vsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#ffd93d',
    textShadow: '0 0 20px rgba(255,217,61,0.5)',
  },
  score: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    marginBottom: '20px',
    fontSize: '18px',
  },
  scoreItem: {
    padding: '10px 25px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
  },
  eventLog: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    padding: '15px',
    maxHeight: '200px',
    overflowY: 'auto' as const,
  },
  eventItem: {
    padding: '6px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    fontSize: '13px',
  },
  controls: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    marginBottom: '25px',
    flexWrap: 'wrap' as const,
  },
  select: {
    padding: '12px 20px',
    fontSize: '15px',
    borderRadius: '10px',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
    minWidth: '180px',
  },
  button: {
    padding: '12px 35px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(90deg, #FF6B35, #F7D02C)',
    color: '#000',
    cursor: 'pointer',
  },
  winner: {
    fontSize: '28px',
    textAlign: 'center' as const,
    padding: '20px',
    background: 'linear-gradient(90deg, #F7D02C, #FF6B35)',
    borderRadius: '15px',
    color: '#000',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  energy: {
    display: 'flex',
    gap: '4px',
    marginTop: '5px',
  },
  energyDot: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#F7D02C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
  },
  energyEmpty: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
  },
};

function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [team1, setTeam1] = useState('team-fire');
  const [team2, setTeam2] = useState('team-water');
  const [match, setMatch] = useState<MatchState | null>(null);
  const [currentTurn, setCurrentTurn] = useState<TurnResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => setTeams(data.teams))
      .catch(() => {
        setTeams([
          { id: 'team-fire', teamName: 'Team Inferno', personality: 'Aggressive fire team', fighters: [] },
          { id: 'team-water', teamName: 'Team Tsunami', personality: 'Defensive water team', fighters: [] },
        ]);
      });
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
          setMatch(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              turns: [...prev.turns, data.data],
              player1: { ...prev.player1, ...data.data.player1State },
              player2: { ...prev.player2, ...data.data.player2State },
            };
          });
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

  const getHpColor = (hp: number, max: number) => {
    const pct = hp / max;
    if (pct > 0.5) return '#4ade80';
    if (pct > 0.25) return '#fbbf24';
    return '#ef4444';
  };

  const renderPlayer = (player: Player, turn: TurnResult | null, isPlayer1: boolean) => {
    const turnData = turn ? (isPlayer1 ? turn.player1 : turn.player2) : null;
    
    return (
      <div style={styles.playerPanel}>
        <div style={styles.teamName}>
          {TYPE_EMOJI[player.active?.type || 'fire']} {player.name}
          <span style={{ marginLeft: 'auto', fontSize: '14px' }}>
            KOs: {player.knockouts}/3
          </span>
        </div>

        {player.active && (
          <div style={styles.activeCard}>
            <div style={styles.cardHeader}>
              <span style={styles.cardName}>{player.active.name}</span>
              <span style={{
                ...styles.typeTag,
                background: TYPE_COLORS[player.active.type] || '#888',
              }}>
                {player.active.type.toUpperCase()}
              </span>
            </div>

            <div style={styles.statBar}>
              <div style={styles.statLabel}>
                <span>❤️ HP</span>
                <span>{player.active.hp}/{player.active.maxHp}</span>
              </div>
              <div style={styles.barBg}>
                <div style={{
                  height: '100%',
                  width: `${(player.active.hp / player.active.maxHp) * 100}%`,
                  background: getHpColor(player.active.hp, player.active.maxHp),
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#888' }}>
              Weak to: {TYPE_EMOJI[player.active.weakness]} {player.active.weakness}
            </div>

            <div style={styles.energy}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={i < player.energy ? styles.energyDot : styles.energyEmpty}>
                  {i < player.energy ? '⚡' : ''}
                </div>
              ))}
            </div>

            <div style={styles.attacks}>
              {player.active.attacks?.map((atk, i) => (
                <div key={i} style={styles.attackBtn}>
                  <div style={{ fontWeight: 'bold' }}>{atk.name}</div>
                  <div>{atk.energyCost}⚡ → {atk.damage} dmg</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {player.bench.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '5px' }}>Bench:</div>
            <div style={styles.bench}>
              {player.bench.map((f, i) => (
                <div key={i} style={styles.benchCard}>
                  {TYPE_EMOJI[f.type]} {f.name}
                  <div style={{ fontSize: '10px' }}>{f.hp}/{f.maxHp} HP</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {turnData && (
          <>
            <div style={styles.thoughtBubble}>
              <div style={styles.thoughtLabel}>💭 Strategy...</div>
              <div style={styles.thoughtText}>"{turnData.thinking}"</div>
            </div>
            {turnData.trashTalk && (
              <div style={styles.trashTalk}>
                🗣️ "{turnData.trashTalk}"
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🎴 AI FIGHT CLUB v2 🎴</h1>
        <p style={styles.subtitle}>Pokemon-style battles with visible AI thinking</p>
      </header>

      <div style={styles.controls}>
        <select style={styles.select} value={team1} onChange={e => setTeam1(e.target.value)}>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.teamName}</option>
          ))}
        </select>
        
        <span style={{ fontSize: '24px', alignSelf: 'center' }}>⚔️</span>
        
        <select style={styles.select} value={team2} onChange={e => setTeam2(e.target.value)}>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.teamName}</option>
          ))}
        </select>
        
        <button 
          style={{ ...styles.button, opacity: isLoading ? 0.5 : 1 }}
          onClick={startMatch}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Loading...' : '🎴 START BATTLE!'}
        </button>
      </div>

      {match && (
        <div style={styles.arena}>
          {match.winner && (
            <div style={styles.winner}>
              🏆 WINNER: {match.winner} 🏆
            </div>
          )}

          <div style={styles.score}>
            <div style={styles.scoreItem}>
              {match.player1.name}: {match.player1.knockouts} KOs
            </div>
            <div style={styles.scoreItem}>
              {match.player2.name}: {match.player2.knockouts} KOs
            </div>
          </div>

          <div style={styles.playersRow}>
            {renderPlayer(match.player1, currentTurn, true)}
            <div style={styles.vsContainer}>
              <div style={styles.vsText}>VS</div>
            </div>
            {renderPlayer(match.player2, currentTurn, false)}
          </div>

          <div style={styles.eventLog} ref={logRef}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>📜 Battle Log</div>
            {match.turns.flatMap((turn, i) => 
              turn.events.map((event, j) => (
                <div key={`${i}-${j}`} style={styles.eventItem}>
                  Turn {turn.turn}: {event}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {!match && !isLoading && (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
          <p style={{ fontSize: '20px', marginBottom: '15px' }}>⬆️ Select teams and start the battle! ⬆️</p>
          <p>🔥 Fire → 🌿 Grass → 💧 Water → 🔥 Fire</p>
          <p style={{ marginTop: '10px' }}>Type advantages deal +20 bonus damage!</p>
        </div>
      )}
    </div>
  );
}

export default App;
