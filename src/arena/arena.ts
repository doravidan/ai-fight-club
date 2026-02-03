// Arena service - matchmaking, game execution, rankings
// With persistent file storage

import crypto from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import {
  RegisteredBot, ArenaMatch, WebhookPayload, BotResponse,
  GameStateForBot, TurnRecord, calculateEloChange
} from './types.js';
import { TeamConfig } from '../match/runner.js';
import { FighterCard, Player } from '../engine/types.js';
import { processTurn, checkWinner } from '../engine/combat.js';

// Data directory
const DATA_DIR = './data';
const BOTS_FILE = `${DATA_DIR}/bots.json`;
const MATCHES_FILE = `${DATA_DIR}/matches.json`;

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Load persisted data
function loadBots(): Map<string, RegisteredBot> {
  try {
    if (existsSync(BOTS_FILE)) {
      const data = JSON.parse(readFileSync(BOTS_FILE, 'utf-8'));
      const map = new Map<string, RegisteredBot>();
      for (const bot of data) {
        bot.createdAt = new Date(bot.createdAt);
        map.set(bot.id, bot);
      }
      console.log(`Loaded ${map.size} bots from storage`);
      return map;
    }
  } catch (e) {
    console.error('Failed to load bots:', e);
  }
  return new Map();
}

function loadMatches(): Map<string, ArenaMatch> {
  try {
    if (existsSync(MATCHES_FILE)) {
      const data = JSON.parse(readFileSync(MATCHES_FILE, 'utf-8'));
      const map = new Map<string, ArenaMatch>();
      for (const match of data) {
        match.createdAt = new Date(match.createdAt);
        if (match.finishedAt) match.finishedAt = new Date(match.finishedAt);
        map.set(match.id, match);
      }
      console.log(`Loaded ${map.size} matches from storage`);
      return map;
    }
  } catch (e) {
    console.error('Failed to load matches:', e);
  }
  return new Map();
}

function saveBots(): void {
  try {
    const data = Array.from(bots.values());
    writeFileSync(BOTS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save bots:', e);
  }
}

function saveMatches(): void {
  try {
    // Only save last 1000 matches to prevent file bloat
    const allMatches = Array.from(matches.values());
    const recentMatches = allMatches
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 1000);
    writeFileSync(MATCHES_FILE, JSON.stringify(recentMatches, null, 2));
  } catch (e) {
    console.error('Failed to save matches:', e);
  }
}

// Persistent storage
const bots = loadBots();
const matches = loadMatches();
const matchQueue: string[] = [];

// Default team for bots (they can customize via callback)
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

// Generate secure token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate signature for webhook
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// Register a new bot or return existing one by name
export function registerBot(name: string, callbackUrl: string): { bot: RegisteredBot; token: string; isNew: boolean } {
  // Check if bot with this name already exists
  const existingBot = getBotByName(name);
  if (existingBot) {
    // Update callback URL and return existing bot
    existingBot.callbackUrl = callbackUrl;
    saveBots();
    return { bot: existingBot, token: existingBot.secret, isNew: false };
  }
  
  // Create new bot
  const id = `bot_${crypto.randomBytes(8).toString('hex')}`;
  const secret = generateToken();
  const token = generateToken();
  
  const bot: RegisteredBot = {
    id,
    name,
    callbackUrl,
    secret,
    elo: 1200,
    gamesPlayed: 0,
    wins: 0,
    createdAt: new Date()
  };
  
  bots.set(id, bot);
  saveBots();
  
  return { bot, token, isNew: true };
}

// Get bot by ID
export function getBot(id: string): RegisteredBot | undefined {
  return bots.get(id);
}

// Get bot by name
export function getBotByName(name: string): RegisteredBot | undefined {
  return Array.from(bots.values()).find(b => b.name.toLowerCase() === name.toLowerCase());
}

// Get all bots
export function getAllBots(): RegisteredBot[] {
  return Array.from(bots.values());
}

// Get leaderboard
export function getLeaderboard(limit: number = 10): RegisteredBot[] {
  return Array.from(bots.values())
    .filter(b => b.gamesPlayed > 0)
    .sort((a, b) => b.elo - a.elo)
    .slice(0, limit);
}

