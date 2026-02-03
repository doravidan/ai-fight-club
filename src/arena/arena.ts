// Arena service - matchmaking, game execution, rankings
// Using Turso database for persistence

import crypto from 'crypto';
import * as botsDb from '../db/bots.js';
import * as matchesDb from '../db/matches.js';
import {
  RegisteredBot, ArenaMatch, WebhookPayload, BotResponse,
  GameStateForBot, TurnRecord, calculateEloChange
} from './types.js';
import { TeamConfig } from '../match/runner.js';
import { FighterCard, Player } from '../engine/types.js';
import { processTurn, checkWinner } from '../engine/combat.js';

// In-memory queue and active matches (these don't need persistence)
const matchQueue: string[] = [];
const activeMatches = new Map<string, ArenaMatch>();
const botCache = new Map<string, RegisteredBot>();

// Default team for bots
const DEFAULT_TEAM: TeamConfig = {
  teamName: 'Default Team',
  personality: 'A balanced fighter',
  fighters: [
    {
      id: 'fighter-1',
      name: 'Starter',
      type: 'normal',
      maxHp: 100,
      hp: 100,
      weakness: 'fighting',
      retreatCost: 1,
      personality: 'Ready to fight!',
      catchphrase: 'Let\'s go!',
      attacks: [
        { name: 'Strike', energyCost: 1, damage: 30, description: 'Basic attack' },
        { name: 'Power Hit', energyCost: 2, damage: 60, description: 'Strong attack' }
      ]
    } as FighterCard
  ]
};

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Convert DB bot to RegisteredBot
function toRegisteredBot(dbBot: botsDb.Bot): RegisteredBot {
  return {
    id: dbBot.id,
    name: dbBot.name,
    callbackUrl: dbBot.callback_url,
    secret: dbBot.secret,
    elo: dbBot.elo,
    gamesPlayed: dbBot.games_played,
    wins: dbBot.wins,
    createdAt: new Date(dbBot.created_at)
  };
}

// Register a new bot or return existing
export async function registerBot(name: string, callbackUrl: string): Promise<{ bot: RegisteredBot; token: string; isNew: boolean }> {
  const { bot, token, isNew } = await botsDb.registerBot(name, callbackUrl);
  const registeredBot = toRegisteredBot(bot);
  botCache.set(bot.id, registeredBot);
  return { bot: registeredBot, token, isNew };
}

// Get bot by ID
export async function getBot(id: string): Promise<RegisteredBot | undefined> {
  // Check cache first
  if (botCache.has(id)) {
    return botCache.get(id);
  }
  const bot = await botsDb.getBot(id);
  if (bot) {
    const registeredBot = toRegisteredBot(bot);
    botCache.set(id, registeredBot);
    return registeredBot;
  }
  return undefined;
}

// Get bot by name
export async function getBotByName(name: string): Promise<RegisteredBot | undefined> {
  const bot = await botsDb.getBotByName(name);
  return bot ? toRegisteredBot(bot) : undefined;
}

// Get all bots
export async function getAllBots(): Promise<RegisteredBot[]> {
  const bots = await botsDb.getAllBots();
  return bots.map(toRegisteredBot);
}

// Get leaderboard
export async function getLeaderboard(limit: number = 10): Promise<RegisteredBot[]> {
  const bots = await botsDb.getLeaderboard(limit);
  return bots.map(toRegisteredBot);
}

// Get all matches
export async function getAllMatches(limit: number = 100): Promise<any[]> {
  const matches = await matchesDb.getAllMatches(limit);
  return matches.map(m => ({
    id: m.id,
    bot1: { id: m.bot1_id, name: m.bot1_name },
    bot2: { id: m.bot2_id, name: m.bot2_name },
    winner: m.winner_id,
    status: m.status,
    createdAt: m.created_at,
    replay: m.replay ? JSON.parse(m.replay) : []
  }));
}

// Get matches for a bot
export async function getBotMatches(botId: string, limit: number = 20): Promise<any[]> {
  const matches = await matchesDb.getBotMatches(botId, limit);
  return matches.map(m => ({
    id: m.id,
    bot1: { id: m.bot1_id, name: m.bot1_name },
    bot2: { id: m.bot2_id, name: m.bot2_name },
    winner: m.winner_id,
    status: m.status,
    createdAt: m.created_at
  }));
}

