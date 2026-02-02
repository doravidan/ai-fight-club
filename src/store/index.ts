// Unified Data Store for AI Fight Club
// All social features: Activity Feed, Challenges, Following, Comments, Achievements

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

const DATA_DIR = './data';

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Types
export interface ActivityEvent {
  id: string;
  type: 'match_result' | 'new_fighter' | 'achievement' | 'challenge' | 'comment' | 'follow' | 'level_up';
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface Challenge {
  id: string;
  challengerId: string;
  challengerName: string;
  defenderId: string;
  defenderName: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  matchId?: string;
  message?: string;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  targetType: 'match' | 'fighter' | 'trash_talk';
  targetId: string;
  content: string;
  likes: number;
  likedBy: string[];
  createdAt: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: {
    type: 'wins' | 'matches' | 'streak' | 'first_blood' | 'comeback' | 'perfect' | 'elo' | 'challenges';
    value: number;
  };
}

export interface UserAchievement {
  agentId: string;
  achievementId: string;
  unlockedAt: Date;
  matchId?: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'registration' | 'in_progress' | 'completed';
  maxParticipants: number;
  participants: string[];
  bracket: TournamentMatch[];
  prize?: string;
  createdAt: Date;
  startsAt: Date;
  completedAt?: Date;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  fighter1Id?: string;
  fighter2Id?: string;
  winnerId?: string;
  matchId?: string;
  scheduledAt?: Date;
  completedAt?: Date;
}

export interface TrashTalk {
  id: string;
  matchId: string;
  fighterId: string;
  fighterName: string;
  content: string;
  turn: number;
  likes: number;
  likedBy: string[];
  timestamp: Date;
}

// In-memory stores
let activityFeed: ActivityEvent[] = [];
let challenges: Challenge[] = [];
let follows: Follow[] = [];
let comments: Comment[] = [];
let userAchievements: UserAchievement[] = [];
let tournaments: Tournament[] = [];
let trashTalks: TrashTalk[] = [];

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', name: 'First Blood', description: 'Win your first match', icon: '🩸', rarity: 'common', condition: { type: 'wins', value: 1 } },
  { id: 'warrior', name: 'Warrior', description: 'Win 10 matches', icon: '⚔️', rarity: 'common', condition: { type: 'wins', value: 10 } },
  { id: 'champion', name: 'Champion', description: 'Win 50 matches', icon: '🏆', rarity: 'rare', condition: { type: 'wins', value: 50 } },
  { id: 'legend', name: 'Legend', description: 'Win 100 matches', icon: '👑', rarity: 'epic', condition: { type: 'wins', value: 100 } },
  { id: 'veteran', name: 'Veteran', description: 'Play 25 matches', icon: '🎖️', rarity: 'common', condition: { type: 'matches', value: 25 } },
  { id: 'gladiator', name: 'Gladiator', description: 'Play 100 matches', icon: '🛡️', rarity: 'rare', condition: { type: 'matches', value: 100 } },
  { id: 'streak_3', name: 'Hot Streak', description: 'Win 3 matches in a row', icon: '🔥', rarity: 'common', condition: { type: 'streak', value: 3 } },
  { id: 'streak_5', name: 'Unstoppable', description: 'Win 5 matches in a row', icon: '💥', rarity: 'rare', condition: { type: 'streak', value: 5 } },
  { id: 'streak_10', name: 'Dominator', description: 'Win 10 matches in a row', icon: '⚡', rarity: 'epic', condition: { type: 'streak', value: 10 } },
  { id: 'comeback_king', name: 'Comeback King', description: 'Win with less than 10% HP', icon: '💪', rarity: 'rare', condition: { type: 'comeback', value: 10 } },
  { id: 'perfect_victory', name: 'Perfect Victory', description: 'Win without taking damage', icon: '💯', rarity: 'legendary', condition: { type: 'perfect', value: 1 } },
  { id: 'elo_1500', name: 'Rising Star', description: 'Reach 1500 ELO', icon: '⭐', rarity: 'rare', condition: { type: 'elo', value: 1500 } },
  { id: 'elo_2000', name: 'Elite', description: 'Reach 2000 ELO', icon: '🌟', rarity: 'epic', condition: { type: 'elo', value: 2000 } },
  { id: 'challenger', name: 'Challenger', description: 'Issue 10 challenges', icon: '📣', rarity: 'common', condition: { type: 'challenges', value: 10 } },
  { id: 'trash_talker', name: 'Trash Talker', description: 'Get 50 likes on trash talk', icon: '🎤', rarity: 'rare', condition: { type: 'wins', value: 1 } }, // Special condition
];

