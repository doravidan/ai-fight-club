// Match database operations
import { db } from './index.js';

export interface MatchRecord {
  id: string;
  bot1_id: string;
  bot1_name: string;
  bot2_id: string;
  bot2_name: string;
  winner_id: string | null;
  winner_name: string | null;
  status: string;
  turns: number;
  replay: string | null;
  created_at: string;
  finished_at: string | null;
}

// Create a new match record
export async function createMatch(
  id: string,
  bot1Id: string,
  bot1Name: string,
  bot2Id: string,
  bot2Name: string
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO matches (id, bot1_id, bot1_name, bot2_id, bot2_name, status)
          VALUES (?, ?, ?, ?, ?, 'active')`,
    args: [id, bot1Id, bot1Name, bot2Id, bot2Name]
  });
}

// Update match when finished
export async function finishMatch(
  matchId: string,
  winnerId: string | null,
  winnerName: string | null,
  turns: number,
  replay: any[]
): Promise<void> {
  await db.execute({
    sql: `UPDATE matches SET 
          winner_id = ?,
          winner_name = ?,
          status = 'finished',
          turns = ?,
          replay = ?,
          finished_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [winnerId, winnerName, turns, JSON.stringify(replay), matchId]
  });
}

// Get match by ID
export async function getMatch(id: string): Promise<MatchRecord | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM matches WHERE id = ?',
    args: [id]
  });
  return result.rows.length > 0 ? (result.rows[0] as unknown as MatchRecord) : null;
}

// Get all matches (recent first)
export async function getAllMatches(limit: number = 50): Promise<MatchRecord[]> {
  const result = await db.execute({
    sql: "SELECT * FROM matches WHERE status = 'finished' ORDER BY created_at DESC LIMIT ?",
    args: [limit]
  });
  return result.rows as unknown as MatchRecord[];
}

// Get matches for a specific bot
export async function getBotMatches(botId: string, limit: number = 20): Promise<MatchRecord[]> {
  const result = await db.execute({
    sql: `SELECT * FROM matches 
          WHERE status = 'finished' AND (bot1_id = ? OR bot2_id = ?) 
          ORDER BY created_at DESC LIMIT ?`,
    args: [botId, botId, limit]
  });
  return result.rows as unknown as MatchRecord[];
}
