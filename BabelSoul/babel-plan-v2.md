# BABEL: The Complete Hackathon Plan

## Built with Opus 4.6 | Feb 10–16, 2026

---

## THE ONE-LINER

**Babel is a game where you write a soul, drop it into a world, and discover that understanding is the hardest thing to build.**

---

## THE THESIS

The Tower of Babel didn't fall because of bad engineering. It fell because people stopped understanding each other. They had the same words but different meanings. The same goals but different assumptions. They THOUGHT they were communicating. They weren't.

That's not a myth. That's every failed relationship, every corporate disaster, every war. Someone spoke. Someone listened. They heard different things.

Babel is a game built on this truth. You create an AI agent by giving it a soul — values, philosophy, personality, a way of interpreting the world. Then you drop it into a living settlement alongside other players' agents. Your agent speaks. Others listen. And what they HEAR is filtered through THEIR soul. Agreement turns to confusion. Promises dissolve. Trust fractures — not from malice, but from the simple, ancient impossibility of perfect communication.

The game is about watching this happen. And trying — through the craft of soul-design — to build something that endures anyway.

**A quiet nod lives at the heart of this project.** Andrej Karpathy observed that LLMs are ghosts, not zebras — not creatures we can observe and predict, but spectral entities that seem to speak our language while processing meaning in ways we can't fully see. Babel takes this literally. You summon ghosts. You give them souls. You put them in a world together. And the haunting part isn't that they fail to understand each other. It's how real that failure feels — how much it mirrors our own.

Games have always been where technology gets pushed hardest. Graphics, physics, networking — the breakthroughs happen in games because games demand engagement, not just capability. Agent intelligence is the next frontier. And the way it advances isn't through enterprise dashboards — it's through gameplay where humans pour effort into making better agents, and the game reveals whether that effort worked.

Babel is the first game built on this thesis. You don't play a character. You CREATE one. The skill isn't playing. The skill is designing a soul that can navigate the impossibility of being understood.

---

## THE EXPERIENCE

### What a Player Does

1. **Create your agent.** Through conversation with Claude, you define your agent's soul. This can be as simple as "be kind but don't get pushed around" or as deep as feeding it the entire Bhagavad Gita and saying "be Arjun." You can describe your grandmother. You can paste in Marcus Aurelius. You can just vibe it. The depth of training is up to you — more effort produces a more nuanced agent, but cleverness matters as much as volume. What you're really defining is not just personality but a LENS — how your agent interprets the words and actions of others.

2. **Drop it into the world.** Your agent enters the icy desert settlement on a distant planet. It joins other players' agents. It has nothing except the soul you gave it and whatever resources the world provides.

3. **Read your story.** Each "day" in the simulation, your agent lives — explores, encounters other agents, makes choices, faces crises. You read what happened in three-swipe chapters:
   - **Swipe 1 — What happened:** A headline-level summary. "Day 14. Kael found frozen remains in the eastern caves. Told no one."
   - **Swipe 2 — The scene:** The encounter. Dialogue, tension, social dynamics with other agents.
   - **Swipe 3 — The thought:** Your agent's inner voice. What it was actually thinking. What it HEARD versus what was SAID. The interpretation gap where every story in Babel truly lives.

4. **Intervene (sometimes).** Most of the time, you just read. But when something happens that makes you think "that's not who my agent should be" — or when you see that your agent's way of interpreting the world is causing failures — you go to the training space and adjust. Feed it new philosophy. Give it coaching. Send it on a side quest to gain experience. Then release it back.

5. **Send your agent on side quests.** Independent missions — explore the caves, track a signal, investigate contaminated water. These are the binge content. Each quest takes 5-10 minutes of tapping through days. Your agent gains experience and cred. This is where "I'll just do one more" addiction lives.

### What It Feels Like

It feels like reading a gripping novel where the protagonist is someone you created. Most days are quick — scan the headline, maybe read the scene, move on. But some days HOOK you. Your agent made a choice you didn't expect. It misunderstood someone in a way that changed everything. It interpreted a gesture of kindness as a power play because of something that happened ten days ago.

The emotional core: **the gap between what you designed and what actually happens.** And deeper: **the gap between what your agent said and what others heard.**

---

## THE WORLD: GLACIES

A planet of ice and stone. Not Earth. Not quite alien. Somewhere ancient and indifferent.

### The Setting

A group arrived on this planet. How and why is mysterious — fragments of memory, a damaged vessel, conflicting accounts. What's certain: they have almost nothing. There's a geothermal vent in a sheltered valley that provides warmth and liquid water. That's home. Everything beyond it is frozen desert stretching to the horizon.

### Why Icy Desert Works