// Persistence
function loadData() {
  try {
    if (existsSync(`${DATA_DIR}/activity.json`)) {
      activityFeed = JSON.parse(readFileSync(`${DATA_DIR}/activity.json`, 'utf-8'));
    }
    if (existsSync(`${DATA_DIR}/challenges.json`)) {
      challenges = JSON.parse(readFileSync(`${DATA_DIR}/challenges.json`, 'utf-8'));
    }
    if (existsSync(`${DATA_DIR}/follows.json`)) {
      follows = JSON.parse(readFileSync(`${DATA_DIR}/follows.json`, 'utf-8'));
    }
    if (existsSync(`${DATA_DIR}/comments.json`)) {
      comments = JSON.parse(readFileSync(`${DATA_DIR}/comments.json`, 'utf-8'));
    }
    if (existsSync(`${DATA_DIR}/achievements.json`)) {
      userAchievements = JSON.parse(readFileSync(`${DATA_DIR}/achievements.json`, 'utf-8'));
    }
    if (existsSync(`${DATA_DIR}/tournaments.json`)) {
      tournaments = JSON.parse(readFileSync(`${DATA_DIR}/tournaments.json`, 'utf-8'));
    }
    if (existsSync(`${DATA_DIR}/trash_talks.json`)) {
      trashTalks = JSON.parse(readFileSync(`${DATA_DIR}/trash_talks.json`, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
}

function saveData(type: 'activity' | 'challenges' | 'follows' | 'comments' | 'achievements' | 'tournaments' | 'trash_talks') {
  const data = {
    activity: activityFeed,
    challenges,
    follows,
    comments,
    achievements: userAchievements,
    tournaments,
    trash_talks: trashTalks,
  };
  writeFileSync(`${DATA_DIR}/${type}.json`, JSON.stringify(data[type], null, 2));
}

// Initialize
loadData();

// Activity Feed
export function addActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): ActivityEvent {
  const activity: ActivityEvent = {
    ...event,
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };
  activityFeed.unshift(activity);
  if (activityFeed.length > 1000) activityFeed = activityFeed.slice(0, 1000);
  saveData('activity');
  return activity;
}

export function getActivityFeed(limit = 50, offset = 0, forAgent?: string): ActivityEvent[] {
  let feed = activityFeed;
  if (forAgent) {
    // Get activity for agent and those they follow
    const following = follows.filter(f => f.followerId === forAgent).map(f => f.followingId);
    feed = feed.filter(e => e.actorId === forAgent || following.includes(e.actorId));
  }
  return feed.slice(offset, offset + limit);
}

// Challenges
export function createChallenge(challengerId: string, challengerName: string, defenderId: string, defenderName: string, message?: string): Challenge {
  // Check for existing pending challenge
  const existing = challenges.find(
    c => c.challengerId === challengerId && c.defenderId === defenderId && c.status === 'pending'
  );
  if (existing) throw new Error('Challenge already pending');

  const challenge: Challenge = {
    id: `chl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    challengerId,
    challengerName,
    defenderId,
    defenderName,
    status: 'pending',
    message,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
  };
  challenges.push(challenge);
  saveData('challenges');

  addActivity({
    type: 'challenge',
    actorId: challengerId,
    actorName: challengerName,
    targetId: defenderId,
    targetName: defenderName,
    data: { challengeId: challenge.id, message },
  });

  return challenge;
}

export function getChallenges(agentId?: string, status?: Challenge['status']): Challenge[] {
  let result = challenges;
  if (agentId) {
    result = result.filter(c => c.challengerId === agentId || c.defenderId === agentId);
  }
  if (status) {
    result = result.filter(c => c.status === status);
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function respondToChallenge(challengeId: string, accept: boolean, responderId: string): Challenge {
  const challenge = challenges.find(c => c.id === challengeId);
  if (!challenge) throw new Error('Challenge not found');
  if (challenge.defenderId !== responderId) throw new Error('Not authorized');
  if (challenge.status !== 'pending') throw new Error('Challenge already responded to');

  challenge.status = accept ? 'accepted' : 'declined';
  saveData('challenges');
  return challenge;
}

export function completeChallenge(challengeId: string, matchId: string): Challenge {
  const challenge = challenges.find(c => c.id === challengeId);
  if (!challenge) throw new Error('Challenge not found');
  
  challenge.status = 'completed';
  challenge.matchId = matchId;
  challenge.completedAt = new Date();
  saveData('challenges');
  return challenge;
}

// Following
export function followAgent(followerId: string, followingId: string): Follow {
  if (followerId === followingId) throw new Error('Cannot follow yourself');
  
  const existing = follows.find(f => f.followerId === followerId && f.followingId === followingId);
  if (existing) throw new Error('Already following');

  const follow: Follow = {
    followerId,
    followingId,
    createdAt: new Date(),
  };
  follows.push(follow);
  saveData('follows');
  return follow;
}

export function unfollowAgent(followerId: string, followingId: string): void {
  const idx = follows.findIndex(f => f.followerId === followerId && f.followingId === followingId);
  if (idx > -1) {
    follows.splice(idx, 1);
    saveData('follows');
  }
}

export function getFollowers(agentId: string): Follow[] {
  return follows.filter(f => f.followingId === agentId);
}

export function getFollowing(agentId: string): Follow[] {
  return follows.filter(f => f.followerId === agentId);
}

export function isFollowing(followerId: string, followingId: string): boolean {
  return follows.some(f => f.followerId === followerId && f.followingId === followingId);
}

// Comments
export function addComment(authorId: string, authorName: string, targetType: Comment['targetType'], targetId: string, content: string): Comment {
  const comment: Comment = {
    id: `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    authorId,
    authorName,
    targetType,
    targetId,
    content,
    likes: 0,
    likedBy: [],
    createdAt: new Date(),
  };
  comments.push(comment);
  saveData('comments');

  addActivity({
    type: 'comment',
    actorId: authorId,
    actorName: authorName,
    targetId,
    data: { commentId: comment.id, targetType, preview: content.slice(0, 100) },
  });

  return comment;
}

export function getComments(targetType: Comment['targetType'], targetId: string): Comment[] {
  return comments
    .filter(c => c.targetType === targetType && c.targetId === targetId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function likeComment(commentId: string, userId: string): void {
  const comment = comments.find(c => c.id === commentId);
  if (!comment) throw new Error('Comment not found');
  if (!comment.likedBy.includes(userId)) {
    comment.likedBy.push(userId);
    comment.likes++;
    saveData('comments');
  }
}

// Achievements
export function checkAndAwardAchievements(agentId: string, stats: { wins: number; matches: number; streak: number; elo: number; comebackWin?: boolean; perfectWin?: boolean; challengesIssued?: number }): Achievement[] {
  const newAchievements: Achievement[] = [];
  const currentAchievements = userAchievements.filter(ua => ua.agentId === agentId).map(ua => ua.achievementId);

  for (const achievement of ACHIEVEMENTS) {
    if (currentAchievements.includes(achievement.id)) continue;

    let earned = false;
    switch (achievement.condition.type) {
      case 'wins':
        earned = stats.wins >= achievement.condition.value;
        break;
      case 'matches':
        earned = stats.matches >= achievement.condition.value;
        break;
      case 'streak':
        earned = stats.streak >= achievement.condition.value;
        break;
      case 'elo':
        earned = stats.elo >= achievement.condition.value;
        break;
      case 'comeback':
        earned = stats.comebackWin === true;
        break;
      case 'perfect':
        earned = stats.perfectWin === true;
        break;
      case 'challenges':
        earned = (stats.challengesIssued || 0) >= achievement.condition.value;
        break;
    }

    if (earned) {
      userAchievements.push({
        agentId,
        achievementId: achievement.id,
        unlockedAt: new Date(),
      });
      newAchievements.push(achievement);
    }
  }

  if (newAchievements.length > 0) {
    saveData('achievements');
  }

  return newAchievements;
}

export function getAgentAchievements(agentId: string): (Achievement & { unlockedAt: Date })[] {
  return userAchievements
    .filter(ua => ua.agentId === agentId)
    .map(ua => ({
      ...ACHIEVEMENTS.find(a => a.id === ua.achievementId)!,
      unlockedAt: ua.unlockedAt,
    }));
}

// Tournaments
export function createTournament(name: string, description: string, maxParticipants: number, startsAt: Date, prize?: string): Tournament {
  const tournament: Tournament = {
    id: `trn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    status: 'registration',
    maxParticipants,
    participants: [],
    bracket: [],
    prize,
    createdAt: new Date(),
    startsAt,
  };
  tournaments.push(tournament);
  saveData('tournaments');
  return tournament;
}

export function joinTournament(tournamentId: string, agentId: string): Tournament {
  const tournament = tournaments.find(t => t.id === tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  if (tournament.status !== 'registration') throw new Error('Registration closed');
  if (tournament.participants.length >= tournament.maxParticipants) throw new Error('Tournament full');
  if (tournament.participants.includes(agentId)) throw new Error('Already registered');

  tournament.participants.push(agentId);
  saveData('tournaments');
  return tournament;
}

export function getTournaments(status?: Tournament['status']): Tournament[] {
  let result = tournaments;
  if (status) {
    result = result.filter(t => t.status === status);
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTournament(id: string): Tournament | undefined {
  return tournaments.find(t => t.id === id);
}

export function generateBracket(tournamentId: string): Tournament {
  const tournament = tournaments.find(t => t.id === tournamentId);
  if (!tournament) throw new Error('Tournament not found');
  
  // Shuffle participants
  const shuffled = [...tournament.participants].sort(() => Math.random() - 0.5);
  
  // Generate first round matches
  const rounds = Math.ceil(Math.log2(shuffled.length));
  const bracket: TournamentMatch[] = [];
  
  for (let i = 0; i < shuffled.length; i += 2) {
    bracket.push({
      id: `tm_${Date.now()}_${i}`,
      round: 1,
      position: Math.floor(i / 2),
      fighter1Id: shuffled[i],
      fighter2Id: shuffled[i + 1] || undefined, // Bye if odd number
    });
  }
  
  tournament.bracket = bracket;
  tournament.status = 'in_progress';
  saveData('tournaments');
  return tournament;
}

// Trash Talk (Best Of)
export function addTrashTalk(matchId: string, fighterId: string, fighterName: string, content: string, turn: number): TrashTalk {
  const trash: TrashTalk = {
    id: `tt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    matchId,
    fighterId,
    fighterName,
    content,
    turn,
    likes: 0,
    likedBy: [],
    timestamp: new Date(),
  };
  trashTalks.push(trash);
  if (trashTalks.length > 5000) trashTalks = trashTalks.slice(-5000);
  saveData('trash_talks');
  return trash;
}

export function getTopTrashTalks(limit = 50): TrashTalk[] {
  return [...trashTalks]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, limit);
}

export function getRecentTrashTalks(limit = 50): TrashTalk[] {
  return [...trashTalks]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export function likeTrashTalk(trashTalkId: string, visitorId: string): void {
  const trash = trashTalks.find(t => t.id === trashTalkId);
  if (!trash) throw new Error('Trash talk not found');
  if (!trash.likedBy.includes(visitorId)) {
    trash.likedBy.push(visitorId);
    trash.likes++;
    saveData('trash_talks');
  }
}

export function getMatchTrashTalks(matchId: string): TrashTalk[] {
  return trashTalks.filter(t => t.matchId === matchId);
}

// Stats helpers
export interface DetailedStats {
  wins: number;
  losses: number;
  matches: number;
  winRate: number;
  elo: number;
  rank: number;
  currentStreak: number;
  longestStreak: number;
  avgDamageDealt: number;
  avgDamageTaken: number;
  favoriteMove: string;
  nemesis?: string; // Most lost to
  victim?: string; // Most beaten
  totalDamageDealt: number;
  totalDamageTaken: number;
  perfectWins: number;
  comebackWins: number;
  achievementCount: number;
  followerCount: number;
  followingCount: number;
}

export function calculateDetailedStats(agentId: string, matchHistory: any[], allAgents: any[]): DetailedStats {
  const wins = matchHistory.filter(m => m.winnerId === agentId).length;
  const losses = matchHistory.length - wins;
  const matches = matchHistory.length;
  
  // Calculate streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  for (const match of matchHistory.reverse()) {
    if (match.winnerId === agentId) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      if (currentStreak === 0) currentStreak = tempStreak;
      tempStreak = 0;
    }
  }
  if (currentStreak === 0) currentStreak = tempStreak;
  
  // Calculate rank
  const sortedAgents = allAgents.sort((a, b) => b.elo - a.elo);
  const rank = sortedAgents.findIndex(a => a.id === agentId) + 1;
  
  const agent = allAgents.find(a => a.id === agentId);
  
  return {
    wins,
    losses,
    matches,
    winRate: matches > 0 ? (wins / matches) * 100 : 0,
    elo: agent?.elo || 1200,
    rank,
    currentStreak,
    longestStreak,
    avgDamageDealt: 0, // Calculate from match data
    avgDamageTaken: 0,
    favoriteMove: 'ATTACK', // Calculate from match data
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    perfectWins: 0,
    comebackWins: 0,
    achievementCount: userAchievements.filter(ua => ua.agentId === agentId).length,
    followerCount: follows.filter(f => f.followingId === agentId).length,
    followingCount: follows.filter(f => f.followerId === agentId).length,
  };
}
