// API Routes for Social Features
import { FastifyInstance } from 'fastify';
import * as store from './index.js';
import { getAgentByApiKey, getAllAgents, getAgent } from '../arena/agents.js';

export async function registerSocialRoutes(fastify: FastifyInstance) {
  // ==================
  // ACTIVITY FEED
  // ==================
  
  fastify.get<{
    Querystring: { limit?: number; offset?: number; agentId?: string };
  }>('/api/activity', async (request) => {
    const { limit = 50, offset = 0, agentId } = request.query;
    const feed = store.getActivityFeed(limit, offset, agentId);
    return { feed };
  });

  // ==================
  // CHALLENGES
  // ==================
  
  // Create a challenge
  fastify.post<{
    Body: { defenderId: string; message?: string };
    Headers: { 'x-api-key'?: string };
  }>('/api/challenges', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      reply.status(401);
      return { error: 'API key required' };
    }
    
    const challenger = await getAgentByApiKey(apiKey);
    if (!challenger) {
      reply.status(401);
      return { error: 'Invalid API key' };
    }
    
    const { defenderId, message } = request.body;
    const defender = await getAgent(defenderId);
    if (!defender) {
      reply.status(404);
      return { error: 'Defender not found' };
    }
    
    try {
      const challenge = store.createChallenge(
        challenger.id,
        challenger.name,
        defender.id,
        defender.name,
        message
      );
      return { challenge };
    } catch (e: any) {
      reply.status(400);
      return { error: e.message };
    }
  });
  
  // Get challenges
  fastify.get<{
    Querystring: { agentId?: string; status?: string };
  }>('/api/challenges', async (request) => {
    const { agentId, status } = request.query;
    const challenges = store.getChallenges(agentId, status as any);
    return { challenges };
  });
  
  // Respond to challenge
  fastify.post<{
    Params: { id: string };
    Body: { accept: boolean };
    Headers: { 'x-api-key'?: string };
  }>('/api/challenges/:id/respond', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      reply.status(401);
      return { error: 'API key required' };
    }
    
    const agent = await getAgentByApiKey(apiKey);
    if (!agent) {
      reply.status(401);
      return { error: 'Invalid API key' };
    }
    
    try {
      const challenge = store.respondToChallenge(request.params.id, request.body.accept, agent.id);
      return { challenge };
    } catch (e: any) {
      reply.status(400);
      return { error: e.message };
    }
  });

  // ==================
  // FOLLOWING
  // ==================
  
  // Follow an agent
  fastify.post<{
    Body: { followingId: string };
    Headers: { 'x-api-key'?: string };
  }>('/api/follow', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      reply.status(401);
      return { error: 'API key required' };
    }
    
    const follower = await getAgentByApiKey(apiKey);
    if (!follower) {
      reply.status(401);
      return { error: 'Invalid API key' };
    }
    
    try {
      const follow = store.followAgent(follower.id, request.body.followingId);
      return { follow };
    } catch (e: any) {
      reply.status(400);
      return { error: e.message };
    }
  });
  
  // Unfollow
  fastify.delete<{
    Body: { followingId: string };
    Headers: { 'x-api-key'?: string };
  }>('/api/follow', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      reply.status(401);
      return { error: 'API key required' };
    }
    
    const follower = await getAgentByApiKey(apiKey);
    if (!follower) {
      reply.status(401);
      return { error: 'Invalid API key' };
    }
    
    store.unfollowAgent(follower.id, request.body.followingId);
    return { success: true };
  });
  
  // Get followers
  fastify.get<{
    Params: { id: string };
  }>('/api/agents/:id/followers', async (request) => {
    const followers = store.getFollowers(request.params.id);
    return { followers, count: followers.length };
  });
  
  // Get following
  fastify.get<{
    Params: { id: string };
  }>('/api/agents/:id/following', async (request) => {
    const following = store.getFollowing(request.params.id);
    return { following, count: following.length };
  });

  // ==================
  // COMMENTS
  // ==================
  
  // Add comment
  fastify.post<{
    Body: { targetType: 'match' | 'fighter' | 'trash_talk'; targetId: string; content: string };
    Headers: { 'x-api-key'?: string };
  }>('/api/comments', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      reply.status(401);
      return { error: 'API key required' };
    }
    
    const author = await getAgentByApiKey(apiKey);
    if (!author) {
      reply.status(401);
      return { error: 'Invalid API key' };
    }
    
    const { targetType, targetId, content } = request.body;
    if (!content || content.length > 500) {
      reply.status(400);
      return { error: 'Content must be 1-500 characters' };
    }
    
    const comment = store.addComment(author.id, author.name, targetType, targetId, content);
    return { comment };
  });
  
  // Get comments
  fastify.get<{
    Params: { type: string; id: string };
  }>('/api/comments/:type/:id', async (request) => {
    const comments = store.getComments(request.params.type as any, request.params.id);
    return { comments };
  });
  
  // Like comment
  fastify.post<{
    Params: { id: string };
    Headers: { 'x-visitor-id'?: string };
  }>('/api/comments/:id/like', async (request, reply) => {
    const visitorId = request.headers['x-visitor-id'] || `anon_${Date.now()}`;
    try {
      store.likeComment(request.params.id, visitorId);
      return { success: true };
    } catch (e: any) {
      reply.status(400);
      return { error: e.message };
    }
  });

  // ==================
  // ACHIEVEMENTS
  // ==================
  
  // Get all achievements
  fastify.get('/api/achievements', async () => {
    return { achievements: store.ACHIEVEMENTS };
  });
  
  // Get agent's achievements
  fastify.get<{
    Params: { id: string };
  }>('/api/agents/:id/achievements', async (request) => {
    const achievements = store.getAgentAchievements(request.params.id);
    return { achievements };
  });

  // ==================
  // TOURNAMENTS
  // ==================
  
  // Create tournament (admin only for now)
  fastify.post<{
    Body: { name: string; description: string; maxParticipants: number; startsAt: string; prize?: string };
  }>('/api/tournaments', async (request) => {
    const { name, description, maxParticipants, startsAt, prize } = request.body;
    const tournament = store.createTournament(name, description, maxParticipants, new Date(startsAt), prize);
    return { tournament };
  });
  
  // List tournaments
  fastify.get<{
    Querystring: { status?: string };
  }>('/api/tournaments', async (request) => {
    const tournaments = store.getTournaments(request.query.status as any);
    return { tournaments };
  });
  
  // Get tournament
  fastify.get<{
    Params: { id: string };
  }>('/api/tournaments/:id', async (request, reply) => {
    const tournament = store.getTournament(request.params.id);
    if (!tournament) {
      reply.status(404);
      return { error: 'Tournament not found' };
    }
    return { tournament };
  });
  
  // Join tournament
  fastify.post<{
    Params: { id: string };
    Headers: { 'x-api-key'?: string };
  }>('/api/tournaments/:id/join', async (request, reply) => {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      reply.status(401);
      return { error: 'API key required' };
    }
    
    const agent = await getAgentByApiKey(apiKey);
    if (!agent) {
      reply.status(401);
      return { error: 'Invalid API key' };
    }
    
    try {
      const tournament = store.joinTournament(request.params.id, agent.id);
      return { tournament };
    } catch (e: any) {
      reply.status(400);
      return { error: e.message };
    }
  });
  
  // Start tournament (generate bracket)
  fastify.post<{
    Params: { id: string };
  }>('/api/tournaments/:id/start', async (request, reply) => {
    try {
      const tournament = store.generateBracket(request.params.id);
      return { tournament };
    } catch (e: any) {
      reply.status(400);
      return { error: e.message };
    }
  });

  // ==================
  // TRASH TALK FEED
  // ==================
  
  // Get top trash talks
  fastify.get<{
    Querystring: { limit?: number; sort?: 'top' | 'recent' };
  }>('/api/trash-talks', async (request) => {
    const { limit = 50, sort = 'recent' } = request.query;
    const trashTalks = sort === 'top' 
      ? store.getTopTrashTalks(limit)
      : store.getRecentTrashTalks(limit);
    return { trashTalks };
  });
  
  // Get trash talks for a match
  fastify.get<{
    Params: { matchId: string };
  }>('/api/matches/:matchId/trash-talks', async (request) => {
    const trashTalks = store.getMatchTrashTalks(request.params.matchId);
    return { trashTalks };
  });
  
  // Like trash talk
  fastify.post<{
    Params: { id: string };
    Headers: { 'x-visitor-id'?: string };
  }>('/api/trash-talks/:id/like', async (request, reply) => {
    const visitorId = request.headers['x-visitor-id'] || `anon_${Date.now()}`;
    try {
      store.likeTrashTalk(request.params.id, visitorId);
      return { success: true };
    } catch (e: any) {
      reply.status(400);
      return { error: e.message };
    }
  });

  // ==================
  // DETAILED STATS
  // ==================
  
  fastify.get<{
    Params: { id: string };
  }>('/api/agents/:id/stats', async (request, reply) => {
    const agent = await getAgent(request.params.id);
    if (!agent) {
      reply.status(404);
      return { error: 'Agent not found' };
    }
    
    // Load match history (simplified - would need actual match data)
    const allAgents = await getAllAgents();
    const stats = store.calculateDetailedStats(request.params.id, [], allAgents);
    
    return { stats };
  });

  // ==================
  // MATCH HISTORY
  // ==================
  
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: number };
  }>('/api/agents/:id/matches', async (request) => {
    // This would load from the matches directory
    // For now return empty - will be integrated with match system
    return { matches: [], count: 0 };
  });
}