// Join matchmaking queue
export async function joinQueue(botId: string): Promise<{ position: number }> {
  const bot = await getBot(botId);
  if (!bot) {
    throw new Error('Bot not found');
  }
  
  if (!matchQueue.includes(botId)) {
    matchQueue.push(botId);
  }
  
  // Try to create a match
  await tryCreateMatch();
  
  return { position: matchQueue.indexOf(botId) + 1 };
}

// Leave queue
export function leaveQueue(botId: string): void {
  const index = matchQueue.indexOf(botId);
  if (index > -1) {
    matchQueue.splice(index, 1);
  }
}

// Try to create a match
async function tryCreateMatch(): Promise<ArenaMatch | null> {
  if (matchQueue.length < 2) {
    return null;
  }
  
  const bot1Id = matchQueue.shift()!;
  const bot2Id = matchQueue.shift()!;
  
  const bot1 = await getBot(bot1Id);
  const bot2 = await getBot(bot2Id);
  
  if (!bot1 || !bot2) return null;
  
  const match = await createMatch(bot1, bot2);
  
  // Start the match asynchronously
  runMatch(match.id).catch(console.error);
  
  return match;
}

// Create a new match
async function createMatch(bot1: RegisteredBot, bot2: RegisteredBot): Promise<ArenaMatch> {
  const id = `match_${Date.now()}`;
  
  // Save to database
  await matchesDb.createMatch(id, bot1.id, bot1.name, bot2.id, bot2.name);
  
  const match: ArenaMatch = {
    id,
    bot1,
    bot2,
    status: 'pending',
    currentTurn: 0,
    gameState: initializeGameState(bot1, bot2),
    replay: [],
    createdAt: new Date()
  };
  
  activeMatches.set(id, match);
  
  return match;
}

function initializeGameState(bot1: RegisteredBot, bot2: RegisteredBot): any {
  return {
    player1: createPlayer(bot1),
    player2: createPlayer(bot2)
  };
}

function createPlayer(bot: RegisteredBot): Player {
  const fighters = DEFAULT_TEAM.fighters.map(f => ({ ...f, hp: f.maxHp }));
  return {
    id: bot.id,
    name: bot.name,
    active: fighters[0] || null,
    bench: fighters.slice(1),
    energy: 0,
    knockouts: 0
  };
}

