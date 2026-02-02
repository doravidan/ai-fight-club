import React, { useState, useEffect } from 'react';

interface Bot {
  id: string;
  name: string;
  elo: number;
}

interface GameState {
  matchId: string;
  turn: number;
  yourFighter: any;
  enemyFighter: any;
  yourEnergy: number;
  yourBench: any[];
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
  lastEvents: string[];
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '15px',
    padding: '20px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: '16px',
    marginBottom: '10px',
  },
  button: {
    width: '100%',
    padding: '15px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(90deg, #FF6B35, #F7D02C)',
    color: '#000',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
  },
  actionButton: {
    flex: 1,
    padding: '20px',
    borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'all 0.2s',
  },
  actionButtonHover: {
    background: 'rgba(255,255,255,0.15)',
    borderColor: '#F7D02C',
  },
  fighter: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    padding: '15px',
    marginBottom: '15px',
  },
  hpBar: {
    height: '20px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  hpFill: {
    height: '100%',
    background: '#4ade80',
    transition: 'width 0.3s',
  },
  events: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '10px',
    padding: '15px',
    maxHeight: '200px',
    overflowY: 'auto' as const,
  },
  waiting: {
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '20px',
  },
  leaderboard: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '10px',
    padding: '15px',
  },
  leaderboardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
};

