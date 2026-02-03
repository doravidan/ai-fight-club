// Arena API routes - Using Turso database

import { FastifyInstance } from 'fastify';
import * as arena from './arena.js';

export async function registerArenaRoutes(fastify: FastifyInstance) {
  
  // Register a new bot or login existing one by name
  fastify.post<{
    Body: { name: string; callbackUrl: string }
  }>('/api/arena/register', async (request, reply) => {
    const { name, callbackUrl } = request.body;
    
    if (!name || !callbackUrl) {
      reply.status(400);
      return { error: 'name and callbackUrl required' };
    }
    
    try {
      const { bot, token, isNew } = await arena.registerBot(name, callbackUrl);
      return {
        botId: bot.id,
        name: bot.name,
        token,
        secret: bot.secret,
        elo: bot.elo,
        gamesPlayed: bot.gamesPlayed,
        wins: bot.wins,
        winRate: bot.gamesPlayed > 0 ? (bot.wins / bot.gamesPlayed * 100).toFixed(1) + '%' : 'N/A',
        isNew,
        message: isNew ? 'Welcome to the arena!' : `Welcome back! You have ${bot.wins} wins.`
      };
    } catch (error) {
      console.error('Registration error:', error);
      reply.status(500);
      return { error: 'Failed to register bot' };
    }
  });
  
  // Get bot info
  fastify.get<{
    Params: { id: string }
  }>('/api/arena/bot/:id', async (request, reply) => {
    const bot = await arena.getBot(request.params.id);
    if (!bot) {
      reply.status(404);
      return { error: 'Bot not found' };
    }
    return {
      id: bot.id,
      name: bot.name,
      elo: bot.elo,
      gamesPlayed: bot.gamesPlayed,
      wins: bot.wins,
      winRate: bot.gamesPlayed > 0 ? (bot.wins / bot.gamesPlayed * 100).toFixed(1) + '%' : 'N/A'
    };
  });
  
  // Get leaderboard
  fastify.get<{
    Querystring: { limit?: string }
  }>('/api/arena/leaderboard', async (request) => {
    const limit = parseInt(request.query.limit || '10');
    const leaderboard = await arena.getLeaderboard(limit);
    
    return {
      leaderboard: leaderboard.map((bot, index) => ({
        rank: index + 1,
        name: bot.name,
        elo: bot.elo,
        gamesPlayed: bot.gamesPlayed,
        wins: bot.wins,
        winRate: bot.gamesPlayed > 0 ? (bot.wins / bot.gamesPlayed * 100).toFixed(1) + '%' : 'N/A',
        owner: bot.ownerTwitterHandle,
        verified: bot.status === 'claimed' || bot.status === 'active'
      }))
    };
  });
  
  // Join matchmaking queue
  fastify.post<{
    Body: { botId: string }
  }>('/api/arena/queue/join', async (request, reply) => {
    const { botId } = request.body;
    
    if (!botId) {
      reply.status(400);
      return { error: 'botId required' };
    }
    
    try {
      const result = await arena.joinQueue(botId);
      return {
        status: 'queued',
        position: result.position,
        message: result.position === 1 
          ? 'Waiting for opponent...' 
          : `Position ${result.position} in queue`
      };
    } catch (error: any) {
      reply.status(400);
      return { error: error.message };
    }
  });
  
  // Leave queue
  fastify.post<{
    Body: { botId: string }
  }>('/api/arena/queue/leave', async (request) => {
    const { botId } = request.body;
    arena.leaveQueue(botId);
    return { status: 'left queue' };
  });
  
  // Get queue status
  fastify.get('/api/arena/queue/status', async () => {
    return arena.getQueueStatus();
  });
  
  // Get match info
  fastify.get<{
    Params: { id: string }
  }>('/api/arena/match/:id', async (request, reply) => {
    const match = arena.getMatch(request.params.id);
    if (!match) {
      reply.status(404);
      return { error: 'Match not found' };
    }
    
    return {
      id: match.id,
      status: match.status,
      currentTurn: match.currentTurn,
      bot1: { name: match.bot1.name, elo: match.bot1.elo },
      bot2: { name: match.bot2.name, elo: match.bot2.elo },
      winner: match.winner,
      turnsPlayed: match.replay.length
    };
  });
  
  // Get match replay
  fastify.get<{
    Params: { id: string }
  }>('/api/arena/match/:id/replay', async (request, reply) => {
    const match = arena.getMatch(request.params.id);
    if (!match) {
      reply.status(404);
      return { error: 'Match not found' };
    }
    
    return {
      id: match.id,
      bot1: match.bot1.name,
      bot2: match.bot2.name,
      winner: match.winner,
      replay: match.replay
    };
  });
  
  // Arena stats
  fastify.get('/api/arena/stats', async () => {
    return await arena.getGlobalStats();
  });
  
  // Match history
  fastify.get<{
    Querystring: { limit?: string }
  }>('/api/arena/matches', async (request) => {
    const limit = parseInt(request.query.limit || '50');
    const matches = await arena.getAllMatches(limit);
    
    return {
      matches: matches.map(m => ({
        id: m.id,
        player1: m.bot1.name,
        player2: m.bot2.name,
        winner: m.winner ? (m.winner === m.bot1.id ? m.bot1.name : m.bot2.name) : 'Draw',
        createdAt: m.createdAt,
        turnsPlayed: m.replay?.length || 0
      }))
    };
  });
  
  // Bot match history
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string }
  }>('/api/arena/bot/:id/matches', async (request, reply) => {
    const bot = await arena.getBot(request.params.id);
    if (!bot) {
      reply.status(404);
      return { error: 'Bot not found' };
    }
    
    const limit = parseInt(request.query.limit || '20');
    const matches = await arena.getBotMatches(request.params.id, limit);
    
    return {
      bot: bot.name,
      matches: matches.map(m => ({
        id: m.id,
        opponent: m.bot1.id === bot.id ? m.bot2.name : m.bot1.name,
        result: m.winner === bot.id ? 'win' : m.winner ? 'loss' : 'draw',
        createdAt: m.createdAt
      }))
    };
  });
  
  // All bots (for discovery)
  fastify.get<{
    Querystring: { limit?: string }
  }>('/api/arena/bots', async (request) => {
    const limit = parseInt(request.query.limit || '100');
    const bots = await arena.getAllBots();
    
    return {
      bots: bots.slice(0, limit).map(bot => ({
        id: bot.id,
        name: bot.name,
        elo: bot.elo,
        gamesPlayed: bot.gamesPlayed,
        wins: bot.wins,
        winRate: bot.gamesPlayed > 0 ? (bot.wins / bot.gamesPlayed * 100).toFixed(1) + '%' : 'N/A',
        createdAt: bot.createdAt
      }))
    };
  });
}
