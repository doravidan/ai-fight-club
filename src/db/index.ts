// Turso Database Connection
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://aifightclub-doravidan.aws-us-east-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize tables
export async function initDatabase() {
  console.log('Initializing database...');
  
  // Bots/Players table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      callback_url TEXT,
      secret TEXT NOT NULL,
      elo INTEGER DEFAULT 1200,
      games_played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Matches table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      bot1_id TEXT NOT NULL,
      bot1_name TEXT NOT NULL,
      bot2_id TEXT NOT NULL,
      bot2_name TEXT NOT NULL,
      winner_id TEXT,
      winner_name TEXT,
      status TEXT DEFAULT 'pending',
      turns INTEGER DEFAULT 0,
      replay TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT,
      FOREIGN KEY (bot1_id) REFERENCES bots(id),
      FOREIGN KEY (bot2_id) REFERENCES bots(id)
    )
  `);
  
  // Create indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_bots_name ON bots(name)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_bots_elo ON bots(elo DESC)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at DESC)`);
  
  console.log('Database initialized!');
}

export { db };
