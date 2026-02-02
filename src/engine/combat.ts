// Pokemon-style combat logic for AI Fight Club v2

import { 
  FighterCard, Player, TurnAction, TurnResult, 
  TYPE_CHART, WEAKNESS_BONUS, ElementType, Attack 
} from './types.js';

// Check if attacker has type advantage
export function hasTypeAdvantage(attackerType: ElementType, defenderWeakness: ElementType): boolean {
  return TYPE_CHART[attackerType] === defenderWeakness || attackerType === defenderWeakness;
}

// Calculate damage with type advantage
export function calculateDamage(
  attack: Attack, 
  attackerType: ElementType, 
  defender: FighterCard
): { damage: number; superEffective: boolean } {
  let damage = attack.damage;
  const superEffective = attackerType === defender.weakness;
  
  if (superEffective) {
    damage += WEAKNESS_BONUS;
  }
  
  return { damage, superEffective };
}

// Execute an attack
export function executeAttack(
  attacker: FighterCard,
  defender: FighterCard,
  attackIndex: number,
  attackerEnergy: number
): { damage: number; energyUsed: number; effect?: string; description: string; superEffective: boolean } {
  const attack = attacker.attacks[attackIndex];
  
  if (!attack) {
    return { damage: 0, energyUsed: 0, description: 'Invalid attack!', superEffective: false };
  }
  
  if (attackerEnergy < attack.energyCost) {
    return { damage: 0, energyUsed: 0, description: `Not enough energy for ${attack.name}!`, superEffective: false };
  }
  
  const { damage, superEffective } = calculateDamage(attack, attacker.type, defender);
  
  let description = `${attacker.name} uses ${attack.name}! `;
  if (superEffective) {
    description += "It's SUPER EFFECTIVE! ";
  }
  description += `${damage} damage!`;
  
  let effectDesc = '';
  if (attack.effect) {
    switch (attack.effect) {
      case 'burn':
        effectDesc = `${defender.name} is BURNED!`;
        break;
      case 'paralyze':
        effectDesc = `${defender.name} is PARALYZED!`;
        break;
      case 'heal':
        effectDesc = `${attacker.name} heals ${attack.effectValue} HP!`;
        break;
      case 'energyBoost':
        effectDesc = `${attacker.name} gains ${attack.effectValue} bonus energy!`;
        break;
      case 'shield':
        effectDesc = `${attacker.name} raises a shield!`;
        break;
    }
  }
  
  return { 
    damage, 
    energyUsed: attack.energyCost, 
    effect: attack.effect,
    description: description + (effectDesc ? ' ' + effectDesc : ''),
    superEffective
  };
}