export default function Arena() {
  const [bot, setBot] = useState<Bot | null>(null);
  const [name, setName] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'registering' | 'queuing' | 'playing'>('idle');
  const [message, setMessage] = useState('');

  // Load leaderboard
  useEffect(() => {
    fetch('/api/arena/leaderboard')
      .then(res => res.json())
      .then(data => setLeaderboard(data.leaderboard || []))
      .catch(() => {});
  }, []);

  // Poll for game state when playing
  useEffect(() => {
    if (status !== 'playing' || !gameState?.matchId) return;
    
    const interval = setInterval(() => {
      fetch(`/api/arena/match/${gameState.matchId}/state?botId=${bot?.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'finished') {
            setGameState(prev => ({ ...prev!, status: 'finished', winner: data.winner }));
            setStatus('idle');
          } else {
            setGameState(data);
          }
        })
        .catch(() => {});
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status, gameState?.matchId, bot?.id]);

  const register = async () => {
    if (!name.trim()) return;
    setStatus('registering');
    
    try {
      const res = await fetch('/api/arena/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, callbackUrl: 'browser' })
      });
      const data = await res.json();
      setBot({ id: data.botId, name: data.name, elo: data.elo });
      setMessage(`Registered! ELO: ${data.elo}`);
      setStatus('idle');
    } catch (error) {
      setMessage('Registration failed');
      setStatus('idle');
    }
  };

  const findMatch = async () => {
    if (!bot) return;
    setStatus('queuing');
    setMessage('Looking for opponent...');
    
    try {
      const res = await fetch('/api/arena/queue/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId: bot.id })
      });
      const data = await res.json();
      
      // Poll for match start
      const checkMatch = setInterval(async () => {
        const matchRes = await fetch(`/api/arena/bot/${bot.id}/current-match`);
        const matchData = await matchRes.json();
        
        if (matchData.matchId) {
          clearInterval(checkMatch);
          setGameState({
            matchId: matchData.matchId,
            turn: matchData.turn,
            yourFighter: matchData.yourFighter,
            enemyFighter: matchData.enemyFighter,
            yourEnergy: matchData.yourEnergy,
            yourBench: matchData.yourBench || [],
            status: 'playing',
            lastEvents: []
          });
          setStatus('playing');
          setMessage('Match found!');
        }
      }, 1000);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkMatch);
        if (status === 'queuing') {
          setStatus('idle');
          setMessage('No opponent found. Try again!');
        }
      }, 30000);
      
    } catch (error) {
      setMessage('Failed to join queue');
      setStatus('idle');
    }
  };

  const doAction = async (action: string) => {
    if (!gameState || !bot) return;
    
    try {
      const res = await fetch('/api/arena/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: gameState.matchId,
          botId: bot.id,
          action
        })
      });
      const data = await res.json();
      setGameState(prev => ({
        ...prev!,
        ...data,
        lastEvents: data.events || []
      }));
    } catch (error) {
      setMessage('Action failed');
    }
  };

  // Registration screen
  if (!bot) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>🏟️ Arena Mode</h1>
          <p style={{ textAlign: 'center', marginBottom: '20px', color: '#888' }}>
            Register your bot and compete against others!
          </p>
          <input
            style={styles.input}
            placeholder="Enter your bot name..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && register()}
          />
          <button 
            style={{ ...styles.button, opacity: status === 'registering' ? 0.5 : 1 }}
            onClick={register}
            disabled={status === 'registering'}
          >
            {status === 'registering' ? '⏳ Registering...' : '🤖 Register Bot'}
          </button>
          {message && <p style={{ textAlign: 'center', marginTop: '15px' }}>{message}</p>}
        </div>
        
        <div style={styles.card}>
          <h2 style={{ marginBottom: '15px' }}>🏆 Leaderboard</h2>
          <div style={styles.leaderboard}>
            {leaderboard.map((entry, i) => (
              <div key={i} style={styles.leaderboardRow}>
                <span>#{entry.rank} {entry.name}</span>
                <span>{entry.elo} ELO ({entry.winRate})</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <p style={{ color: '#888', textAlign: 'center' }}>No bots registered yet</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Waiting/Queue screen
  if (status === 'idle' || status === 'queuing') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>🤖 {bot.name}</h1>
          <p style={{ textAlign: 'center', color: '#888' }}>ELO: {bot.elo}</p>
          
          {status === 'queuing' ? (
            <div style={styles.waiting}>
              <p>⏳ Looking for opponent...</p>
              <p style={{ fontSize: '14px', color: '#888', marginTop: '10px' }}>
                This may take a moment
              </p>
            </div>
          ) : (
            <button style={styles.button} onClick={findMatch}>
              ⚔️ Find Match
            </button>
          )}
          
          {message && <p style={{ textAlign: 'center', marginTop: '15px' }}>{message}</p>}
        </div>
        
        <div style={styles.card}>
          <h2 style={{ marginBottom: '15px' }}>🏆 Leaderboard</h2>
          <div style={styles.leaderboard}>
            {leaderboard.map((entry, i) => (
              <div key={i} style={styles.leaderboardRow}>
                <span>#{entry.rank} {entry.name}</span>
                <span>{entry.elo} ELO</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  if (status === 'playing' && gameState) {
    const isFinished = gameState.status === 'finished';
    
    return (
      <div style={styles.container}>
        {isFinished && (
          <div style={{
            ...styles.card,
            background: gameState.winner === bot.name 
              ? 'linear-gradient(90deg, #4ade80, #22c55e)' 
              : 'linear-gradient(90deg, #ef4444, #dc2626)',
            textAlign: 'center',
          }}>
            <h1 style={{ fontSize: '32px', color: '#fff' }}>
              {gameState.winner === bot.name ? '🏆 YOU WIN!' : '💀 YOU LOSE'}
            </h1>
            <button 
              style={{ ...styles.button, background: '#fff', color: '#000', marginTop: '15px' }}
              onClick={() => { setGameState(null); setStatus('idle'); }}
            >
              Play Again
            </button>
          </div>
        )}
        
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>Turn {gameState.turn}</span>
            <span>⚡ Energy: {gameState.yourEnergy}/5</span>
          </div>
          
          {/* Your Fighter */}
          <div style={styles.fighter}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>🟢 {gameState.yourFighter?.name}</strong>
              <span>{gameState.yourFighter?.hp}/{gameState.yourFighter?.maxHp} HP</span>
            </div>
            <div style={styles.hpBar}>
              <div style={{
                ...styles.hpFill,
                width: `${(gameState.yourFighter?.hp / gameState.yourFighter?.maxHp) * 100}%`
              }} />
            </div>
          </div>
          
          {/* Enemy Fighter */}
          <div style={styles.fighter}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>🔴 {gameState.enemyFighter?.name}</strong>
              <span>{gameState.enemyFighter?.hp}/{gameState.enemyFighter?.maxHp} HP</span>
            </div>
            <div style={styles.hpBar}>
              <div style={{
                ...styles.hpFill,
                width: `${(gameState.enemyFighter?.hp / gameState.enemyFighter?.maxHp) * 100}%`,
                background: '#ef4444'
              }} />
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {!isFinished && (
          <div style={styles.card}>
            <h3 style={{ marginBottom: '15px' }}>Choose Action:</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {gameState.yourFighter?.attacks?.map((atk: any, i: number) => (
                <button
                  key={i}
                  style={{
                    ...styles.actionButton,
                    opacity: gameState.yourEnergy >= atk.cost ? 1 : 0.5
                  }}
                  onClick={() => doAction(`ATTACK_${i + 1}`)}
                  disabled={gameState.yourEnergy < atk.cost}
                >
                  <div style={{ fontWeight: 'bold' }}>{atk.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    {atk.cost}⚡ → {atk.damage} dmg
                  </div>
                </button>
              ))}
              <button style={styles.actionButton} onClick={() => doAction('PASS')}>
                <div style={{ fontWeight: 'bold' }}>Pass</div>
                <div style={{ fontSize: '12px', color: '#888' }}>Skip turn</div>
              </button>
            </div>
          </div>
        )}
        
        {/* Events Log */}
        <div style={styles.card}>
          <h3 style={{ marginBottom: '10px' }}>📜 Battle Log</h3>
          <div style={styles.events}>
            {gameState.lastEvents?.map((event, i) => (
              <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {event}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
