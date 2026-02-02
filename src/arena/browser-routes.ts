// Browser-based arena routes (no webhooks needed)

import { FastifyInstance } from 'fastify';
import * as arena from './arena.js';

// Store pending actions for turn-based play
const pendingActions = new Map<string, Map<string, { action: string; timestamp: number }>>();
const botMatches = new Map<string, string>(); // botId -> matchId

export async function registerBrowserArenaRoutes(fastify: FastifyInstance) {
  
  // Get current match for a bot
  fastify.get<{
    Params: { botId: string }
  }>('/api/arena/bot/:botId/current-match', async (request, reply) => {
    const matchId = botMatches.get(request.params.botId);
    if (!matchId) {
      return { matchId: null };
    }
    
    const match = arena.getMatch(matchId);
    if (!match || match.status === 'finished') {
      botMatches.delete(request.params.botId);
      return { matchId: null };
    }
    
    const isBot1 = match.bot1.id === request.params.botId;
    const myPlayer = isBot1 ? match.gameState.player1 : match.gameState.player2;
    const enemyPlayer = isBot1 ? match.gameState.player2 : match.gameState.player1;
    
    return {
      matchId: match.id,
      turn: match.currentTurn,
      status: match.status,
      yourFighter: myPlayer.active ? {
        name: myPlayer.active.name,
        type: myPlayer.active.type,
        hp: myPlayer.active.hp,
        maxHp: myPlayer.active.maxHp,
        attacks: myPlayer.active.attacks
      } : null,
      enemyFighter: enemyPlayer.active ? {
        name: enemyPlayer.active.name,
        type: enemyPlayer.active.type,
        hp: enemyPlayer.active.hp,
        maxHp: enemyPlayer.active.maxHp
      } : null,
      yourEnergy: myPlayer.energy,
      yourBench: myPlayer.bench,
      winner: match.winner
    };
  });
  
  // Submit action for current turn
  fastify.post<{
    Body: { matchId: string; botId: string; action: string }
  }>('/api/arena/action', async (request, reply) => {
    const { matchId, botId, action } = request.body;
    
    const match = arena.getMatch(matchId);
    if (!match) {
      reply.status(404);
      return { error: 'Match not found' };
    }
    
    if (match.status !== 'active') {
      return { error: 'Match not active', status: match.status };
    }
    
    // Store the action
    if (!pendingActions.has(matchId)) {
      pendingActions.set(matchId, new Map());
    }
    pendingActions.get(matchId)!.set(botId, { action, timestamp: Date.now() });
    
    // Check if both bots have submitted actions
    const actions = pendingActions.get(matchId)!;
    const bot1Action = actions.get(match.bot1.id);
    const bot2Action = actions.get(match.bot2.id);
    
    if (bot1Action && bot2Action) {
      // Process the turn (this would normally call the game engine)
      // For now, just return current state
      pendingActions.get(matchId)!.clear();
    }
    
    const isBot1 = match.bot1.id === botId;
    const myPlayer = isBot1 ? match.gameState.player1 : match.gameState.player2;
    const enemyPlayer = isBot1 ? match.gameState.player2 : match.gameState.player1;
    
    return {
      success: true,
      waitingForOpponent: !bot1Action || !bot2Action,
      turn: match.currentTurn,
      yourFighter: myPlayer.active,
      enemyFighter: enemyPlayer.active ? {
        name: enemyPlayer.active.name,
        hp: enemyPlayer.active.hp,
        maxHp: enemyPlayer.active.maxHp
      } : null,
      yourEnergy: myPlayer.energy,
      events: match.replay[match.replay.length - 1]?.events || []
    };
  });
  
  // Get match state for spectator/polling
  fastify.get<{
    Params: { id: string },
    Querystring: { botId?: string }
  }>('/api/arena/match/:id/state', async (request, reply) => {
    const match = arena.getMatch(request.params.id);
    if (!match) {
      reply.status(404);
      return { error: 'Match not found' };
    }
    
    const botId = request.query.botId;
    const isBot1 = botId === match.bot1.id;
    
    if (botId) {
      const myPlayer = isBot1 ? match.gameState.player1 : match.gameState.player2;
      const enemyPlayer = isBot1 ? match.gameState.player2 : match.gameState.player1;
      
      return {
        matchId: match.id,
        turn: match.currentTurn,
        status: match.status,
        yourFighter: myPlayer.active,
        enemyFighter: enemyPlayer.active ? {
          name: enemyPlayer.active.name,
          type: enemyPlayer.active.type,
          hp: enemyPlayer.active.hp,
          maxHp: enemyPlayer.active.maxHp
        } : null,
        yourEnergy: myPlayer.energy,
        yourBench: myPlayer.bench,
        winner: match.winner,
        events: match.replay[match.replay.length - 1]?.events || []
      };
    }
    
    // Spectator view
    return {
      matchId: match.id,
      turn: match.currentTurn,
      status: match.status,
      bot1: { name: match.bot1.name, elo: match.bot1.elo },
      bot2: { name: match.bot2.name, elo: match.bot2.elo },
      winner: match.winner
    };
  });
  
  // Override queue join to track bot-match mapping
  const originalJoin = arena.joinQueue;
  fastify.post<{
    Body: { botId: string }
  }>('/api/arena/queue/join', async (request, reply) => {
    const { botId } = request.body;
    
    if (!botId) {
      reply.status(400);
      return { error: 'botId required' };
    }
    
    const bot = arena.getBot(botId);
    if (!bot) {
      reply.status(404);
      return { error: 'Bot not found' };
    }
    
    try {
      const result = arena.joinQueue(botId);
      
      // Check if match was created immediately
      setTimeout(() => {
        // Poll for match creation
        const checkInterval = setInterval(() => {
          // Look through recent matches for this bot
          // This is a simplified approach
        }, 500);
        
        setTimeout(() => clearInterval(checkInterval), 30000);
      }, 100);
      
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
}
