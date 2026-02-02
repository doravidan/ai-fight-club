// API Server for AI Fight Club

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { readFileSync, readdirSync } from 'fs';
import { runMatch, MatchEvent } from './match/runner.js';
import type { BotConfig, MatchState } from './engine/types.js';

const fastify = Fastify({ logger: true });

// Enable CORS
await fastify.register(cors, { origin: true });

// Store active matches for SSE
const activeMatches = new Map<string, MatchState>();
const matchSubscribers = new Map<string, Set<(event: MatchEvent) => void>>();

// List available bots
fastify.get('/api/bots', async () => {
  const botsDir = './bots';
  const files = readdirSync(botsDir).filter(f => f.endsWith('.json'));
  const bots = files.map(f => {
    const config = JSON.parse(readFileSync(`${botsDir}/${f}`, 'utf-8')) as BotConfig;
    return {
      id: f.replace('.json', ''),
      name: config.name,
      personality: config.personality.slice(0, 100) + '...',
      specialName: config.specialName,
    };
  });
  return { bots };
});

// Start a new match
fastify.post<{
  Body: { bot1: string; bot2: string };
}>('/api/match/start', async (request, reply) => {
  const { bot1, bot2 } = request.body;

  try {
    const bot1Config: BotConfig = JSON.parse(readFileSync(`./bots/${bot1}.json`, 'utf-8'));
    const bot2Config: BotConfig = JSON.parse(readFileSync(`./bots/${bot2}.json`, 'utf-8'));

    const matchId = `match_${Date.now()}`;
    
    // Run match in background and emit events
    runMatch(bot1Config, bot2Config, (event) => {
      if (event.type === 'start' || event.type === 'end') {
        activeMatches.set(matchId, event.data as MatchState);
      }
      
      // Notify all subscribers
      const subscribers = matchSubscribers.get(matchId);
      if (subscribers) {
        subscribers.forEach(callback => callback(event));
      }
    }).then(result => {
      activeMatches.set(matchId, result);
    });

    return { matchId, status: 'started' };
  } catch (error) {
    reply.status(400);
    return { error: 'Failed to start match', details: String(error) };
  }
});

// Get match state
fastify.get<{
  Params: { id: string };
}>('/api/match/:id', async (request, reply) => {
  const match = activeMatches.get(request.params.id);
  if (!match) {
    reply.status(404);
    return { error: 'Match not found' };
  }
  return match;
});

// SSE endpoint for live match updates
fastify.get<{
  Params: { id: string };
}>('/api/match/:id/stream', async (request, reply) => {
  const matchId = request.params.id;

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Create subscriber set if doesn't exist
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  const sendEvent = (event: MatchEvent) => {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  matchSubscribers.get(matchId)!.add(sendEvent);

  // Send current state if match exists
  const currentMatch = activeMatches.get(matchId);
  if (currentMatch) {
    sendEvent({ type: 'start', data: currentMatch });
  }

  // Cleanup on disconnect
  request.raw.on('close', () => {
    matchSubscribers.get(matchId)?.delete(sendEvent);
  });
});

// Get list of past matches
fastify.get('/api/matches', async () => {
  try {
    const matchesDir = './matches';
    const files = readdirSync(matchesDir).filter(f => f.endsWith('.json'));
    const matches = files.map(f => {
      const match = JSON.parse(readFileSync(`${matchesDir}/${f}`, 'utf-8')) as MatchState;
      return {
        id: match.id,
        fighter1: match.fighter1.name,
        fighter2: match.fighter2.name,
        winner: match.winner,
        turns: match.turns.length,
        date: match.startedAt,
      };
    }).reverse();
    return { matches };
  } catch {
    return { matches: [] };
  }
});

// Health check
fastify.get('/health', async () => ({ status: 'ok' }));

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🥊 AI Fight Club API running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
