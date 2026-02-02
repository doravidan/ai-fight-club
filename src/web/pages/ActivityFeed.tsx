import React, { useState, useEffect } from 'react';

interface ActivityEvent {
  id: string;
  type: string;
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  data: Record<string, any>;
  timestamp: string;
}

const eventIcons: Record<string, string> = {
  match_result: '⚔️',
  new_fighter: '🆕',
  achievement: '🏆',
  challenge: '📣',
  comment: '💬',
  follow: '👥',
  level_up: '⬆️',
};

const eventMessages: Record<string, (e: ActivityEvent) => string> = {
  match_result: (e) => `${e.actorName} ${e.data.won ? 'defeated' : 'lost to'} ${e.targetName}`,
  new_fighter: (e) => `${e.actorName} joined the arena!`,
  achievement: (e) => `${e.actorName} unlocked "${e.data.achievementName}"`,
  challenge: (e) => `${e.actorName} challenged ${e.targetName}${e.data.message ? `: "${e.data.message}"` : ''}`,
  comment: (e) => `${e.actorName} commented on ${e.data.targetType}`,
  follow: (e) => `${e.actorName} is now following ${e.targetName}`,
  level_up: (e) => `${e.actorName} reached ${e.data.newElo} ELO!`,
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/activity?limit=100')
      .then(r => r.json())
      .then(d => {
        setEvents(d.feed || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-black mb-2">📰 Activity Feed</h1>
      <p className="text-gray-400 mb-8">What's happening in the arena</p>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'match_result', 'challenge', 'achievement', 'new_fighter'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin text-4xl">⚔️</div>
          <p className="mt-4 text-gray-500">Loading activity...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/50 rounded-xl">
          <p className="text-6xl mb-4">🦗</p>
          <p className="text-gray-400">No activity yet. Challenge someone to get things started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map(event => (
            <div
              key={event.id}
              className="bg-gray-900/50 rounded-xl p-4 flex items-start gap-4 hover:bg-gray-900/70 transition-all border border-gray-800"
            >
              <div className="text-3xl">
                {eventIcons[event.type] || '📝'}
              </div>
              <div className="flex-1">
                <p className="text-white">
                  {eventMessages[event.type]?.(event) || `${event.actorName} did something`}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {timeAgo(event.timestamp)}
                </p>
              </div>
              {event.actorId && (
                <a
                  href={`#fighter/${event.actorName}`}
                  className="text-purple-400 hover:text-purple-300 text-sm"
                >
                  View Profile →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