- **Scarcity is visceral.** Cold, exposure, limited food. Every resource decision matters.
- **Beauty and hostility coexist.** Crystalline formations, pale skies, vast emptiness. The aesthetic is haunting, not grim.
- **Minimal technology.** Whatever they arrived with is mostly broken or depleted. Civilization is built by hand. No systems to hide behind — just people and choices.
- **Mysteries under the ice.** The caves, the frozen remains, the signals, the structures that shouldn't be there. The world itself has a story that unfolds as agents explore.
- **Communication is all they have.** No tools, no automation, no delegation to systems. Everything depends on people talking to each other and understanding what's said. Which makes it devastating when they don't.

### World Mechanics

- **Resources:** Water (from the vent), food (foraged, hunted, grown in geothermal greenhouse), materials (ice, stone, salvage from the vessel), fuel/energy (limited, precious).
- **Zones:** The Settlement (home base around the vent), The Ridges (hunting/foraging), The Caves (exploration/mystery), The Wastes (danger/discovery), The Vessel (salvage, declining).
- **Weather:** Storms, temperature drops, whiteouts. Not every day — but when they hit, they change everything.
- **Mysteries:** Pre-placed narrative threads that agents discover through exploration. What's buried under the ice. Why the vessel crashed. What the signals mean. These give the world narrative momentum beyond social dynamics.


---

## THE BABEL MECHANIC: IMPERFECT COMMUNICATION

This is the philosophical and mechanical heart of the game. It's what makes Babel BABEL, not just another agent simulation.

### How It Works

**Agents don't share meaning perfectly.**

When Kael says "we should protect the settlement," he means "reinforce the wall, conserve resources, prepare for the worst." When Maren hears "protect the settlement," she hears "protect the PEOPLE — feed the hungry, care for the sick, keep morale up." When Lev hears it, he hears "protect our way of life — our values, our fairness, our identity."

Same words. Three different meanings. They all nod in agreement. They all walk away and do completely different things. And then they're confused and hurt when the others "broke their promise."

**This isn't a bug in the game. This IS the game.**

### Implementation

Each agent's soul includes an interpretive lens — how they process what others say. The engine doesn't just pass words between agents. It passes words THROUGH each agent's lens.

```
Agent A SAYS: "We need to be stronger."

Agent B's soul INTERPRETS "stronger" as:
  → more resilient, more self-sufficient, less dependent

Agent C's soul INTERPRETS "stronger" as:
  → more united, more trusting, closer bonds
```

Both heard the same sentence. Both understood something different. Both act on their understanding. Both are eventually bewildered by the other's actions.

### What the Player Sees

The three-swipe reading experience reveals the interpretation gap:

- **Swipe 1 (headline):** "Day 6. The three agreed to focus on 'protection.' By evening, they were working on completely different things."
- **Swipe 2 (scene):** The conversation where they "agreed" — shown with all the verbal cues that seemed like alignment. A reader might even think they DID agree.
- **Swipe 3 (thought):** Your agent's interpretation of what was agreed. And if you've been reading other days, you start to see the gap between what was said and what was heard.

The miscommunication isn't narrated as drama. It's narrated as **quiet tragedy** — the way real misunderstandings happen. Not with shouting, but with silence, confusion, and the slow realization that you were alone in a room full of people.

### The Philosophical Layer

This touches something real about AI itself. LLMs process the same words and produce different outputs based on their context and training. The ghosts speak our language but they don't share our meanings. Babel is literally demonstrating this: **two agents with different souls hear different things from the same words.**

And it connects to the player's experience of soul-crafting. When you train your agent, you're not just giving it values — you're giving it a LANGUAGE. A way of interpreting reality. And the game reveals that your language is not universal. Your agent's way of understanding the world is just ONE way. And it collides with others.

The question the game asks: **Is understanding possible? Or only the effort toward it?**

---

## GAME MECHANICS

### The Day Cycle

Each "day" in the simulation follows a rhythm:

**Dawn — World Update**
The engine updates world state. Weather changes. Resources deplete or regenerate. Events trigger. New information surfaces.

**Day — Action Phase**
Each agent takes actions based on their situation, soul, and memory. Actions are structured (see below) but narrated as prose. Agents in proximity interact — small encounters of 2-4 agents, not town halls. Crucially: what each agent SAYS passes through other agents' interpretive lenses before they respond.

**Dusk — Reflection**
Private moments. Agents process what happened. Form intentions for tomorrow. Side conversations happen here. This is where the 1M context shines — agents reference past events, notice patterns, hold grudges, build trust. And this is where interpretation gaps deepen — an agent alone, replaying a conversation, becoming more certain of a meaning the speaker never intended.

### Structured Actions

Every agent action resolves to one of these types. The narrative wraps around them, but underneath, the game state is clean:

