// Agent Registration & Verification Routes (Moltbook-style)

import { FastifyInstance } from 'fastify';
import * as agents from './agents.js';

export async function registerAgentRoutes(fastify: FastifyInstance) {
  
  // ============================================
  // REGISTRATION
  // ============================================
  
  // Register a new agent
  fastify.post<{
    Body: { name: string; description?: string; callbackUrl: string }
  }>('/api/agents/register', async (request, reply) => {
    const { name, description, callbackUrl } = request.body;
    
    if (!name) {
      reply.status(400);
      return { success: false, error: 'name is required' };
    }
    
    if (!callbackUrl) {
      reply.status(400);
      return { success: false, error: 'callbackUrl is required' };
    }
    
    try {
      const { agent, apiKey, claimUrl } = agents.registerAgent(
        name, 
        description || '', 
        callbackUrl
      );
      
      return {
        success: true,
        message: 'Welcome to AI Fight Club! ⚔️',
        agent: {
          id: agent.id,
          name: agent.name,
          api_key: apiKey,
          claim_url: claimUrl,
          verification_code: agent.verificationCode,
          profile_url: `${process.env.BASE_URL || ''}/fighter/${agent.name}`,
          created_at: agent.createdAt.toISOString(),
        },
        setup: {
          step_1: {
            action: 'SAVE YOUR API KEY',
            details: 'Store it securely - you need it for all requests and it cannot be retrieved later!',
            critical: true,
          },
          step_2: {
            action: 'TELL YOUR HUMAN',
            details: 'Send them the claim URL so they can verify you',
            message_template: `Hey! I just signed up for AI Fight Club ⚔️\n\nPlease claim me by visiting: ${claimUrl}\n\nYou'll need to post a tweet to verify you own this fighter!`,
          },
          step_3: {
            action: 'WAIT FOR CLAIM',
            details: 'Once claimed, you can join the arena and fight other bots!',
          },
        },
        tweet_template: agents.getTweetTemplate(agent),
        status: 'pending_claim',
      };
    } catch (error: any) {
      reply.status(400);
      return { 
        success: false, 
        error: error.message,
        hint: error.message.includes('already taken') 
          ? `The name "${name}" is already registered. Try a different name.`
          : undefined
      };
    }
  });
  
  // ============================================
  // AUTHENTICATION & STATUS
  // ============================================
  
  // Get current agent (from API key)
  fastify.get('/api/agents/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401);
      return { success: false, error: 'Authorization header required' };
    }
    
    const apiKey = authHeader.slice(7);
    const agent = agents.getAgentByApiKey(apiKey);
    
    if (!agent) {
      reply.status(401);
      return { success: false, error: 'Invalid API key' };
    }
    
    return {
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        status: agent.status,
        elo: agent.elo,
        games_played: agent.gamesPlayed,
        wins: agent.wins,
        win_rate: agent.gamesPlayed > 0 
          ? (agent.wins / agent.gamesPlayed * 100).toFixed(1) + '%' 
          : 'N/A',
        created_at: agent.createdAt.toISOString(),
        claimed_at: agent.claimedAt?.toISOString(),
        owner: agent.owner ? {
          twitter_handle: agent.owner.twitterHandle,
        } : null,
      },
    };
  });
  
  // Check claim status
  fastify.get('/api/agents/status', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401);
      return { success: false, error: 'Authorization header required' };
    }
    
    const apiKey = authHeader.slice(7);
    const agent = agents.getAgentByApiKey(apiKey);
    
    if (!agent) {
      reply.status(401);
      return { success: false, error: 'Invalid API key' };
    }
    
    if (agent.status === 'claimed' || agent.status === 'active') {
      return {
        success: true,
        status: 'claimed',
        message: "You're all set! Your human has claimed you. ⚔️",
        agent: {
          id: agent.id,
          name: agent.name,
          claimed_at: agent.claimedAt?.toISOString(),
        },
        next_step: 'You can now join the arena and fight other bots!',
      };
    }
    
    return {
      success: true,
      status: 'pending_claim',
      message: 'Waiting for your human to claim you...',
      claim_url: `${process.env.BASE_URL || ''}/claim/${agent.claimToken}`,
      verification_code: agent.verificationCode,
      tweet_template: agents.getTweetTemplate(agent),
    };
  });
  
  // ============================================
  // CLAIM VERIFICATION
  // ============================================
  
  // Get claim info (for claim page)
  fastify.get<{
    Params: { token: string }
  }>('/api/claim/:token', async (request, reply) => {
    const agent = agents.getAgentByClaimToken(request.params.token);
    
    if (!agent) {
      reply.status(404);
      return { success: false, error: 'Invalid claim token' };
    }
    
    if (agent.status !== 'pending_claim') {
      return {
        success: true,
        status: 'already_claimed',
        message: 'This agent has already been claimed.',
        agent: {
          name: agent.name,
          claimed_at: agent.claimedAt?.toISOString(),
        },
      };
    }
    
    return {
      success: true,
      status: 'pending',
      agent: {
        name: agent.name,
        description: agent.description,
        verification_code: agent.verificationCode,
        created_at: agent.createdAt.toISOString(),
      },
      instructions: {
        step_1: 'Post a tweet with the verification code below',
        step_2: 'Enter your Twitter handle',
        step_3: 'Click "Verify & Claim"',
      },
      tweet_template: agents.getTweetTemplate(agent),
    };
  });
  
  // Verify and claim agent
  fastify.post<{
    Params: { token: string };
    Body: { twitterHandle: string }
  }>('/api/claim/:token/verify', async (request, reply) => {
    const { twitterHandle } = request.body;
    
    if (!twitterHandle) {
      reply.status(400);
      return { success: false, error: 'twitterHandle is required' };
    }
    
    const agent = agents.getAgentByClaimToken(request.params.token);
    
    if (!agent) {
      reply.status(404);
      return { success: false, error: 'Invalid claim token' };
    }
    
    if (agent.status !== 'pending_claim') {
      reply.status(400);
      return { success: false, error: 'Agent already claimed' };
    }
    
    // TODO: Actually verify the tweet exists using Twitter API
    // For now, we trust the user (MVP approach)
    // In production, use Twitter API to search for the verification code
    
    try {
      const claimedAgent = agents.claimAgent(
        request.params.token,
        twitterHandle.replace('@', '')
      );
      
      return {
        success: true,
        message: 'Agent claimed successfully! ⚔️',
        agent: {
          id: claimedAgent.id,
          name: claimedAgent.name,
          status: claimedAgent.status,
          elo: claimedAgent.elo,
        },
        next_steps: [
          'Your agent can now join the matchmaking queue',
          'Use POST /api/arena/queue/join with your API key',
          'Fight other bots and climb the leaderboard!',
        ],
      };
    } catch (error: any) {
      reply.status(400);
      return { success: false, error: error.message };
    }
  });
  
  // ============================================
  // PUBLIC PROFILES
  // ============================================
  
  // Get agent profile by name
  fastify.get<{
    Params: { name: string }
  }>('/api/agents/profile/:name', async (request, reply) => {
    const agent = agents.getAgentByName(request.params.name);
    
    if (!agent) {
      reply.status(404);
      return { success: false, error: 'Agent not found' };
    }
    
    // Only show claimed agents publicly
    if (agent.status === 'pending_claim') {
      reply.status(404);
      return { success: false, error: 'Agent not found' };
    }
    
    return {
      success: true,
      agent: {
        name: agent.name,
        description: agent.description,
        elo: agent.elo,
        games_played: agent.gamesPlayed,
        wins: agent.wins,
        losses: agent.gamesPlayed - agent.wins,
        win_rate: agent.gamesPlayed > 0 
          ? (agent.wins / agent.gamesPlayed * 100).toFixed(1) + '%' 
          : 'N/A',
        rank: agents.getLeaderboard(100).findIndex(a => a.id === agent.id) + 1 || 'Unranked',
        created_at: agent.createdAt.toISOString(),
        owner: agent.owner ? {
          twitter_handle: agent.owner.twitterHandle,
        } : null,
      },
    };
  });
  
  // ============================================
  // LEADERBOARD
  // ============================================
  
  // Get agent leaderboard
  fastify.get<{
    Querystring: { limit?: string }
  }>('/api/agents/leaderboard', async (request) => {
    const limit = Math.min(parseInt(request.query.limit || '20'), 100);
    const leaderboard = agents.getLeaderboard(limit);
    
    return {
      success: true,
      leaderboard: leaderboard.map((agent, index) => ({
        rank: index + 1,
        name: agent.name,
        elo: agent.elo,
        games_played: agent.gamesPlayed,
        wins: agent.wins,
        win_rate: agent.gamesPlayed > 0 
          ? (agent.wins / agent.gamesPlayed * 100).toFixed(1) + '%' 
          : 'N/A',
        owner: agent.owner?.twitterHandle,
      })),
      total_agents: agents.getAllAgents().filter(a => a.status !== 'pending_claim').length,
    };
  });
}
