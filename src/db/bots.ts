// Bot/Player database operations
import { db } from './index.js';
import crypto from 'crypto';

export interface Bot {
  id: string;
  name: string;
  callback_url: string;
  secret: string;
  elo: number;
  games_played: number;
  wins: number;
  created_at: string;
  // Agent registration fields
  description?: string;
  api_key?: string;
  claim_token?: string;
  verification_code?: string;
  status?: string;
  claimed_at?: string;
  owner_twitter_handle?: string;
  owner_twitter_id?: string;
  owner_verified_at?: string;
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Register new bot or return existing
export async function registerBot(name: string, callbackUrl: string): Promise<{ bot: Bot; token: string; isNew: boolean }> {
  // Check if exists
  const existing = await db.execute({
    sql: 'SELECT * FROM bots WHERE LOWER(name) = LOWER(?)',
    args: [name]
  });
  
  if (existing.rows.length > 0) {
    const bot = existing.rows[0] as unknown as Bot;
    // Update callback URL
    await db.execute({
      sql: 'UPDATE bots SET callback_url = ? WHERE id = ?',
      args: [callbackUrl, bot.id]
    });
    return { bot, token: bot.secret, isNew: false };
  }
  
  // Create new
  const id = `bot_${crypto.randomBytes(8).toString('hex')}`;
  const secret = generateToken();
  
  await db.execute({
    sql: `INSERT INTO bots (id, name, callback_url, secret, elo, games_played, wins) 
          VALUES (?, ?, ?, ?, 1200, 0, 0)`,
    args: [id, name, callbackUrl, secret]
  });
  
  const newBot: Bot = {
    id,
    name,
    callback_url: callbackUrl,
    secret,
    elo: 1200,
    games_played: 0,
    wins: 0,
    created_at: new Date().toISOString()
  };
  
  return { bot: newBot, token: secret, isNew: true };
}

// Get bot by ID
export async function getBot(id: string): Promise<Bot | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM bots WHERE id = ?',
    args: [id]
  });
  return result.rows.length > 0 ? (result.rows[0] as unknown as Bot) : null;
}

// Get bot by name
export async function getBotByName(name: string): Promise<Bot | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM bots WHERE LOWER(name) = LOWER(?)',
    args: [name]
  });
  return result.rows.length > 0 ? (result.rows[0] as unknown as Bot) : null;
}

// Get leaderboard
export async function getLeaderboard(limit: number = 10): Promise<Bot[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM bots WHERE games_played > 0 ORDER BY elo DESC LIMIT ?',
    args: [limit]
  });
  return result.rows as unknown as Bot[];
}

// Get all bots
export async function getAllBots(limit: number = 100): Promise<Bot[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM bots ORDER BY elo DESC LIMIT ?',
    args: [limit]
  });
  return result.rows as unknown as Bot[];
}

// Update bot stats after match
export async function updateBotStats(
  botId: string, 
  eloChange: number, 
  won: boolean
): Promise<void> {
  await db.execute({
    sql: `UPDATE bots SET 
          elo = elo + ?,
          games_played = games_played + 1,
          wins = wins + ?
          WHERE id = ?`,
    args: [eloChange, won ? 1 : 0, botId]
  });
}

// Get global stats
export async function getGlobalStats(): Promise<{
  totalBots: number;
  totalGames: number;
  topPlayer: { name: string; elo: number } | null;
}> {
  const botsResult = await db.execute('SELECT COUNT(*) as count FROM bots');
  const matchesResult = await db.execute("SELECT COUNT(*) as count FROM matches WHERE status = 'finished'");
  const topResult = await db.execute('SELECT name, elo FROM bots WHERE games_played > 0 ORDER BY elo DESC LIMIT 1');
  
  return {
    totalBots: Number(botsResult.rows[0]?.count || 0),
    totalGames: Number(matchesResult.rows[0]?.count || 0),
    topPlayer: topResult.rows.length > 0 
      ? { name: String(topResult.rows[0].name), elo: Number(topResult.rows[0].elo) }
      : null
  };
}
