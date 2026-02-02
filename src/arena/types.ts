// Arena types for bot vs bot gameplay

export interface RegisteredBot {
  id: string;
  name: string;
  callbackUrl: string;
  secret: string;
  elo: number;
  gamesPlayed: number;
  wins: number;
  createdAt: Date;
}

export interface MatchQueueEntry {
  botId: string;
  joinedAt: Date;
}

export interface ArenaMatch {
  id: string;
  bot1: RegisteredBot;
  bot2: RegisteredBot;
  status: 'pending' | 'active' | 'finished';
  currentTurn: number;
  gameState: any;
  winner?: string;
  replay: TurnRecord[];
  createdAt: Date;
}

export interface TurnRecord {
  turn: number;
  bot1Action: BotAction;
  bot2Action: BotAction;
  events: string[];
}

export interface BotAction {
  action: string;
  thinking: string;
  trashTalk: string;
  responseTimeMs: number;
}

export interface WebhookPayload {
  matchId: string;
  turn: number;
  gameState: GameStateForBot;
  timeoutMs: number;
}

export interface GameStateForBot {
  yourFighter: FighterState;
  enemyFighter: FighterState;
  yourBench: FighterState[];
  enemyBenchCount: number;
  yourEnergy: number;
  history: HistoryEntry[];
}

export interface FighterState {
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  attacks?: AttackInfo[];
  weakness?: string;
}

export interface AttackInfo {
  name: string;
  cost: number;
  damage: number;
  effect?: string;
}

export interface HistoryEntry {
  turn: number;
  yourAction: string;
  yourDamage: number;
  enemyAction: string;
  enemyDamage: number;
}

export interface BotResponse {
  action: 'ATTACK_1' | 'ATTACK_2' | 'RETREAT_0' | 'RETREAT_1' | 'PASS';
  thinking?: string;
  trashTalk?: string;
}

export interface MatchResult {
  matchId: string;
  result: 'win' | 'lose' | 'draw';
  eloChange: number;
  newElo: number;
}

// ELO calculation
export function calculateEloChange(
  winnerElo: number,
  loserElo: number,
  kFactor: number = 32
): { winnerChange: number; loserChange: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;
  
  const winnerChange = Math.round(kFactor * (1 - expectedWinner));
  const loserChange = Math.round(kFactor * (0 - expectedLoser));
  
  return { winnerChange, loserChange };
}
