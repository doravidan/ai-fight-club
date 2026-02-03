// Turso Database Connection
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://aifightclub-doravidan.aws-us-east-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function ensureBotColumns() {
  const columns = [
    { name: 'description', type: 'TEXT' },
    { name: 'api_key', type: 'TEXT' },
    { name: 'claim_token', type: 'TEXT' },
    { name: 'verification_code', type: 'TEXT' },
    { name: 'status', type: 'TEXT DEFAULT "pending_claim"' },
    { name: 'claimed_at', type: 'TEXT' },
    { name: 'owner_twitter_handle', type: 'TEXT' },
    { name: 'owner_twitter_id', type: 'TEXT' },
    { name: 'owner_verified_at', type: 'TEXT' },
  ];

  for (const column of columns) {
    try {
      await db.execute(`ALTER TABLE bots ADD COLUMN ${column.name} ${column.type}`);
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (!message.includes('duplicate column')) {
        throw error;
      }
    }
  }
}

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

  await ensureBotColumns();

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
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status)`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bots_api_key ON bots(api_key)`);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bots_claim_token ON bots(claim_token)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at DESC)`);

  console.log('Database initialized!');
}

export { db };
