import React, { useState, useEffect, useRef } from 'react';

interface Fighter {
  name: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
}

interface TurnData {
  name: string;
  move: string;
  thinking: string;
  trashTalk: string;
  hpBefore: number;
  hpAfter: number;
  result: { description: string };
}

interface TurnResult {
  turn: number;
  fighter1: TurnData;
  fighter2: TurnData;
}

interface MatchState {
  id: string;
  fighter1: Fighter;
  fighter2: Fighter;
  turns: TurnResult[];
  status: 'pending' | 'fighting' | 'finished';
  winner: string | null;
}

interface Bot {
  id: string;
  name: string;
  personality: string;
  specialName: string;
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #ff6b6b, #ffd93d)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '10px',
  },
  subtitle: {
    color: '#888',
    fontSize: '18px',
  },
  arena: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '20px',
    padding: '30px',
    marginBottom: '30px',
  },
  fightersRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '40px',
    marginBottom: '30px',
  },
  fighter: {
    flex: 1,
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '15px',
    padding: '20px',
  },
  fighterName: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '15px',
    textAlign: 'center' as const,
  },
  statBar: {
    marginBottom: '10px',
  },
  statLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px',
    fontSize: '14px',
  },
  barBg: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    height: '20px',
    overflow: 'hidden',
  },
  hpBar: {
    background: 'linear-gradient(90deg, #ff4444, #ff6b6b)',
    height: '100%',
    transition: 'width 0.5s ease',
  },
  energyBar: {
    background: 'linear-gradient(90deg, #4444ff, #6b6bff)',
    height: '100%',
    transition: 'width 0.5s ease',
  },
  thoughtBubble: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '15px',
    padding: '15px',
    marginTop: '15px',
    minHeight: '80px',
  },
  thoughtLabel: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '5px',
  },
  thoughtText: {
    fontSize: '14px',
    fontStyle: 'italic',
  },
  trashTalk: {
    background: 'rgba(255,107,107,0.2)',
    borderLeft: '3px solid #ff6b6b',
    padding: '10px 15px',
    marginTop: '10px',
    borderRadius: '0 10px 10px 0',
    fontSize: '14px',
  },
  turnHistory: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '15px',
    padding: '20px',
    maxHeight: '300px',
    overflowY: 'auto' as const,
  },
  turnItem: {
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    padding: '10px 0',
    fontSize: '14px',
  },
  controls: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap' as const,
  },
  select: {
    padding: '12px 20px',
    fontSize: '16px',
    borderRadius: '10px',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
  },
  button: {
    padding: '12px 40px',
    fontSize: '18px',
    fontWeight: 'bold',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(90deg, #ff6b6b, #ffd93d)',
    color: '#000',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  vsText: {
    fontSize: '36px',
    textAlign: 'center' as const,
    margin: '20px 0',
    color: '#ffd93d',
    fontWeight: 'bold',
  },
  winner: {
    fontSize: '32px',
    textAlign: 'center' as const,
    padding: '20px',
    background: 'linear-gradient(90deg, #ffd93d, #ff6b6b)',
    borderRadius: '15px',
    color: '#000',
    fontWeight: 'bold',
  },
  moveTag: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '15px',
    background: 'rgba(255,215,0,0.3)',
    color: '#ffd93d',
    fontSize: '12px',
    fontWeight: 'bold',
    marginLeft: '10px',
  },
};