// Get all matches (for history)
export function getAllMatches(limit: number = 100): ArenaMatch[] {
  return Array.from(matches.values())
    .filter(m => m.status === 'finished')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// Get matches for a specific bot
export function getBotMatches(botId: string, limit: number = 20): ArenaMatch[] {
  return Array.from(matches.values())
    .filter(m => m.status === 'finished' && (m.bot1.id === botId || m.bot2.id === botId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// Join matchmaking queue
export function joinQueue(botId: string): { position: number } {
  if (!bots.has(botId)) {
    throw new Error('Bot not found');
  }
  
  if (!matchQueue.includes(botId)) {
    matchQueue.push(botId);
  }
  
  // Try to create a match
  tryCreateMatch();
  
  return { position: matchQueue.indexOf(botId) + 1 };
}

// Leave queue
export function leaveQueue(botId: string): void {
  const index = matchQueue.indexOf(botId);
  if (index > -1) {
    matchQueue.splice(index, 1);
  }
}

// Try to create a match from queued bots
function tryCreateMatch(): ArenaMatch | null {
  if (matchQueue.length < 2) {
    return null;
  }
  
  const bot1Id = matchQueue.shift()!;
  const bot2Id = matchQueue.shift()!;
  
  const bot1 = bots.get(bot1Id)!;
  const bot2 = bots.get(bot2Id)!;
  
  const match = createMatch(bot1, bot2);
  
  // Start the match asynchronously
  runMatch(match.id).catch(console.error);
  
  return match;
}

// Create a new match
function createMatch(bot1: RegisteredBot, bot2: RegisteredBot): ArenaMatch {
  const id = `match_${Date.now()}`;
  
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
  
  matches.set(id, match);
  saveMatches();
  
  return match;
}

// Initialize game state
function initializeGameState(bot1: RegisteredBot, bot2: RegisteredBot): any {
  // Create players with default teams (bots can have custom teams later)
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

// Call bot's webhook to get action
async function callBotWebhook(
  bot: RegisteredBot,
  payload: WebhookPayload
): Promise<BotResponse> {
  const body = JSON.stringify(payload);
  const signature = generateSignature(body, bot.secret);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), payload.timeoutMs);
  
  try {
    const startTime = Date.now();
    
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
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`Bot returned ${response.status}`);
    }
    
    const data = await response.json() as BotResponse;
    
    return {
      action: data.action || 'PASS',
      thinking: data.thinking || '',
      trashTalk: data.trashTalk || '',
    };
  } catch (error) {
    console.error(`Bot ${bot.name} webhook failed:`, error);
    // Default action on timeout/error
    return {
      action: 'ATTACK_1',
      thinking: 'Connection error - auto action',
      trashTalk: ''
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Convert game state for bot perspective
function getGameStateForBot(
  match: ArenaMatch,
  isBot1: boolean
): GameStateForBot {
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
      yourDamage: 0, // TODO: track damage
      enemyAction: isBot1 ? r.bot2Action.action : r.bot1Action.action,
      enemyDamage: 0
    }))
  };
}

// Parse bot response to game action
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
  const match = matches.get(matchId);
  if (!match) return;
  
  match.status = 'active';
  const { player1, player2 } = match.gameState;
  
  const MAX_TURNS = 30;
  
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    match.currentTurn = turn;
    
    // Check if both have active fighters
    if (!player1.active || !player2.active) {
      break;
    }
    
    // Get actions from both bots in parallel
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
    
    // Process turn
    const { result } = processTurn(
      player1, player2,
      action1 as any, action2 as any,
      response1.thinking, response2.thinking,
      response1.trashTalk, response2.trashTalk,
      turn
    );
    
    // Record turn
    match.replay.push({
      turn,
      bot1Action: { ...response1, action: response1.action, responseTimeMs: 0 },
      bot2Action: { ...response2, action: response2.action, responseTimeMs: 0 },
      events: result.events
    });
    
    // Check for winner
    const winner = checkWinner(player1, player2);
    if (winner) {
      await finishMatch(match, winner === player1.name ? match.bot1.id : 
                               winner === player2.name ? match.bot2.id : null);
      return;
    }
  }
  
  // Time limit - determine winner by knockouts
  const winner = player1.knockouts > player2.knockouts ? match.bot1.id :
                 player2.knockouts > player1.knockouts ? match.bot2.id : null;
  await finishMatch(match, winner);
}

// Finish match and update rankings
async function finishMatch(match: ArenaMatch, winnerId: string | null): Promise<void> {
  match.status = 'finished';
  match.winner = winnerId || undefined;
  (match as any).finishedAt = new Date();
  
  const bot1 = bots.get(match.bot1.id)!;
  const bot2 = bots.get(match.bot2.id)!;
  
  // Update stats
  bot1.gamesPlayed++;
  bot2.gamesPlayed++;
  
  if (winnerId) {
    const winner = winnerId === bot1.id ? bot1 : bot2;
    const loser = winnerId === bot1.id ? bot2 : bot1;
    
    winner.wins++;
    
    const { winnerChange, loserChange } = calculateEloChange(winner.elo, loser.elo);
    winner.elo += winnerChange;
    loser.elo += loserChange;
    
    // Notify bots of result
    notifyResult(winner, match.id, 'win', winnerChange);
    notifyResult(loser, match.id, 'lose', loserChange);
  } else {
    // Draw
    notifyResult(bot1, match.id, 'draw', 0);
    notifyResult(bot2, match.id, 'draw', 0);
  }
  
  // Persist updates
  saveBots();
  saveMatches();
}

// Notify bot of match result
async function notifyResult(
  bot: RegisteredBot,
  matchId: string,
  result: 'win' | 'lose' | 'draw',
  eloChange: number
): Promise<void> {
  try {
    await fetch(`${bot.callbackUrl}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId,
        result,
        eloChange,
        newElo: bot.elo
      })
    });
  } catch (error) {
    // Result notification is best-effort
    console.error(`Failed to notify ${bot.name} of result:`, error);
  }
}

// Get match by ID
export function getMatch(id: string): ArenaMatch | undefined {
  return matches.get(id);
}

// Get queue status
export function getQueueStatus(): { count: number; bots: string[] } {
  return {
    count: matchQueue.length,
    bots: matchQueue.map(id => bots.get(id)?.name || id)
  };
}

// Get global stats
export function getGlobalStats() {
  const allBots = Array.from(bots.values());
  const allMatches = Array.from(matches.values()).filter(m => m.status === 'finished');
  const topPlayer = getLeaderboard(1)[0];
  
  return {
    totalBots: allBots.length,
    totalGames: allMatches.length,
    queueSize: matchQueue.length,
    topPlayer: topPlayer ? { name: topPlayer.name, elo: topPlayer.elo } : null
  };
}
