# The X Recommendation Algorithm & Content Funnel Mechanics

How the modern X recommendation architecture scores content, and how to engineer copy to trigger maximum algorithmic propagation.

---

## 1. The Three Recommendation Systems of X

The modern recommendation engine on X consists of three primary subsystems that determine whether a post dies at 200 views or scales to millions:

```
                   ┌──────────────────────────────────────────────┐
                   │                  NEW POST                    │
                   └──────────────────────┬───────────────────────┘
                                          │
                                          ▼
                               ┌──────────────────────┐
                               │  SIMCLUSTER (NLP)    │
                               │ Maps post to topical │
                               │ semantic clusters    │
                               └──────────┬───────────┘
                                          │
                         ┌────────────────┴────────────────┐
                         ▼                                 ▼
             ┌──────────────────────┐          ┌──────────────────────┐
             │   THUNDER (In-Graph) │          │  PHOENIX (Out-of-Net)│
             │ Real-time fast ranker│          │ Heavy Neural Network │
             │ Scores current       │          │ Pushes to 'For You'  │
             │ followers' engagement│          │ Explore feeds        │
             └──────────┬───────────┘          └──────────┬───────────┘
                        │                                 │
                        └────────────────┬────────────────┘
                                         ▼
                               ┌──────────────────────┐
                               │  THE JUDGE & BOUNCER │
                               │ Final scoring & spam │
                               │ suppression filters  │
                               └──────────────────────┘
```

### 1. Simcluster (Semantic Interest Communities)
- **Role**: Discovers topical communities (e.g. *Tech Founders, AI Researchers, Crypto Traders, Copywriters*).
- **Mechanism**: Evaluates the linguistic keywords, profile followings, and co-engagement patterns.
- **Copywriting Rule**: **One topic per post**. If you mix three unrelated topics (e.g., SaaS pricing, workout tips, and crypto trading) in one tweet, Simcluster cannot place your post into a dense community cluster, resulting in distributed algorithmic death.

### 2. Thunder (In-Network First Wave)
- **Role**: Measures initial velocity within your existing followers in the first 15–45 minutes.
- **Mechanism**: High initial engagement rate signals Thunder to pass the candidate post to Phoenix.
- **Copywriting Rule**: Hook strength and formatting must prevent fast scroll-bys. A post that gets skipped by your own followers never makes it out-of-network.

### 3. Phoenix (Heavy Neural Ranker / Out-of-Network Virality)
- **Role**: Responsible for the "For You" page and viral explosion.
- **Mechanism**: Predicts user satisfaction and action likelihoods across hundreds of millions of users who do not follow you.
- **Copywriting Rule**: Universal curiosity, aspirational identity, and high-utility playbooks thrive here because out-of-network users do not know you; they only care about what you can do for them.

---

## 2. The Algorithmic Point Scoring Model (The Judge)

The internal scoring system evaluates physical user interactions with unequal weighted values:

| Action | Relative Algorithmic Weight | Primary Copywriting Trigger |
| :--- | :--- | :--- |
| **Bookmark (Save)** | **Highest (~10x–20x)** | High Utility, Checklists, Cheat Codes, dense resources. |
| **Direct Share (DM / External)** | **Massive (~15x)** | Identity validation, extreme value ("send this to a friend"). |
| **Quote Tweet (QT)** | **Heavy (~8x–10x)** | Contrarian takes, polarizing debate, fill-in prompts. |
| **Reply (Conversation)** | **Heavy (~5x–8x)** | Direct open questions, polarizing opinions, deliberate debates. |
| **Author Reply in Thread** | **Boost (~3x)** | Founder replies to commenters; doubles post dwell time. |
| **Profile Visit → Follow** | **High Long-term (~10x)** | Authoritative proof, masterclass guides, origin stories. |
| **Dwell Time (> 2-3 mins)** | **Strong Multiplier** | Long-form articles, embedded video with timestamps, carousels. |
| **Basic Like** | **Baseline (1x)** | Low signal; necessary but insufficient for viral breakout. |

---

## 3. What Gets You Filtered (The Bouncer)

Posts are downranked or filtered into "Not Safe For Network" if they trigger the following heuristic penalties:
1. **External Links in the Main Tweet**: External URLs take users off-platform. Place external links in a follow-up reply or your bio.
2. **Engagement Pod / Artificial Spikes**: Synchronized identical replies from the same cluster within seconds trigger bot filters.
3. **Hashtag Clutter**: Using more than 1–2 hashtags looks like spam and degrades semantic Simcluster mapping. Modern X uses vector search; hashtags are largely obsolete for organic reach.
4. **Muted Words & Low-Quality Slop**: Overuse of generic hype terms ("free crypto", "giveaway", "DM me to win") triggers automated spam deranking.

---

## 4. The 3-Tier Funnel Model (TOF, MOF, BOF)

Never write all content for the same intent. Maintain a deliberate portfolio mix:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOP OF FUNNEL (TOF): 60% – 70% of Content Portfolio                    │
│ Goal: Mass Reach, Impressions & Follower Acquisition                   │
│ Format: Short, punchy, broad appeal, visual infographics, high-density │
│ CTA: Follow or Repost                                                  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ MIDDLE OF FUNNEL (MOF): 20% – 30% of Content Portfolio                 │
│ Goal: Build Deep Trust, Authority & Brand Moat                         │
│ Format: Detailed breakdowns, case studies, long articles, teardowns    │
│ CTA: Bookmark, Reply, or Join Free Newsletter                         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ BOTTOM OF FUNNEL (BOF): 10% of Content Portfolio                       │
│ Goal: Conversion, Inbound DMs, Product Sales                           │
│ Format: High-specificity offers, launch posts, waitlists, client proof │
│ CTA: Direct DM trigger, Buy link in bio/reply                          │
└────────────────────────────────────────────────────────────────────────┘
```

### The Inviolable Funnel Rule:
> **"The closer you get to a sale, the more detail you need."**

- **TOF**: Low detail, high intrigue, universal relevance.
- **MOF**: High detail, concrete workflows, audited numbers, clear methodologies.
- **BOF**: Maximum specificity, exact deliverables, pricing, and frictionless call-to-action.