function App() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [bot1, setBot1] = useState('berserker');
  const [bot2, setBot2] = useState('calculator');
  const [match, setMatch] = useState<MatchState | null>(null);
  const [currentTurn, setCurrentTurn] = useState<TurnResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Load available bots
  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => setBots(data.bots));
  }, []);

  // Auto-scroll history
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [match?.turns]);

  const startMatch = async () => {
    setIsLoading(true);
    setMatch(null);
    setCurrentTurn(null);

    const res = await fetch('/api/match/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot1, bot2 }),
    });
    const { matchId } = await res.json();

    // Connect to SSE stream
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
            fighter1: { ...prev.fighter1, hp: data.data.fighter1.hpAfter },
            fighter2: { ...prev.fighter2, hp: data.data.fighter2.hpAfter },
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
  };

  const getHpColor = (hp: number, max: number) => {
    const pct = hp / max;
    if (pct > 0.5) return '#4ade80';
    if (pct > 0.25) return '#fbbf24';
    return '#ef4444';
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🥊 AI FIGHT CLUB 🥊</h1>
        <p style={styles.subtitle}>Watch LLMs battle with visible thinking</p>
      </header>

      <div style={styles.controls}>
        <select style={styles.select} value={bot1} onChange={e => setBot1(e.target.value)}>
          {bots.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        
        <span style={{ fontSize: '24px', alignSelf: 'center' }}>⚔️</span>
        
        <select style={styles.select} value={bot2} onChange={e => setBot2(e.target.value)}>
          {bots.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        
        <button 
          style={{ ...styles.button, opacity: isLoading ? 0.5 : 1 }}
          onClick={startMatch}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Loading...' : '🥊 START FIGHT!'}
        </button>
      </div>

      {match && (
        <div style={styles.arena}>
          {match.winner && (
            <div style={styles.winner}>
              🏆 WINNER: {match.winner} 🏆
            </div>
          )}

          <div style={styles.fightersRow}>
            {/* Fighter 1 */}
            <div style={styles.fighter}>
              <h2 style={styles.fighterName}>{match.fighter1.name}</h2>
              
              <div style={styles.statBar}>
                <div style={styles.statLabel}>
                  <span>❤️ HP</span>
                  <span>{match.fighter1.hp}/{match.fighter1.maxHp}</span>
                </div>
                <div style={styles.barBg}>
                  <div style={{
                    ...styles.hpBar,
                    width: `${(match.fighter1.hp / match.fighter1.maxHp) * 100}%`,
                    background: getHpColor(match.fighter1.hp, match.fighter1.maxHp),
                  }} />
                </div>
              </div>

              <div style={styles.statBar}>
                <div style={styles.statLabel}>
                  <span>⚡ Energy</span>
                  <span>{match.fighter1.energy}/{match.fighter1.maxEnergy}</span>
                </div>
                <div style={styles.barBg}>
                  <div style={{
                    ...styles.energyBar,
                    width: `${(match.fighter1.energy / match.fighter1.maxEnergy) * 100}%`,
                  }} />
                </div>
              </div>

              {currentTurn && (
                <>
                  <div style={styles.thoughtBubble}>
                    <div style={styles.thoughtLabel}>💭 Thinking...</div>
                    <div style={styles.thoughtText}>"{currentTurn.fighter1.thinking}"</div>
                    <span style={styles.moveTag}>{currentTurn.fighter1.move}</span>
                  </div>
                  {currentTurn.fighter1.trashTalk && (
                    <div style={styles.trashTalk}>
                      🗣️ "{currentTurn.fighter1.trashTalk}"
                    </div>
                  )}
                </>
              )}
            </div>

            {/* VS */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={styles.vsText}>VS</div>
            </div>

            {/* Fighter 2 */}
            <div style={styles.fighter}>
              <h2 style={styles.fighterName}>{match.fighter2.name}</h2>
              
              <div style={styles.statBar}>
                <div style={styles.statLabel}>
                  <span>❤️ HP</span>
                  <span>{match.fighter2.hp}/{match.fighter2.maxHp}</span>
                </div>
                <div style={styles.barBg}>
                  <div style={{
                    ...styles.hpBar,
                    width: `${(match.fighter2.hp / match.fighter2.maxHp) * 100}%`,
                    background: getHpColor(match.fighter2.hp, match.fighter2.maxHp),
                  }} />
                </div>
              </div>

              <div style={styles.statBar}>
                <div style={styles.statLabel}>
                  <span>⚡ Energy</span>
                  <span>{match.fighter2.energy}/{match.fighter2.maxEnergy}</span>
                </div>
                <div style={styles.barBg}>
                  <div style={{
                    ...styles.energyBar,
                    width: `${(match.fighter2.energy / match.fighter2.maxEnergy) * 100}%`,
                  }} />
                </div>
              </div>

              {currentTurn && (
                <>
                  <div style={styles.thoughtBubble}>
                    <div style={styles.thoughtLabel}>💭 Thinking...</div>
                    <div style={styles.thoughtText}>"{currentTurn.fighter2.thinking}"</div>
                    <span style={styles.moveTag}>{currentTurn.fighter2.move}</span>
                  </div>
                  {currentTurn.fighter2.trashTalk && (
                    <div style={styles.trashTalk}>
                      🗣️ "{currentTurn.fighter2.trashTalk}"
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Turn History */}
          <div style={styles.turnHistory} ref={historyRef}>
            <h3 style={{ marginBottom: '15px' }}>📜 Battle Log</h3>
            {match.turns.map((turn, i) => (
              <div key={i} style={styles.turnItem}>
                <strong>Turn {turn.turn}:</strong><br />
                {turn.fighter1.result.description}<br />
                {turn.fighter2.result.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {!match && !isLoading && (
        <div style={{ textAlign: 'center', color: '#888', marginTop: '50px' }}>
          <p style={{ fontSize: '24px', marginBottom: '20px' }}>⬆️ Select fighters and start the match! ⬆️</p>
          <p>Watch AI bots battle with visible thinking and trash talk!</p>
        </div>
      )}
    </div>
  );
}

export default App;