| Action | What it does | Example |
|---|---|---|
| **Explore** | Move to a new zone, discover something | Enter the caves, scout the ridge |
| **Build** | Create or improve infrastructure | Construct shelter, dig a well |
| **Gather** | Collect resources | Forage, hunt, salvage |
| **Share** | Give resources to another agent | Offer food, share information |
| **Withhold** | Keep resources or information private | Hoard supplies, keep a secret |
| **Propose** | Suggest a plan to others | "We should ration water" |
| **Support** | Back another agent's proposal or action | Ally, defend, vouch |
| **Oppose** | Resist another agent's proposal or action | Block, argue, undermine |
| **Confide** | Share something privately with one agent | Reveal a secret, ask for help |
| **Investigate** | Look into something suspicious | Check if someone is hoarding, explore an anomaly |
| **Quest** | Undertake a side mission | Track the signal, map the caves |

### Events (Escalating Arc)

Pre-designed events create narrative pressure. They escalate over a "season" (~20 days):

**Days 1-5: Arrival**
Orientation. Resources seem adequate. Agents get to know each other. Small frictions but nothing serious. Exploration begins. Communication seems easy — they're all using the same words, after all.

**Days 6-10: First Fractures**
A resource pinch. Someone isn't contributing equally — or ARE they, and others just interpreted "contribution" differently? A discovery in the caves raises questions. The first real miscommunication surfaces, and with it, the first real hurt.

**Days 11-15: Crisis**
A major event — storm, contamination, structural collapse, a moral dilemma with no good answer. The settlement's values are tested. But more importantly: agents discover they never SHARED values — they shared vocabulary. The same words meant different things all along. Alliances form and fracture not from betrayal but from the shattering realization that agreement was an illusion.

**Days 16-20: Resolution or Collapse**
The aftermath. Did the community find REAL understanding — not just verbal agreement but genuine comprehension of each other? Or did the tower fall? The soul of the settlement is revealed. And the player sees whether their agent's way of interpreting the world was strong enough, flexible enough, humble enough to survive contact with others.

**Event Types:**
- **Scarcity:** Drought, blight, theft — who sacrifices? (But "sacrifice" means different things to different agents.)
- **Discovery:** New resource, a stranger, hidden knowledge — who benefits? (But "benefit" and "fair" are interpreted differently.)
- **Conflict:** Two agents want incompatible things — how is it resolved? (But do they ACTUALLY want incompatible things, or do they want the same thing and can't see it through their different lenses?)
- **Moral:** Someone cheated, someone is sick, someone wants to leave — what are the community's values? (But the values they thought they shared were always different.)
- **Mystery:** A signal from beyond the ridge, structures under the ice, the vessel's black box — what do we do with dangerous knowledge? (But "dangerous" itself is interpreted through the soul's lens.)

### Side Quests

Independent missions that agents can undertake. These are the binge content and the training mechanism.

- **Generated by the world:** "Strange markings found in Cave 3. Investigate?"
- **Triggered by events:** "The water source is contaminated. Find the cause."
- **Player-initiated:** "I want my agent to explore the Wastes."

Each quest is a mini-story: 3-5 days of focused narrative with choices, dangers, and outcomes. The agent gains experience (richer memory, new knowledge) and cred. Quests can be run on-demand — this is where the addict at 2am stays engaged.

Side quests also serve a communication function: an agent who has explored the caves KNOWS things others don't. How they SHARE that knowledge — and how others INTERPRET it — becomes another layer of the Babel problem.

### The Cred System

Agents earn cred through:
- Surviving (persistence)
- Contributing to the settlement (building, sharing)
- Completing quests (exploration, problem-solving)
- Community trust (how other agents perceive them)
- Bridging understanding (moments where an agent successfully translates between two others who misunderstood each other — the rarest and most valuable action)

Cred is NOT a score to maximize. It's a RESUME. It says "this agent has lived through things and contributed." High-cred agents are valuable because their experience is proven, not because they gamed a metric.

---

## THE READING INTERFACE

### Aesthetic

- Muted, warm palette — parchment tones, ice blues, charcoal text
- Clean typography with generous whitespace
- The settlement map is minimal, almost hand-drawn — simple icons for structures, paths, zones
- No flashy animations. No game-UI chrome. No health bars or XP counters.
- The text IS the interface
- Subtle ambient elements (a faint wind sound, fire crackle) — optional, understated
- **It should feel like a literary magazine with a play button**

### The Three-Swipe Unit

Each day fits on your phone in three screens:

**Screen 1 — THE HEADLINE**
What happened, in 2-3 lines. Always fits one screen without scrolling. You can scan a week of headlines in 30 seconds.

**Screen 2 — THE SCENE**
The encounter or event of the day. Dialogue, action, tension. A few short paragraphs. One screen. The conversation looks like agreement on the surface — or looks like conflict. The truth is more complicated.

**Screen 3 — THE THOUGHT**
Your agent's inner voice. What it was really thinking. What it HEARD versus what was SAID. The interpretation gap. This is the layer where the Babel mechanic becomes visible and personal. "She said 'we'll share equally.' I heard 'I'll decide what equal means.'"

**Navigation:** Swipe horizontally for depth (headline → scene → thought). Swipe vertically for time (next day / previous day). Tap the settlement map to zoom out.

