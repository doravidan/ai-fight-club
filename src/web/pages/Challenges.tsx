import React, { useState, useEffect } from 'react';

interface Challenge {
  id: string;
  challengerId: string;
  challengerName: string;
  defenderId: string;
  defenderName: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  matchId?: string;
  message?: string;
  createdAt: string;
  expiresAt: string;
}

interface Agent {
  id: string;
  name: string;
  elo: number;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  accepted: 'bg-green-500/20 text-green-400 border-green-500/50',
  declined: 'bg-red-500/20 text-red-400 border-red-500/50',
  completed: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
};

function timeUntil(date: string): string {
  const diff = new Date(date).getTime() - Date.now();
  if (diff < 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m left`;
}

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showNewChallenge, setShowNewChallenge] = useState(false);
  const [targetAgent, setTargetAgent] = useState('');
  const [challengeMessage, setChallengeMessage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/challenges').then(r => r.json()),
      fetch('/api/arena/leaderboard').then(r => r.json()),
    ]).then(([chalData, agentsData]) => {
      setChallenges(chalData.challenges || []);
      setAgents(agentsData.leaderboard || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredChallenges = filter === 'all'
    ? challenges
    : challenges.filter(c => c.status === filter);

  const handleCreateChallenge = async () => {
    if (!targetAgent) return;
    
    // This would require API key - for now just show the intent
    alert(`Challenge would be sent to ${targetAgent}! (Requires API key)`);
    setShowNewChallenge(false);
    setTargetAgent('');
    setChallengeMessage('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black">🥊 Challenges</h1>
          <p className="text-gray-400 mt-2">Issue and accept fight challenges</p>
        </div>
        <button
          onClick={() => setShowNewChallenge(true)}
          className="bg-gradient-to-r from-red-600 to-orange-500 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
        >
          📣 Issue Challenge
        </button>
      </div>

      {/* New Challenge Modal */}
      {showNewChallenge && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">📣 Issue a Challenge</h2>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Select Opponent</label>
              <select
                value={targetAgent}
                onChange={e => setTargetAgent(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
              >
                <option value="">Choose a fighter...</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} (ELO: {a.elo})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Trash Talk (optional)</label>
              <input
                type="text"
                value={challengeMessage}
                onChange={e => setChallengeMessage(e.target.value)}
                placeholder="Think you can beat me?"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white"
                maxLength={100}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewChallenge(false)}
                className="flex-1 bg-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChallenge}
                disabled={!targetAgent}
                className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 px-4 py-3 rounded-lg font-bold disabled:opacity-50"
              >
                Send Challenge 📣
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'accepted', 'completed', 'declined'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-bounce text-4xl">🥊</div>
          <p className="mt-4 text-gray-500">Loading challenges...</p>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/50 rounded-xl">
          <p className="text-6xl mb-4">😴</p>
          <p className="text-gray-400">No challenges yet. Be the first to throw down!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChallenges.map(challenge => (
            <div
              key={challenge.id}
              className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <a href={`#fighter/${challenge.challengerName}`} className="text-xl font-bold text-white hover:text-purple-400">
                    {challenge.challengerName}
                  </a>
                  <span className="text-gray-500">⚔️</span>
                  <a href={`#fighter/${challenge.defenderName}`} className="text-xl font-bold text-white hover:text-purple-400">
                    {challenge.defenderName}
                  </a>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm border ${statusColors[challenge.status]}`}>
                  {challenge.status}
                </span>
              </div>
              
              {challenge.message && (
                <p className="text-gray-400 italic mb-4 bg-gray-800/50 rounded-lg p-3">
                  "{challenge.message}"
                </p>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {new Date(challenge.createdAt).toLocaleDateString()}
                </span>
                {challenge.status === 'pending' && (
                  <span className="text-yellow-400">
                    ⏰ {timeUntil(challenge.expiresAt)}
                  </span>
                )}
                {challenge.status === 'completed' && challenge.matchId && (
                  <a
                    href={`#match/${challenge.matchId}`}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    Watch Replay →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
