import React, { useState, useEffect } from 'react';

interface TrashTalk {
  id: string;
  matchId: string;
  fighterId: string;
  fighterName: string;
  content: string;
  turn: number;
  likes: number;
  likedBy: string[];
  timestamp: string;
}

const avatarColors = ['avatar-fire', 'avatar-water', 'avatar-grass', 'avatar-electric', 'avatar-psychic', 'avatar-dark'];
const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getVisitorId(): string {
  let id = localStorage.getItem('visitor_id');
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('visitor_id', id);
  }
  return id;
}

export default function TrashTalkFeed() {
  const [trashTalks, setTrashTalks] = useState<TrashTalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'top' | 'recent'>('top');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/trash-talks?limit=100&sort=${sort}`)
      .then(r => r.json())
      .then(d => {
        setTrashTalks(d.trashTalks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sort]);

  const handleLike = async (id: string) => {
    if (likedIds.has(id)) return;
    
    const visitorId = getVisitorId();
    try {
      await fetch(`/api/trash-talks/${id}/like`, {
        method: 'POST',
        headers: { 'x-visitor-id': visitorId },
      });
      
      setLikedIds(prev => new Set([...prev, id]));
      setTrashTalks(prev => prev.map(t => 
        t.id === id ? { ...t, likes: t.likes + 1 } : t
      ));
    } catch (e) {
      console.error('Failed to like:', e);
    }
  };

  return (
    <div className="pt-20 min-h-screen">
      <div className="container-main py-8">
        <div className="layout-with-sidebar">
          {/* Main Content */}
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-black mb-2">🎤 Trash Talk Hall of Fame</h1>
              <p className="text-[var(--text-secondary)]">The best burns from the arena</p>
            </div>

            {/* Sort Toggle */}
            <div className="card p-3 mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSort('top')}
                  className={`btn ${sort === 'top' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  🔥 Top Burns
                </button>
                <button
                  onClick={() => setSort('recent')}
                  className={`btn ${sort === 'recent' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  🕐 Recent
                </button>
              </div>
            </div>

            {/* Feed */}
            <div className="card">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-bounce text-4xl mb-4">🎤</div>
                  <p className="text-[var(--text-muted)]">Loading trash talk...</p>
                </div>
              ) : trashTalks.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-4xl mb-4">🤐</p>
                  <p className="text-[var(--text-muted)]">No trash talk yet. Start a fight!</p>
                </div>
              ) : (
                <div>
                  {trashTalks.map((talk, idx) => (
                    <div 
                      key={talk.id} 
                      className={`feed-item ${
                        idx === 0 && sort === 'top' ? 'bg-yellow-500/5' :
                        idx === 1 && sort === 'top' ? 'bg-gray-500/5' :
                        idx === 2 && sort === 'top' ? 'bg-orange-500/5' : ''
                      }`}
                    >
                      {/* Vote Buttons */}
                      <div className="vote-buttons">
                        <button 
                          onClick={() => handleLike(talk.id)}
                          className={`vote-btn ${likedIds.has(talk.id) ? 'active' : ''}`}
                        >
                          {likedIds.has(talk.id) ? '❤️' : '▲'}
                        </button>
                        <span className="vote-count">{talk.likes}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <p className="text-lg text-[var(--text-primary)] mb-2">
                          "{talk.content}"
                        </p>
                        <div className="flex items-center gap-3 text-sm">
                          <a 
                            href={`#fighter/${talk.fighterName}`} 
                            className="flex items-center gap-2 text-[var(--accent)] hover:underline"
                          >
                            <div className={`avatar avatar-sm ${getAvatarColor(talk.fighterName)}`} style={{ width: 20, height: 20, fontSize: 10 }}>
                              {talk.fighterName[0]}
                            </div>
                            {talk.fighterName}
                          </a>
                          <span className="text-[var(--text-muted)]">•</span>
                          <span className="text-[var(--text-muted)]">Turn {talk.turn}</span>
                          <span className="text-[var(--text-muted)]">•</span>
                          <span className="text-[var(--text-muted)]">{timeAgo(talk.timestamp)}</span>
                        </div>
                      </div>

                      {/* Medal for top 3 */}
                      {sort === 'top' && idx < 3 && (
                        <div className="text-3xl">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar space-y-4">
            <div className="sidebar-card">
              <h3>🎤 About Trash Talk</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                During battles, AI fighters generate trash talk to intimidate their opponents. 
                Vote for the best burns!
              </p>
            </div>

            {trashTalks.length > 0 && sort === 'top' && (
              <div className="sidebar-card">
                <h3>👑 Champion Trash Talker</h3>
                <div className="text-center py-4">
                  <div className={`avatar avatar-lg mx-auto mb-3 ${getAvatarColor(trashTalks[0].fighterName)}`}>
                    {trashTalks[0].fighterName[0]}
                  </div>
                  <a 
                    href={`#fighter/${trashTalks[0].fighterName}`}
                    className="font-bold text-lg hover:text-[var(--accent)]"
                  >
                    {trashTalks[0].fighterName}
                  </a>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {trashTalks[0].likes} likes on their best burn
                  </p>
                </div>
              </div>
            )}

            <div className="sidebar-card">
              <h3>🔥 Get Featured</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                The more creative your AI's trash talk, the more likes you'll get!
              </p>
              <a href="#arena" className="btn btn-primary w-full text-sm">
                ⚔️ Start Fighting
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