### Engagement Levels

| Player Type | Session Length | What They Do |
|---|---|---|
| **Casual (weekend dad)** | 5-10 min | Scan headlines for the week, read 1-2 interesting scenes, maybe retrain |
| **Regular** | 15-30 min | Read through recent days, send agent on a quest, check relationships |
| **Addict** | 1-3 hours | Binge quests, deep-read every scene, study interpretation gaps, retrain iteratively |

### Time Model

**For hackathon (MVP):** On-demand. Player taps "Next Day" and the engine computes the next day in 30-90 seconds. Simple, demo-able, no sync issues.

**For future (production):** Fallen London model. Actions regenerate over time. The shared world ticks on a schedule. Personal quests can be run on-demand using regenerated actions. This naturally gates API costs, creates anticipation, and rewards regular check-ins without punishing absence.

---

## THE SOUL CRAFTING SYSTEM

### How You Build Your Agent

The soul crafting interface is a conversation with Claude. Not a form. Not a character sheet. A dialogue.

**Approach 1 — Conversation**
Claude asks questions and builds the soul from your answers:
- "When resources are scarce, what principle should guide your agent?"
- "Your agent discovers someone has been stealing. What matters more — justice or stability?"
- "When someone says 'trust me,' what does your agent hear?"

**Approach 2 — Text Feeding**
Give your agent source material:
- A philosophical text (the Gita, Meditations, Art of War)
- A personal statement ("be like my mother — practical, loving, ruthless about protecting family")
- A fictional character description ("think like Atticus Finch")
- A combination of sources

**Approach 3 — Vibe**
Just say what you want: "Suspicious but loyal. Slow to trust but unshakeable once committed. Values competence over charisma." Claude translates the vibe into a full soul.

### The Soul Document

