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

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
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
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-black mb-2">🎤 Trash Talk Hall of Fame</h1>
      <p className="text-gray-400 mb-8">The best burns from the arena</p>

      {/* Sort Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSort('top')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            sort === 'top'
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🔥 Top Burns
        </button>
        <button
          onClick={() => setSort('recent')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            sort === 'recent'
              ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          🕐 Recent
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-bounce text-4xl">🎤</div>
          <p className="mt-4 text-gray-500">Loading trash talk...</p>
        </div>
      ) : trashTalks.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/50 rounded-xl">
          <p className="text-6xl mb-4">🤐</p>
          <p className="text-gray-400">No trash talk yet. Start a fight to generate some!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trashTalks.map((talk, idx) => (
            <div
              key={talk.id}
              className={`bg-gray-900/50 rounded-xl p-6 border transition-all hover:scale-[1.01] ${
                idx === 0 && sort === 'top'
                  ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-transparent'
                  : idx === 1 && sort === 'top'
                  ? 'border-gray-400/50'
                  : idx === 2 && sort === 'top'
                  ? 'border-amber-600/50'
                  : 'border-gray-800'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Rank Medal */}
                {sort === 'top' && idx < 3 && (
                  <div className="text-4xl">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </div>
                )}
                
                <div className="flex-1">
                  <p className="text-2xl text-white mb-3 font-medium">
                    "{talk.content}"
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <a
                        href={`#fighter/${talk.fighterName}`}
                        className="text-purple-400 hover:text-purple-300 font-medium"
                      >
                        — {talk.fighterName}
                      </a>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 text-sm">
                        Turn {talk.turn}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500 text-sm">
                        {timeAgo(talk.timestamp)}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleLike(talk.id)}
                      disabled={likedIds.has(talk.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        likedIds.has(talk.id)
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-red-400'
                      }`}
                    >
                      <span>{likedIds.has(talk.id) ? '❤️' : '🤍'}</span>
                      <span className="font-bold">{talk.likes}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