// Process a full turn
export function processTurn(
  player1: Player,
  player2: Player,
  action1: TurnAction,
  action2: TurnAction,
  thinking1: string,
  thinking2: string,
  trash1: string,
  trash2: string,
  turnNumber: number
): { result: TurnResult; p1KO: boolean; p2KO: boolean } {
  const events: string[] = [];
  let p1Damage = 0;
  let p2Damage = 0;
  let p1Effect: string | undefined;
  let p2Effect: string | undefined;
  
  // Add energy at start of turn
  player1.energy = Math.min(5, player1.energy + 1);
  player2.energy = Math.min(5, player2.energy + 1);
  events.push(`⚡ Both players gain 1 energy`);

  // Process Player 1 action
  if (action1.type === 'attack' && player1.active && player2.active && action1.attackIndex !== undefined) {
    const result = executeAttack(player1.active, player2.active, action1.attackIndex, player1.energy);
    p1Damage = result.damage;
    p1Effect = result.effect;
    player1.energy -= result.energyUsed;
    player2.active.hp = Math.max(0, player2.active.hp - result.damage);
    
    // Handle heal effect
    if (result.effect === 'heal' && player1.active.attacks[action1.attackIndex].effectValue) {
      player1.active.hp = Math.min(
        player1.active.maxHp, 
        player1.active.hp + player1.active.attacks[action1.attackIndex].effectValue!
      );
    }
    
    events.push(result.description);
  } else if (action1.type === 'retreat' && action1.benchIndex !== undefined) {
    if (player1.energy >= (player1.active?.retreatCost || 0)) {
      const oldActive = player1.active;
      player1.active = player1.bench[action1.benchIndex];
      if (oldActive) {
        player1.bench[action1.benchIndex] = oldActive;
      }
      player1.energy -= oldActive?.retreatCost || 0;
      events.push(`${player1.name} retreats ${oldActive?.name} and sends out ${player1.active?.name}!`);
    }
  }

  // Process Player 2 action
  if (action2.type === 'attack' && player2.active && player1.active && action2.attackIndex !== undefined) {
    const result = executeAttack(player2.active, player1.active, action2.attackIndex, player2.energy);
    p2Damage = result.damage;
    p2Effect = result.effect;
    player2.energy -= result.energyUsed;
    player1.active.hp = Math.max(0, player1.active.hp - result.damage);
    
    // Handle heal effect
    if (result.effect === 'heal' && player2.active.attacks[action2.attackIndex].effectValue) {
      player2.active.hp = Math.min(
        player2.active.maxHp, 
        player2.active.hp + player2.active.attacks[action2.attackIndex].effectValue!
      );
    }
    
    events.push(result.description);
  } else if (action2.type === 'retreat' && action2.benchIndex !== undefined) {
    if (player2.energy >= (player2.active?.retreatCost || 0)) {
      const oldActive = player2.active;
      player2.active = player2.bench[action2.benchIndex];
      if (oldActive) {
        player2.bench[action2.benchIndex] = oldActive;
      }
      player2.energy -= oldActive?.retreatCost || 0;
      events.push(`${player2.name} retreats ${oldActive?.name} and sends out ${player2.active?.name}!`);
    }
  }

  // Check for knockouts
  let p1KO = false;
  let p2KO = false;
  
  if (player2.active && player2.active.hp <= 0) {
    events.push(`💀 ${player2.active.name} is KNOCKED OUT!`);
    player1.knockouts++;
    p2KO = true;
    
    // Send out next from bench
    const nextFighter = player2.bench.find(f => f.hp > 0);
    if (nextFighter) {
      player2.bench = player2.bench.filter(f => f !== nextFighter);
      player2.active = nextFighter;
      events.push(`${player2.name} sends out ${nextFighter.name}!`);
    } else {
      player2.active = null;
    }
  }
  
  if (player1.active && player1.active.hp <= 0) {
    events.push(`💀 ${player1.active.name} is KNOCKED OUT!`);
    player2.knockouts++;
    p1KO = true;
    
    // Send out next from bench
    const nextFighter = player1.bench.find(f => f.hp > 0);
    if (nextFighter) {
      player1.bench = player1.bench.filter(f => f !== nextFighter);
      player1.active = nextFighter;
      events.push(`${player1.name} sends out ${nextFighter.name}!`);
    } else {
      player1.active = null;
    }
  }

  const result: TurnResult = {
    turn: turnNumber,
    player1: {
      name: player1.name,
      fighter: player1.active?.name || 'None',
      action: action1,
      thinking: thinking1,
      trashTalk: trash1,
      damage: p1Damage,
      effectTriggered: p1Effect,
    },
    player2: {
      name: player2.name,
      fighter: player2.active?.name || 'None',
      action: action2,
      thinking: thinking2,
      trashTalk: trash2,
      damage: p2Damage,
      effectTriggered: p2Effect,
    },
    events,
  };

  return { result, p1KO, p2KO };
}

// Check if match is over (one player has no fighters left)
export function checkWinner(player1: Player, player2: Player): string | null {
  const p1HasFighters = player1.active !== null || player1.bench.some(f => f.hp > 0);
  const p2HasFighters = player2.active !== null || player2.bench.some(f => f.hp > 0);
  
  if (!p1HasFighters && !p2HasFighters) {
    return 'DRAW';
  }
  if (!p2HasFighters) {
    return player1.name;
  }
  if (!p1HasFighters) {
    return player2.name;
  }
  
  // Also win by 3 knockouts
  if (player1.knockouts >= 3) {
    return player1.name;
  }
  if (player2.knockouts >= 3) {
    return player2.name;
  }
  
  return null;
}
