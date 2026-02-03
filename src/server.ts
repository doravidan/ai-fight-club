// API Server for AI Fight Club v2 (Pokemon Style)

import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import { runMatch, MatchEvent, TeamConfig } from './match/runner.js';
import type { MatchState } from './engine/types.js';
import { registerArenaRoutes } from './arena/routes.js';
import { registerBrowserArenaRoutes } from './arena/browser-routes.js';
import { registerAgentRoutes } from './arena/agent-routes.js';
import { registerSocialRoutes } from './store/routes.js';

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });

const activeMatches = new Map<string, MatchState>();
const matchSubscribers = new Map<string, Set<(event: MatchEvent) => void>>();
const liveMatchIds = new Set<string>(); // Track matches currently in progress

// List available teams
fastify.get('/api/teams', async () => {
  const botsDir = './bots';
  const files = readdirSync(botsDir).filter(f => f.startsWith('team-') && f.endsWith('.json'));
  const teams = files.map(f => {
    const config = JSON.parse(readFileSync(`${botsDir}/${f}`, 'utf-8')) as TeamConfig;
    return {
      id: f.replace('.json', ''),
      teamName: config.teamName,
      personality: config.personality.slice(0, 80) + '...',
      fighters: config.fighters.map(fig => ({
        name: fig.name,
        type: fig.type,
        maxHp: fig.maxHp,
      })),
    };
  });
  return { teams };
});

// Also keep /api/bots for backward compatibility
fastify.get('/api/bots', async () => {
  const botsDir = './bots';
  const files = readdirSync(botsDir).filter(f => f.endsWith('.json'));
  const bots = files.map(f => {
    const config = JSON.parse(readFileSync(`${botsDir}/${f}`, 'utf-8'));
    return {
      id: f.replace('.json', ''),
      name: config.teamName || config.name,
      type: 'team',
    };
  });
  return { bots };
});

// Start a new match
fastify.post<{
  Body: { team1: string; team2: string };
}>('/api/match/start', async (request, reply) => {
  const { team1, team2 } = request.body;

  try {
    const team1Config: TeamConfig = JSON.parse(readFileSync(`./bots/${team1}.json`, 'utf-8'));
    const team2Config: TeamConfig = JSON.parse(readFileSync(`./bots/${team2}.json`, 'utf-8'));

    const matchId = `match_${Date.now()}`;
    
    // Track as live match
    liveMatchIds.add(matchId);
    
    runMatch(team1Config, team2Config, (event) => {
      if (event.type === 'start' || event.type === 'end') {
        activeMatches.set(matchId, event.data as MatchState);
      }
      
      // Remove from live when finished
      if (event.type === 'end') {
        liveMatchIds.delete(matchId);
      }
      
      const subscribers = matchSubscribers.get(matchId);
      if (subscribers) {
        subscribers.forEach(callback => callback(event));
      }
    }).then(result => {
      activeMatches.set(matchId, result);
      liveMatchIds.delete(matchId);
    });

    return { matchId, status: 'started' };
  } catch (error) {
    reply.status(400);
    return { error: 'Failed to start match', details: String(error) };
  }
});

// Get live matches for spectating
fastify.get('/api/matches/live', async () => {
  const liveMatches = Array.from(liveMatchIds).map(id => {
    const match = activeMatches.get(id);
    if (!match) return null;
    return {
      id,
      player1: match.player1.name,
      player2: match.player2.name,
      player1Knockouts: match.player1.knockouts,
      player2Knockouts: match.player2.knockouts,
      currentTurn: match.currentTurn,
      status: match.status,
      spectators: matchSubscribers.get(id)?.size || 0
    };
  }).filter(Boolean);
  
  return { 
    count: liveMatches.length,
    matches: liveMatches 
  };
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

  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  const sendEvent = (event: MatchEvent) => {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  matchSubscribers.get(matchId)!.add(sendEvent);

  const currentMatch = activeMatches.get(matchId);
  if (currentMatch) {
    sendEvent({ type: 'start', data: currentMatch });
  }

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
        player1: match.player1.name,
        player2: match.player2.name,
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
fastify.get('/health', async () => ({ status: 'ok', version: '3.0-arena' }));

// Serve claim page
fastify.get('/claim/:token', async (request, reply) => {
  const claimPagePath = join(__dirname, 'claim-page.html');
  if (existsSync(claimPagePath)) {
    const html = readFileSync(claimPagePath, 'utf-8');
    reply.type('text/html').send(html);
  } else {
    // Fallback: serve from src during development
    const srcPath = join(__dirname, '..', 'src', 'claim-page.html');
    if (existsSync(srcPath)) {
      const html = readFileSync(srcPath, 'utf-8');
      reply.type('text/html').send(html);
    } else {
      reply.status(404).send('Claim page not found');
    }
  }
});

// Register arena routes (bot vs bot)
await registerArenaRoutes(fastify);
await registerBrowserArenaRoutes(fastify);

// Register agent routes (Moltbook-style registration)
await registerAgentRoutes(fastify);

// Register social features (activity, challenges, following, comments, etc.)
await registerSocialRoutes(fastify);

// Serve static files in production
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  await fastify.register(fastifyStatic, {
    root: distPath,
    prefix: '/',
  });
  
  // SPA fallback
  fastify.setNotFoundHandler((req, reply) => {
    if (!req.url.startsWith('/api')) {
      return reply.sendFile('index.html');
    }
    reply.status(404).send({ error: 'Not found' });
  });
}

// Start server
const PORT = parseInt(process.env.PORT || '3001');
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🎴 AI Fight Club v2 running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