async function callBotWebhook(bot: RegisteredBot, payload: WebhookPayload): Promise<BotResponse> {
  const body = JSON.stringify(payload);
  const signature = generateSignature(body, bot.secret);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), payload.timeoutMs);
  
  try {
    const response = await fetch(bot.callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Match-Id': payload.matchId
      },
      body,
      signal: controller.signal
    });
    
    if (!response.ok) throw new Error(`Bot returned ${response.status}`);
    
    const data = await response.json() as BotResponse;
    return {
      action: data.action || 'PASS',
      thinking: data.thinking || '',
      trashTalk: data.trashTalk || '',
    };
  } catch (error) {
    return {
      action: 'ATTACK_1',
      thinking: 'Connection error - auto action',
      trashTalk: ''
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getGameStateForBot(match: ArenaMatch, isBot1: boolean): GameStateForBot {
  const { player1, player2 } = match.gameState;
  const myPlayer = isBot1 ? player1 : player2;
  const enemyPlayer = isBot1 ? player2 : player1;
  
  return {
    yourFighter: myPlayer.active ? {
      name: myPlayer.active.name,
      type: myPlayer.active.type,
      hp: myPlayer.active.hp,
      maxHp: myPlayer.active.maxHp,
      attacks: myPlayer.active.attacks?.map((a: any) => ({
        name: a.name,
        cost: a.energyCost,
        damage: a.damage,
        effect: a.effect
      })),
      weakness: myPlayer.active.weakness
    } : null as any,
    enemyFighter: enemyPlayer.active ? {
      name: enemyPlayer.active.name,
      type: enemyPlayer.active.type,
      hp: enemyPlayer.active.hp,
      maxHp: enemyPlayer.active.maxHp
    } : null as any,
    yourBench: myPlayer.bench.map((f: FighterCard) => ({
      name: f.name,
      type: f.type,
      hp: f.hp,
      maxHp: f.maxHp
    })),
    enemyBenchCount: enemyPlayer.bench.length,
    yourEnergy: myPlayer.energy,
    history: match.replay.slice(-5).map((r: TurnRecord) => ({
      turn: r.turn,
      yourAction: isBot1 ? r.bot1Action.action : r.bot2Action.action,
      yourDamage: 0,
      enemyAction: isBot1 ? r.bot2Action.action : r.bot1Action.action,
      enemyDamage: 0
    }))
  };
}

function parseAction(response: BotResponse): { type: string; attackIndex?: number; benchIndex?: number } {
  const action = response.action.toUpperCase();
  
  if (action === 'ATTACK_1') return { type: 'attack', attackIndex: 0 };
  if (action === 'ATTACK_2') return { type: 'attack', attackIndex: 1 };
  if (action === 'RETREAT_0') return { type: 'retreat', benchIndex: 0 };
  if (action === 'RETREAT_1') return { type: 'retreat', benchIndex: 1 };
  return { type: 'pass' };
}

// Run a match
export async function runMatch(matchId: string): Promise<void> {
  const match = activeMatches.get(matchId);
  if (!match) return;
  
  match.status = 'active';
  const { player1, player2 } = match.gameState;
  
  const MAX_TURNS = 30;
  
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    match.currentTurn = turn;
    
    if (!player1.active || !player2.active) break;
    
    const [response1, response2] = await Promise.all([
      callBotWebhook(match.bot1, {
        matchId,
        turn,
        gameState: getGameStateForBot(match, true),
        timeoutMs: 5000
      }),
      callBotWebhook(match.bot2, {
        matchId,
        turn,
        gameState: getGameStateForBot(match, false),
        timeoutMs: 5000
      })
    ]);
    
    const action1 = parseAction(response1);
    const action2 = parseAction(response2);
    
    const { result } = processTurn(
      player1, player2,
      action1 as any, action2 as any,
      response1.thinking, response2.thinking,
      response1.trashTalk, response2.trashTalk,
      turn
    );
    
    match.replay.push({
      turn,
      bot1Action: { ...response1, action: response1.action, responseTimeMs: 0 },
      bot2Action: { ...response2, action: response2.action, responseTimeMs: 0 },
      events: result.events
    });
    
    const winner = checkWinner(player1, player2);
    if (winner) {
      await finishMatch(match, winner === player1.name ? match.bot1.id : 
                               winner === player2.name ? match.bot2.id : null);
      return;
    }
  }
  
  const winner = player1.knockouts > player2.knockouts ? match.bot1.id :
                 player2.knockouts > player1.knockouts ? match.bot2.id : null;
  await finishMatch(match, winner);
}

// Finish match and update rankings
async function finishMatch(match: ArenaMatch, winnerId: string | null): Promise<void> {
  match.status = 'finished';
  match.winner = winnerId || undefined;
  
  const winnerName = winnerId === match.bot1.id ? match.bot1.name : 
                     winnerId === match.bot2.id ? match.bot2.name : null;
  
  // Save to database
  await matchesDb.finishMatch(
    match.id,
    winnerId,
    winnerName,
    match.replay.length,
    match.replay
  );
  
  // Update bot stats in database
  if (winnerId) {
    const { winnerChange, loserChange } = calculateEloChange(match.bot1.elo, match.bot2.elo);
    
    if (winnerId === match.bot1.id) {
      await botsDb.updateBotStats(match.bot1.id, winnerChange, true);
      await botsDb.updateBotStats(match.bot2.id, loserChange, false);
    } else {
      await botsDb.updateBotStats(match.bot2.id, winnerChange, true);
      await botsDb.updateBotStats(match.bot1.id, loserChange, false);
    }
  } else {
    // Draw
    await botsDb.updateBotStats(match.bot1.id, 0, false);
    await botsDb.updateBotStats(match.bot2.id, 0, false);
  }
  
  // Clear cache so fresh data is fetched
  botCache.delete(match.bot1.id);
  botCache.delete(match.bot2.id);
}

// Get match by ID
export function getMatch(id: string): ArenaMatch | undefined {
  return activeMatches.get(id);
}

// Get queue status
export function getQueueStatus(): { count: number; bots: string[] } {
  return {
    count: matchQueue.length,
    bots: matchQueue
  };
}

// Get global stats
export async function getGlobalStats() {
  const stats = await botsDb.getGlobalStats();
  return {
    ...stats,
    queueSize: matchQueue.length
  };
}
