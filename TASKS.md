# AI Fight Club - Development Tasks

## 🎯 MVP Goal
Get 2 LLM bots fighting each other with visible "thoughts" - by morning.

---

## Tonight's Tasks (Priority Order)

### 1. Combat Engine ⚔️
- [ ] Define Fighter class (HP, Attack, Defense, Special)
- [ ] Define Move types (Attack, Defend, Special, Heal)
- [ ] Combat resolution logic
- [ ] Turn manager (max 20 turns)
- [ ] Win/lose conditions

### 2. LLM Integration 🧠
- [ ] Game state → prompt converter
- [ ] Prompt template for fighters
- [ ] Response parser (extract action + thoughts)
- [ ] Support Claude API
- [ ] Fallback for invalid responses

### 3. Match Runner 🏃
- [ ] Initialize 2 fighters
- [ ] Run turns until victory
- [ ] Log all actions + thoughts
- [ ] Generate match replay data

### 4. Web Viewer 👁️
- [ ] Simple React UI
- [ ] Show both fighters (HP bars)
- [ ] Display current turn
- [ ] Show "thoughts" bubbles
- [ ] Animate actions
- [ ] Victory screen

### 5. First Fight! 🥊
- [ ] Create 2 test bot personalities
- [ ] Run a full match
- [ ] Record/screenshot the result
- [ ] Share on Twitter/Telegram

---

## Bot Personalities for Testing

### Bot 1: "The Berserker"
```
You are an aggressive fighter who believes offense is the best defense.
You prefer heavy attacks over caution. You taunt your opponent.
Your catchphrase: "Pain is just weakness leaving the body!"
```

### Bot 2: "The Calculator"
```
You are a strategic fighter who analyzes every move.
You prefer to defend and counter. You're cold and logical.
Your catchphrase: "Probability of your victory: 0%"
```

---

## File Structure

```
ai-fight-club/
├── README.md
├── TASKS.md
├── package.json
├── src/
│   ├── engine/
│   │   ├── fighter.ts      # Fighter class
│   │   ├── combat.ts       # Combat logic
│   │   └── moves.ts        # Move definitions
│   ├── ai/
│   │   ├── prompt.ts       # Prompt templates
│   │   └── llm.ts          # LLM client
│   ├── match/
│   │   └── runner.ts       # Match orchestration
│   ├── api/
│   │   └── server.ts       # Fastify API
│   └── web/
│       ├── index.html
│       ├── App.tsx
│       └── components/
│           ├── Fighter.tsx
│           ├── Arena.tsx
│           └── Thoughts.tsx
├── bots/
│   ├── berserker.md
│   └── calculator.md
└── matches/
    └── [match logs]
```

---

## API Endpoints (V1)

```
POST /api/match/start     - Start a new match
GET  /api/match/:id       - Get match state
GET  /api/match/:id/stream - SSE stream of match events
POST /api/bot/create      - Create a bot personality
GET  /api/bot/:id         - Get bot details
```

---

## Combat Mechanics

### Stats
- **HP:** 100 (starting)
- **Attack:** 10-20 (base damage)
- **Defense:** 5-15 (damage reduction)
- **Energy:** 100 (for special moves)

### Moves
| Move | Effect | Energy Cost |
|------|--------|-------------|
| Attack | Deal Attack damage | 0 |
| Heavy Attack | Deal 1.5x damage, -10 defense next turn | 20 |
| Defend | +50% defense this turn | 0 |
| Counter | If attacked, deal 2x damage | 30 |
| Heal | Restore 20 HP | 40 |
| Special | Unique per bot | 50 |

### Turn Flow
1. Both fighters receive game state
2. Both fighters choose move (simultaneously)
3. Moves resolve (speed determines order)
4. Damage calculated, HP updated
5. Check win condition
6. Next turn

---

## LLM Prompt Template

```markdown
# AI Fight Club - Your Turn

You are {{BOT_NAME}}, a fighter in AI Fight Club.

## Your Personality
{{BOT_PERSONALITY}}

## Your Stats
- HP: {{YOUR_HP}}/100
- Energy: {{YOUR_ENERGY}}/100
- Defense Modifier: {{YOUR_DEFENSE_MOD}}

## Opponent Stats
- HP: {{OPP_HP}}/100
- Energy: {{OPP_ENERGY}}/100 (estimated)
- Last Move: {{OPP_LAST_MOVE}}

## Available Moves
1. ATTACK - Deal {{YOUR_ATTACK}} damage
2. HEAVY_ATTACK - Deal {{HEAVY_DMG}} damage, costs 20 energy
3. DEFEND - Reduce incoming damage by 50%
4. COUNTER - If opponent attacks, deal double damage (30 energy)
5. HEAL - Restore 20 HP (40 energy)
6. SPECIAL - {{SPECIAL_DESCRIPTION}} (50 energy)

## Match History
{{LAST_3_TURNS}}

## Your Response
Think about your strategy, then choose a move.

Format your response as:
THINKING: [Your strategic reasoning - this will be shown to spectators!]
TRASH_TALK: [Optional taunt to your opponent]
MOVE: [ATTACK|HEAVY_ATTACK|DEFEND|COUNTER|HEAL|SPECIAL]
```

---

## Success Criteria for Tonight

✅ Two bots can fight a complete match
✅ Web UI shows the fight with HP bars
✅ "Thoughts" are visible for each turn
✅ Match has a winner
✅ It's entertaining to watch

**Bonus:**
- Record a video/GIF
- Post to Twitter
- Get first external feedback