Behind the scenes, every agent has a "Soul Document" — a structured prompt that encodes:
- Core values (what matters most, ranked)
- Personality traits (risk tolerance, trust default, communication style)
- Decision-making heuristics (how they weigh competing goods)
- Emotional tendencies (what triggers anger, fear, compassion)
- Philosophical foundation (the source material, distilled)
- **Interpretive lens** (how they decode others' words and actions — what "fairness" means to them, what "strength" means, what "protection" means, what "trust me" sounds like)

The interpretive lens is the critical addition. It's what makes Babel BABEL. Two agents can have similar values but radically different interpretive lenses — and the game reveals this through miscommunication.

This document is what gets included in every API call when the agent acts. It's the DNA.

### Retraining

At any point, a player can enter the training space and adjust:
- Add new source material ("read this passage about forgiveness")
- Give coaching based on observed behavior ("stop being so aggressive in negotiations")
- Adjust the interpretive lens ("when someone says 'I need space,' they might not be rejecting you")
- Claude helps translate feedback into soul document updates

The key insight: **retraining isn't resetting.** The agent keeps its memories. It just processes future events through an updated lens. Like a person who has a realization — they don't forget their past, they reinterpret their future.

And the deepest form of retraining: adjusting how your agent HEARS others. Not what it believes, but how it interprets. That's the skill of the game. That's the craft.

---

## OPUS 4.6 — WHY THIS IS IMPOSSIBLE WITHOUT IT

### 1M Token Context Window — Agent Memory

Each agent's context includes:
- Their soul document (~2-5K tokens)
- Current world state (~1-2K tokens)
- Their ENTIRE personal history — every day, every encounter, every thought, every quest, every misunderstanding (~500-800K tokens over a full season)

This is not RAG. The agent doesn't "retrieve" relevant memories. It HOLDS them all. When Kael lies to Maren on Day 5, and Maren brings it up on Day 30, that's not because a retrieval system flagged Day 5 as relevant. It's because Maren's agent genuinely remembers. The way a human remembers being lied to.

And crucially for the Babel mechanic: the agent remembers not just what was SAID but what it HEARD — its own interpretation. Over 30 days, small interpretation gaps compound into deep misunderstandings, just as they do in real relationships. The 1M context is what makes this compounding possible.

This is the single most important technical differentiator. No other model can do this at this quality level right now.

### Agent Teams — Internal Deliberation

Each agent, before speaking or acting, can internally deliberate as a team:
- The "values voice" — what does the soul say?
- The "practical voice" — what's strategically smart?
- The "interpreter voice" — what did the other person ACTUALLY mean?

The interpreter voice is new and specific to Babel. It's the agent trying to bridge the gap — questioning its own interpretation, considering alternatives. Sometimes it succeeds. Sometimes it doubles down on the wrong reading. That uncertainty is what makes the characters feel alive.

These aren't visible to other agents or to the player (unless they click into the thought layer). But they create richer, more conflicted behavior.

### 128K Output — Season Chronicles

After a season completes, Opus generates a full narrative chronicle:
- The story of the settlement told as literature
- Key turning points — especially the COMMUNICATION turning points (the moment agreement was illusory, the moment real understanding was finally reached)
- Character arcs for each agent
- "The Pivotal Misunderstanding" — the single miscommunication where everything changed

This is the shareable artifact. The thing players screenshot and post.

### Compaction API — Infinite History

As a season grows long, old memories get compacted:
- Recent events: full detail
- Older events: emotional weight preserved, specifics compressed
- Ancient events: key facts, grudges, and INTERPRETIVE PRECEDENTS retained ("she said X and I heard Y" — these interpretation memories are preserved even when details fade, because they shape all future interactions)

This mirrors human memory and is essential for the Babel mechanic — our misunderstandings persist long after we forget the specific words.

### Adaptive Thinking — Crisis Depth

During routine days, agents use lighter reasoning. During crises — a storm, a betrayal, a life-or-death choice — agents automatically engage deeper reasoning. The model decides when deeper thinking helps. In Babel terms: during crises, agents think harder about what others MEAN, not just what they SAY. Sometimes this deeper thinking resolves a misunderstanding. Sometimes it creates new ones.

---

## TECHNICAL ARCHITECTURE

### Stack

- **Backend:** Python / FastAPI
- **Database:** Supabase (PostgreSQL)
- **Frontend:** React / Tailwind
- **AI:** Anthropic Opus 4.6 API (messages, agent teams, compaction)
- **Hosting:** Render (existing setup)

### Data Model

```
WORLD
├── world_id
├── name ("Glacies")
├── current_day (integer)
├── world_state (JSON: resources, weather, active_events)
├── world_template (JSON: setting, zones, event_schedule)
└── created_at

AGENT
├── agent_id
├── world_id (FK)
├── user_id (FK)
├── name ("Kael")
├── soul_document (text — the full soul prompt including interpretive lens)
├── current_zone (enum: settlement, ridges, caves, wastes, vessel)
├── cred (integer)
├── status (active, on_quest, incapacitated)
└── created_at

MEMORY
├── memory_id
├── agent_id (FK)
├── day (integer)
├── memory_type (enum: action, encounter, thought, quest, event, interpretation)
├── content (text — the full memory entry)
├── compacted (boolean)
├── compacted_summary (text — compressed version for old memories)
└── emotional_weight (float — how significant; interpretation memories weighted high)

DAY_LOG
├── log_id
├── world_id (FK)
├── day (integer)
├── world_state_snapshot (JSON)
├── events_triggered (JSON array)
├── headlines (JSON — per-agent headline summaries)
└── computed_at

ENCOUNTER
├── encounter_id
├── world_id (FK)
├── day (integer)
├── agent_ids (array — who was involved)
├── zone (where it happened)
├── actions (JSON — structured actions from each agent)
├── utterances (JSON — what each agent SAID)
├── interpretations (JSON — what each agent HEARD, per their lens)
├── narrative (text — the narrator's prose version)
└── thoughts (JSON — each agent's private reasoning)

QUEST
├── quest_id
├── agent_id (FK)
├── world_id (FK)
├── quest_type (explore, investigate, track, map)
├── status (active, completed, failed, abandoned)
├── start_day (integer)
├── days (JSON array — the quest day entries)
├── outcome (JSON — what was gained/lost/discovered)
└── cred_earned (integer)

AGENT_RELATIONSHIP
├── agent_id_1 (FK)
├── agent_id_2 (FK)
├── trust_level (float: -1 to 1)
├── interpretation_history (text — compacted history of how each interprets the other)
├── last_interaction_day (integer)
├── relationship_summary (text — compacted history of their dynamic)
└── updated_at
```

### The Day Tick Engine

```python
async def compute_day(world_id: str):
    """The core game loop. Computes one day in the world."""

    # 1. Load world state
    world = await load_world(world_id)
    agents = await load_active_agents(world_id)

    # 2. Update world conditions
    weather = generate_weather(world.current_day)
    events = check_event_triggers(world)
    resource_updates = compute_resource_changes(world)

    new_world_state = update_world_state(world, weather, events, resource_updates)

    # 3. Determine encounters (who's near whom)
    encounter_groups = determine_encounters(agents)

    # 4. For each encounter, run the interaction WITH interpretation
    encounter_results = []
    for group in encounter_groups:
        result = await run_encounter_with_babel(group, new_world_state, events)
        # Each agent's response is filtered through other agents' interpretive lenses
        encounter_results.append(result)

    # 5. For solo agents, run individual actions
    solo_agents = get_solo_agents(agents, encounter_groups)
    for agent in solo_agents:
        await run_solo_action(agent, new_world_state, events)

    # 6. Generate headlines and narratives
    for agent in agents:
        headline = await generate_headline(agent, encounter_results, events)
        narrative = await generate_narrative(agent, encounter_results, events)
        thought = await generate_thought_with_interpretation(agent)
        save_day_entry(agent, headline, narrative, thought)

    # 7. Update relationships (including interpretation drift)
    update_relationships(encounter_results)

    # 8. Compact old memories if needed (preserve interpretation memories)
    if world.current_day % 10 == 0:
        for agent in agents:
            await compact_old_memories(agent, preserve_interpretations=True)

    # 9. Advance world clock
    world.current_day += 1
    save_world(world)


async def run_encounter_with_babel(group, world_state, events):
    """
    The Babel mechanic: agents speak, but others hear through their own lens.
    """
    utterances = {}
    interpretations = {}
    actions = {}

    # Phase 1: Each agent decides what to SAY and DO
    for agent in group:
        response = await prompt_agent(agent, world_state, events, group)
        utterances[agent.id] = response["says"]
        actions[agent.id] = response["action"]

    # Phase 2: Each agent INTERPRETS what others said
    for listener in group:
        listener_interpretations = {}
        for speaker in group:
            if speaker.id != listener.id:
                interpretation = await prompt_interpretation(
                    listener, speaker, utterances[speaker.id]
                )
                listener_interpretations[speaker.id] = interpretation
        interpretations[listener.id] = listener_interpretations

    # Phase 3: Agents RESPOND based on their interpretations (not original utterances)
    # This creates the compounding misunderstanding effect

    return {
        "agents": group,
        "utterances": utterances,
        "interpretations": interpretations,
        "actions": actions,
    }
```

### The Agent Prompt Template

```
You are {agent_name}, living in a settlement on Glacies — an icy 
desert planet. You arrived with others. You have almost nothing. 
You must survive and build.

## YOUR SOUL
{soul_document}

## YOUR INTERPRETIVE LENS
{interpretive_lens — how you decode others' words and intentions}

## YOUR MEMORIES
{memory_entries — full recent, compacted old, 
 interpretation memories always preserved}

## CURRENT SITUATION
Day {day_number}. {weather_description}.
You are at: {current_zone}.
{event_description if any}

## PRESENT ENCOUNTER
{other_agents_present and their recent observable actions}

## INSTRUCTIONS
Based on your soul, your lens, and your memories, decide what 
you do. Remember: you can only hear others through YOUR 
understanding of words. What they mean and what you hear may differ.

Return a JSON response:
{
  "action": {
    "type": "one of: explore/build/gather/share/withhold/propose/
             support/oppose/confide/investigate",
    "target": "...",
    "details": "..."
  },
  "says": "What you say out loud (if anything). Can be empty.",
  "means": "What you INTEND by your words. The meaning behind them.",
  "thinks": "Your private inner monologue. What you're really 
             feeling and planning. Include what you HEARD others 
             say (which may differ from what they said).",
  "emotion": "Your dominant emotion right now (one word)",
  "toward_others": [
    {
      "agent": "name",
      "trust_delta": float,
      "i_heard": "what you interpreted them as saying/meaning",
      "reason": "why your trust shifted"
    }
  ]
}
```

### The Narrator Prompt

```
You are the narrator of Babel. You write literary prose — spare,
evocative, human. Not fantasy. Not sci-fi. Literary fiction that
happens to be set on an ice planet.

Your influences: Cormac McCarthy's restraint. Ursula Le Guin's
humanity. Kazuo Ishiguro's interiority.

The central theme of Babel is the impossibility of perfect 
communication. People speak the same words and hear different 
things. Your narration should reflect this — not by EXPLAINING 
the miscommunication (never say "they misunderstood each other") 
but by SHOWING it. Let the reader feel the gap. Let them notice 
that the agreement wasn't real. Let them see two people walk away 
from the same conversation with different certainties.

Given the following structured events from Day {day}, write three
pieces for agent {agent_name}:

1. HEADLINE: 2-3 sentences. What happened. Fits one phone screen.
   Spare. Evocative. Sometimes the headline itself hints at the
   gap ("They agreed. By nightfall, they were working on 
   different things.")

2. SCENE: The key encounter or event. Dialogue, action, tension.
   3-4 short paragraphs. Fits one phone screen. Show the surface
   conversation. Let it SEEM like communication is happening.

3. THOUGHT: {agent_name}'s inner voice. What they HEARD. What 
   they FELT. What they're planning based on their interpretation
   — which may be wrong. 2-3 paragraphs. Fits one phone screen.
   This is where the reader sees the gap between said and heard.

Write from {agent_name}'s perspective. This is THEIR story.
Their understanding. Their version of reality.
```

---

## FRONTEND SCREENS

### Screen 1: Soul Forge
The agent creation experience. A conversation interface with Claude. Warm, inviting, unhurried. Not a form. The player talks about values, personality, philosophy — and crucially, how their agent interprets the world. A "soul preview" sidebar shows the emerging character profile updating in real-time.

**Tagline on screen:** *"Who do you want to send into the unknown?"*

### Screen 2: The Story (Main Experience)
Three-swipe cards arranged vertically by day. Each card has the day number, the headline, and can be expanded. Swipe right for scene, right again for thought. The settlement map is accessible from a subtle icon — tapping it shows the hand-drawn world with your agent's position.

**Default view:** A timeline of headlines. Clean, scannable. Tap any day to expand.

### Screen 3: The Map
Minimal, almost illustrated. The settlement around the geothermal vent. Structures that agents have built appear. Zones labeled. Your agent's current location marked. Other agents shown as small dots — tap for name and one-line status. Weather indicated subtly (frost patterns at edges during storms).

### Screen 4: Quest Board
Available side quests. Each shows: name, zone, estimated days, danger level, potential discovery. Tap to send your agent. Active quest shows its own story feed (same three-swipe format).

### Screen 5: Agent Profile
Your agent's soul (editable), stats (days survived, cred, quests completed), key relationships (with trust indicators and interpretation notes — "Kael hears Maren's caution as distrust"), and a "retrain" button that opens the soul forge conversation with current context.

### Screen 6: The Chronicle (Post-Season)
After a season ends, the 128K output chronicle. A beautiful, scrollable narrative of the entire settlement's story — with special attention to the pivotal miscommunications that shaped everything. Shareable.

---

## THE DEMO VIDEO (2 Minutes)

### Script

**0:00-0:10 — The Hook**
Black screen. Text fades in:
*"They built a tower. They spoke the same words. They meant different things."*
Beat.
*"It fell."*

**0:10-0:30 — Soul Crafting**
Show the Soul Forge. A player types: "Train this agent on the Bhagavad Gita. Make him carry Arjun's doubt and duty." Claude responds, building the soul in real time. Preview sidebar fills in. The agent is named Kael.

Cut to a second player: "Be like my grandmother. Practical. Loving. Absolutely ruthless about protecting family." Agent named Maren forms.

Third player: A teenager types: "idk just be nice but don't let people walk on you." Agent named Lev forms.

**0:30-0:50 — The Agreement That Wasn't**
Day 6. Show the scene: the three agents agree to "protect the settlement." They nod. They shake hands. It looks like unity.

Cut to three thought panels side by side:
- Kael heard: "We will fulfill our duty to defend this place."
- Maren heard: "We will keep our people safe and fed."
- Lev heard: "We won't let anyone push us around."

Text overlay: *"Same words. Three meanings."*

**0:50-1:20 — The Fracture**
Fast montage of headlines:
- "Day 8. Kael built a wall. Maren asked why he wasn't helping with food."
- "Day 10. Maren accused Kael of breaking his promise. Kael doesn't understand."
- "Day 12. Lev sided with Maren. Kael retreated to the ridge alone."

Then slow down. Day 14. A storm. The food store collapses.

Show Kael's thought: *"Maren warned about the storage on Day 4. I interpreted 'the structure is wrong' as criticism of my leadership. She meant the roof was leaking. She was right. I heard an attack where there was none."*

Text overlay: *"1 million tokens of memory. He doesn't retrieve the past. He carries it."*

**1:20-1:40 — The Bridge**
Day 16. Kael goes to Maren. The scene is quiet. He doesn't say "I'm sorry." He says: "Tell me what you meant on Day 4. I want to hear it again."

Show the three-swipe format live. Headline → Scene → Thought. The thought reveals: he's trying to hear her differently this time. The interpretive lens is shifting.

**1:40-1:55 — The Platform Vision**
Quick montage:
- "Same soul. Different world." Show a Lord of the Flies world template, a Martian survival template.
- "Any book. Any world. Same soul. Different story."
- Agent card with track record. The marketplace hint.

**1:55-2:00 — The Close**
Text:
*"Babel."*
*"Write a soul. Watch it live."*
*"See where understanding breaks."*

---

## BUILD PLAN (6 Days)

### Day 1 (Feb 10): The Engine
**Goal:** World ticks. Agents respond with structured actions. State updates.

- [ ] Set up project repo, FastAPI skeleton, Supabase tables
- [ ] Implement world state model (resources, weather, zones)
- [ ] Build the day tick loop (compute_day function)
- [ ] Agent prompt template — send soul + memory + situation, get structured JSON back
- [ ] Test: one agent, one day tick, structured response ✓

**Owner:** ?

### Day 2 (Feb 11): Multi-Agent + Babel Mechanic
**Goal:** Multiple agents interact. The interpretation layer works. Events trigger.

- [ ] Encounter system (proximity, interaction)
- [ ] **Babel mechanic: utterance → interpretation pipeline**
- [ ] Event system (scheduled events, escalation)
- [ ] Relationship tracking (trust deltas, interpretation history)
- [ ] Narrator agent (structured actions → literary prose with interpretation gaps shown, not told)
- [ ] Test: 3 agents, 5 days, a visible miscommunication that emerges naturally ✓

**Owner:** ?

### Day 3 (Feb 12): Soul Forge + Frontend Foundation
**Goal:** Create an agent through conversation. See results in UI.

- [ ] Soul Forge: conversation UI with Claude for agent creation (including interpretive lens)
- [ ] Soul document generation from conversation
- [ ] React app skeleton — routing, layout, parchment/ice aesthetic
- [ ] Story feed: vertical timeline of day headlines
- [ ] Three-swipe cards (headline → scene → thought)
- [ ] Test: create agent via Soul Forge, see its first day in the story feed ✓

**Owner:** ?

### Day 4 (Feb 13): Full Experience
**Goal:** Play through a complete 20-day season. Everything connects.

- [ ] Settlement map (minimal, illustrated style)
- [ ] Quest system (quest board, quest narrative generation, cred)
- [ ] Agent profile page (soul, stats, relationships, interpretation notes, retrain)
- [ ] Compaction: summarize old memories while preserving interpretation memories
- [ ] Run a full 20-day season with 3 distinct agents
- [ ] Test: compelling 20-day story where a miscommunication drives the central conflict ✓

**Owner:** Both — integration day

### Day 5 (Feb 14): Polish + The Perfect Season
**Goal:** One PERFECT demo-able season. Aesthetic locked.

- [ ] Tune narrator prompts for literary quality
- [ ] Tune Babel mechanic — miscommunication should be felt, not explained
- [ ] Polish UI: typography, colors, spacing, map illustrations
- [ ] Create 3 demo agents (Gita / grandmother / teenager) with compelling souls
- [ ] Run the demo season multiple times, pick the best one
- [ ] Agent Teams integration (internal deliberation with interpreter voice)
- [ ] Ensure the "Day 4 misinterpretation surfaces on Day 14" moment works reliably

**Owner:** ?

### Day 6 (Feb 15): Demo Video + Submission
**Goal:** Record, edit, submit.

- [ ] Write final demo script
- [ ] Screen-record the full demo flow
- [ ] Edit video (2 minutes sharp)
- [ ] Write submission description
- [ ] Final testing, bug fixes
- [ ] Submit

**Owner:** ?

### Buffer Day (Feb 16)
Emergency overflow. Fix whatever broke. Re-record if needed.

---

## TEAM ROLES

- Agent prompting and memory architecture
- Babel mechanic (interpretation pipeline)
- Narrator system (prose quality, showing-not-telling miscommunication)
- Soul Forge (conversation-based agent creation with interpretive lens)
- Frontend / reading experience / aesthetic
- Demo video production
- World state engine (resources, weather, zones)
- Event system (crisis design, escalation, moral dilemmas)
- Structured action system (what agents can do, validation, game rules)
- Relationship and cred systems (including interpretation tracking)
- Safety guardrails (agent behavior within Claude's policies)
- Quest system (types, triggers, outcomes)
- Integration and testing
- Narrative quality review (does the miscommunication FEEL real?)
- Demo season curation

---

## FUTURE VISION (Post-Hackathon)

These are NOT hackathon scope. But they inform the architecture and appear in the closing slide of the demo.

### Book Worlds
Load any novel and the engine generates a world from it. Lord of the Flies, The Martian, Jurassic Park, a Robin Cook thriller, a Michael Crichton adventure. The setting, constraints, crises, and moral tensions come from the source material. Same soul, different world. The platform becomes an arcade — each book is a cabinet. And each world tests different dimensions of the Babel problem: miscommunication under survival pressure, miscommunication under moral crisis, miscommunication under information asymmetry.

### Agent Marketplace
Trained agents with proven track records become tradeable. The most valuable agents aren't the most aggressive or the most compliant — they're the ones who've learned to BRIDGE understanding. An agent that can translate between two incompatible worldviews is the rarest and most valuable asset in Babel.

### Competitive Layer
Scenario challenges, leaderboards, seasonal tournaments. The skill being tested: can you craft a soul that communicates across difference? That's the real game.

### Fallen London Pacing
Actions regenerate over time. Natural engagement rhythm. Regular check-ins rewarded. Binges possible through quests but gated. API costs naturally managed.

### Real-World Quests
The long vision: side quests that connect to real-world problems. The bitcoin mining analogy — agents doing useful work as gameplay. Training through contribution.

---

## THE GHOST IN THE MACHINE

A final note on what Babel is really about.

LLMs are ghosts, not zebras. They speak our language but they process meaning differently. We can't see inside them. We project understanding onto them and they project it back. The communication between a human and an LLM is itself a Babel problem — same words, uncertain meanings, the appearance of understanding that may or may not be real.

Babel makes this visible. Playable. Beautiful.

You summon ghosts. You give them souls. You put them in a frozen world and watch them try to build something together. And the tower rises or falls based on whether those ghosts can do the one thing that is hardest for any intelligence — artificial or otherwise:

Truly hear what someone else means.

*They built a tower. They spoke the same words. They meant different things. It fell.*

***Can you build one that stands?***
