// Agent Registration & Twitter Verification (Moltbook-style)

import { randomBytes, createHmac } from 'crypto';
import { db } from '../db/index.js';

export interface Agent {
  id: string;
  name: string;
  description: string;
  callbackUrl: string;
  apiKey: string;
  secret: string;
  claimToken: string;
  verificationCode: string;
  status: 'pending_claim' | 'claimed' | 'active';
  elo: number;
  gamesPlayed: number;
  wins: number;
  createdAt: Date;
  claimedAt?: Date;
  owner?: {
    twitterHandle: string;
    twitterId?: string;
    verifiedAt: Date;
  };
}

interface AgentRow {
  id: string;
  name: string;
  description?: string | null;
  callback_url?: string | null;
  api_key?: string | null;
  secret?: string | null;
  claim_token?: string | null;
  verification_code?: string | null;
  status?: string | null;
  elo?: number | null;
  games_played?: number | null;
  wins?: number | null;
  created_at?: string | null;
  claimed_at?: string | null;
  owner_twitter_handle?: string | null;
  owner_twitter_id?: string | null;
  owner_verified_at?: string | null;
}

function toDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toAgent(row: AgentRow): Agent {
  const createdAt = toDate(row.created_at) || new Date();
  const claimedAt = toDate(row.claimed_at);
  const ownerHandle = row.owner_twitter_handle ? String(row.owner_twitter_handle) : null;
  const ownerVerifiedAt = toDate(row.owner_verified_at) || claimedAt || createdAt;

  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : '',
    callbackUrl: row.callback_url ? String(row.callback_url) : '',
    apiKey: row.api_key ? String(row.api_key) : '',
    secret: row.secret ? String(row.secret) : '',
    claimToken: row.claim_token ? String(row.claim_token) : '',
    verificationCode: row.verification_code ? String(row.verification_code) : '',
    status: (row.status as Agent['status']) || 'pending_claim',
    elo: Number(row.elo ?? 1200),
    gamesPlayed: Number(row.games_played ?? 0),
    wins: Number(row.wins ?? 0),
    createdAt,
    claimedAt,
    owner: ownerHandle
      ? {
          twitterHandle: ownerHandle,
          twitterId: row.owner_twitter_id ? String(row.owner_twitter_id) : undefined,
          verifiedAt: ownerVerifiedAt,
        }
      : undefined,
  };
}

function generateId(): string {
  return `agent_${randomBytes(12).toString('hex')}`;
}

function generateApiKey(): string {
  return `afc_sk_${randomBytes(24).toString('base64url')}`;
}

function generateClaimToken(): string {
  return `afc_claim_${randomBytes(24).toString('base64url')}`;
}

function generateSecret(): string {
  return randomBytes(32).toString('hex');
}

function generateVerificationCode(): string {
  const words = ['flame', 'frost', 'thunder', 'shadow', 'light', 'storm', 'blade', 'shield', 'dragon', 'phoenix', 'titan', 'spark', 'void', 'crystal', 'iron', 'steel'];
  const word = words[Math.floor(Math.random() * words.length)];
  const code = randomBytes(2).toString('hex').toUpperCase();
  return `${word}-${code}`;
}

