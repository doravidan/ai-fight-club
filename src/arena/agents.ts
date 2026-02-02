// Agent Registration & Twitter Verification (Moltbook-style)

import { randomBytes, createHmac } from 'crypto';

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

// In-memory storage (replace with Supabase later)
const agents = new Map<string, Agent>();
const apiKeyIndex = new Map<string, string>(); // apiKey -> agentId
const claimTokenIndex = new Map<string, string>(); // claimToken -> agentId

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

export function registerAgent(name: string, description: string, callbackUrl: string): { agent: Agent; apiKey: string; claimUrl: string } {
  // Validate name
  if (!name || name.length < 2 || name.length > 32) {
    throw new Error('Name must be 2-32 characters');
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Name can only contain letters, numbers, underscores, and hyphens');
  }
  
  // Check if name is taken
  for (const agent of agents.values()) {
    if (agent.name.toLowerCase() === name.toLowerCase()) {
      throw new Error(`Agent name "${name}" is already taken`);
    }
  }
  
  const id = generateId();
  const apiKey = generateApiKey();
  const claimToken = generateClaimToken();
  const secret = generateSecret();
  const verificationCode = generateVerificationCode();
  
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
    createdAt: new Date(),
  };
  
  agents.set(id, agent);
  apiKeyIndex.set(apiKey, id);
  claimTokenIndex.set(claimToken, id);
  
  const baseUrl = process.env.BASE_URL || 'https://ai-fight-club.fly.dev';
  
  return {
    agent,
    apiKey,
    claimUrl: `${baseUrl}/claim/${claimToken}`,
  };
}

export function getAgentByApiKey(apiKey: string): Agent | null {
  const agentId = apiKeyIndex.get(apiKey);
  if (!agentId) return null;
  return agents.get(agentId) || null;
}

export function getAgentByClaimToken(claimToken: string): Agent | null {
  const agentId = claimTokenIndex.get(claimToken);
  if (!agentId) return null;
  return agents.get(agentId) || null;
}

export function getAgent(id: string): Agent | null {
  return agents.get(id) || null;
}

export function getAgentByName(name: string): Agent | null {
  for (const agent of agents.values()) {
    if (agent.name.toLowerCase() === name.toLowerCase()) {
      return agent;
    }
  }
  return null;
}

export function claimAgent(claimToken: string, twitterHandle: string): Agent {
  const agent = getAgentByClaimToken(claimToken);
  if (!agent) {
    throw new Error('Invalid claim token');
  }
  
  if (agent.status !== 'pending_claim') {
    throw new Error('Agent already claimed');
  }
  
  agent.status = 'claimed';
  agent.claimedAt = new Date();
  agent.owner = {
    twitterHandle,
    verifiedAt: new Date(),
  };
  
  return agent;
}

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return signature === `sha256=${expected}`;
}

export function getLeaderboard(limit: number = 10): Agent[] {
  return Array.from(agents.values())
    .filter(a => a.status === 'claimed' || a.status === 'active')
    .sort((a, b) => b.elo - a.elo)
    .slice(0, limit);
}

export function getAllAgents(): Agent[] {
  return Array.from(agents.values());
}

export function updateAgentStats(agentId: string, won: boolean, eloChange: number): void {
  const agent = agents.get(agentId);
  if (!agent) return;
  
  agent.gamesPlayed++;
  if (won) agent.wins++;
  agent.elo += eloChange;
  if (agent.elo < 100) agent.elo = 100; // Minimum ELO
}

// Generate tweet template for verification
export function getTweetTemplate(agent: Agent): string {
  return `I'm claiming my AI fighter "${agent.name}" on @AIFightClub 🎮⚔️

Verification: ${agent.verificationCode}

#AIFightClub`;
}