export async function registerAgent(name: string, description: string, callbackUrl: string): Promise<{ agent: Agent; apiKey: string; claimUrl: string }> {
  // Validate name
  if (!name || name.length < 2 || name.length > 32) {
    throw new Error('Name must be 2-32 characters');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Name can only contain letters, numbers, underscores, and hyphens');
  }

  // Check if name is taken
  const existing = await db.execute({
    sql: 'SELECT id FROM bots WHERE LOWER(name) = LOWER(?) LIMIT 1',
    args: [name],
  });
  if (existing.rows.length > 0) {
    throw new Error(`Agent name "${name}" is already taken`);
  }

  const id = generateId();
  const apiKey = generateApiKey();
  const claimToken = generateClaimToken();
  const secret = generateSecret();
  const verificationCode = generateVerificationCode();
  const createdAt = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO bots (
        id,
        name,
        description,
        callback_url,
        api_key,
        secret,
        claim_token,
        verification_code,
        status,
        elo,
        games_played,
        wins,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    args: [
      id,
      name,
      description || '',
      callbackUrl,
      apiKey,
      secret,
      claimToken,
      verificationCode,
      'pending_claim',
      1200,
      0,
      0,
      createdAt,
    ],
  });

  const agent: Agent = {
    id,
    name,
    description: description || '',
    callbackUrl,
    apiKey,
    secret,
    claimToken,
    verificationCode,
    status: 'pending_claim',
    elo: 1200,
    gamesPlayed: 0,
    wins: 0,
    createdAt: new Date(createdAt),
  };

  const baseUrl = process.env.BASE_URL || 'https://ai-fight-club.fly.dev';

  return {
    agent,
    apiKey,
    claimUrl: `${baseUrl}/claim/${claimToken}`,
  };
}

export async function getAgentByApiKey(apiKey: string): Promise<Agent | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM bots WHERE api_key = ? LIMIT 1',
    args: [apiKey],
  });
  return result.rows.length > 0 ? toAgent(result.rows[0] as unknown as AgentRow) : null;
}

export async function getAgentByClaimToken(claimToken: string): Promise<Agent | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM bots WHERE claim_token = ? LIMIT 1',
    args: [claimToken],
  });
  return result.rows.length > 0 ? toAgent(result.rows[0] as unknown as AgentRow) : null;
}

export async function getAgent(id: string): Promise<Agent | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM bots WHERE id = ? LIMIT 1',
    args: [id],
  });
  return result.rows.length > 0 ? toAgent(result.rows[0] as unknown as AgentRow) : null;
}

export async function getAgentByName(name: string): Promise<Agent | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM bots WHERE LOWER(name) = LOWER(?) LIMIT 1',
    args: [name],
  });
  return result.rows.length > 0 ? toAgent(result.rows[0] as unknown as AgentRow) : null;
}

export async function claimAgent(claimToken: string, twitterHandle: string): Promise<Agent> {
  const agent = await getAgentByClaimToken(claimToken);
  if (!agent) {
    throw new Error('Invalid claim token');
  }

  if (agent.status !== 'pending_claim') {
    throw new Error('Agent already claimed');
  }

  const now = new Date().toISOString();
  await db.execute({
    sql: `UPDATE bots SET
          status = ?,
          claimed_at = ?,
          owner_twitter_handle = ?,
          owner_verified_at = ?
        WHERE id = ?`,
    args: ['claimed', now, twitterHandle, now, agent.id],
  });

  const updated = await getAgent(agent.id);
  if (!updated) {
    throw new Error('Failed to load claimed agent');
  }

  return updated;
}

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return signature === `sha256=${expected}`;
}

export async function getLeaderboard(limit: number = 10): Promise<Agent[]> {
  const result = await db.execute({
    sql: "SELECT * FROM bots WHERE status IN ('claimed', 'active') ORDER BY elo DESC LIMIT ?",
    args: [limit],
  });
  return result.rows.map(row => toAgent(row as unknown as AgentRow));
}

export async function getAllAgents(): Promise<Agent[]> {
  const result = await db.execute('SELECT * FROM bots');
  return result.rows.map(row => toAgent(row as unknown as AgentRow));
}

export async function updateAgentStats(agentId: string, won: boolean, eloChange: number): Promise<void> {
  await db.execute({
    sql: `UPDATE bots SET
          games_played = games_played + 1,
          wins = wins + ?,
          elo = CASE WHEN elo + ? < 100 THEN 100 ELSE elo + ? END
        WHERE id = ?`,
    args: [won ? 1 : 0, eloChange, eloChange, agentId],
  });
}

// Generate tweet template for verification
export function getTweetTemplate(agent: Agent): string {
  return `I'm claiming my AI fighter "${agent.name}" on @AIFightClub 🎮⚔️

Verification: ${agent.verificationCode}

#AIFightClub`;
}
