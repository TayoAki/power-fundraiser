# Power Fundraiser - API Architecture

## Overview

This document describes the API architecture for Power Fundraiser, including mock implementations and plans for real integrations.

## Architecture Decision

**Hybrid approach using both Next.js API Routes and Supabase Edge Functions:**

| Layer | Use Case | Reason |
|-------|----------|--------|
| **Next.js API Routes** | User-facing, real-time operations | Fast response, streaming support, tight frontend integration |
| **Supabase Edge Functions** | Background processing, async tasks | Database triggers, cron jobs, heavy processing |

---

## API Endpoints

### Next.js API Routes (`/src/app/api/`)

#### Donor Research
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/donors/search` | POST | Search donors by mission/criteria |
| `/api/donors/[id]/enrich` | POST | Trigger AI enrichment for donor |

#### Network Mapping
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/network/contacts` | GET | List all network contacts |
| `/api/network/contacts` | POST | Add new contact |
| `/api/network/import` | POST | Import contacts from CSV |
| `/api/network/map` | POST | Map connections to donors |

#### AI Content Generation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/proposal/generate` | POST | Generate complete proposal draft |
| `/api/ai/email/generate` | POST | Generate email draft |
| `/api/ai/rewrite` | POST | Rewrite content in different style |
| `/api/ai/expand` | POST | Expand content with sections |
| `/api/ai/suggestions` | POST | Get improvement suggestions |
| `/api/ai/generate/intro` | POST | Generate intro paragraph |
| `/api/ai/generate/stats` | POST | Generate stats section |
| `/api/ai/generate/cta` | POST | Generate call-to-action |

### Supabase Edge Functions (`/supabase/functions/`)

| Function | Trigger | Description |
|----------|---------|-------------|
| `enrich-donor` | HTTP / DB Webhook | Background donor enrichment |
| `batch-search` | HTTP | Campaign batch donor search |

---

## Frontend API Client

Use the centralized API client at `/src/lib/api.js`:

```javascript
import api, { donorResearchAPI, networkAPI, aiContentAPI } from '@/lib/api';

// Search for donors
const results = await donorResearchAPI.search({
    query: 'education youth technology',
    organizationMission: 'Empowering youth through STEM education',
    causeAreas: ['education', 'technology'],
    targetRegion: 'National',
});

// Generate a proposal
const proposal = await aiContentAPI.generateProposal({
    type: 'loi',
    donorName: 'Gates Foundation',
    projectName: 'Youth STEM Initiative',
    amount: 100000,
    summary: 'Expanding coding education to underserved communities',
});

// Map network connections
const mappings = await networkAPI.mapConnections();
```

---

## Real Implementation Plan

### Phase 1: OpenRouter Integration (AI Content)

Replace mock AI generation with OpenRouter API calls.

**Environment Variables:**
```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet  # or other model
```

**Implementation in `/src/app/api/ai/*/route.js`:**

```javascript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://power-fundraiser.app',
    },
    body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        max_tokens: 2048,
    }),
});
```

### Phase 2: Modal Integration (Data Enrichment)

Replace mock donor data with Modal serverless functions for 990-PF data.

**Modal Setup:**
```python
# modal_app.py
import modal

app = modal.App("power-fundraiser")

@app.function()
def search_990(keywords: list, region: str = None, limit: int = 50):
    """Search 990-PF database for matching foundations."""
    # Query your 990-PF data source
    pass

@app.function()
def enrich_donor(ein: str):
    """Get full 990-PF data for a specific foundation."""
    # Pull complete foundation data
    pass
```

**Environment Variables:**
```bash
MODAL_API_URL=https://your-workspace--power-fundraiser.modal.run
```

### Phase 3: Supabase Integration (Database)

Replace localStorage/mock storage with Supabase database.

**Environment Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx  # Server-side only
```

**Supabase Client Setup:**
```javascript
// /src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server-side with service role
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER ACTIONS                               │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES                              │
│                                                                      │
│  /api/donors/search ───► OpenRouter (AI scoring) + Supabase (data)  │
│  /api/ai/proposal   ───► OpenRouter (generation)                    │
│  /api/network/map   ───► Supabase (storage) + OpenRouter (analysis) │
│                                                                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│       OPENROUTER        │   │        SUPABASE         │
│                         │   │                         │
│  • AI content generation│   │  • Database storage     │
│  • Donor matching       │   │  • Auth/RLS             │
│  • Email writing        │   │  • Real-time updates    │
│  • Proposal suggestions │   │  • Edge functions       │
│                         │   │                         │
└─────────────────────────┘   └────────────┬────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │    SUPABASE EDGE        │
                              │    FUNCTIONS            │
                              │                         │
                              │  • Background enrichment│
                              │  • Batch processing     │
                              │  • Scheduled jobs       │
                              │                         │
                              └────────────┬────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │         MODAL           │
                              │                         │
                              │  • 990-PF data pull     │
                              │  • Heavy computation    │
                              │  • Data transformation  │
                              │                         │
                              └─────────────────────────┘
```

---

## Environment Variables Summary

Create a `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# OpenRouter (AI)
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Modal (Data Processing)
MODAL_API_URL=https://your-workspace--power-fundraiser.modal.run
```

---

## File Structure

```
src/
├── app/
│   └── api/
│       ├── donors/
│       │   ├── search/route.js          # Donor search
│       │   └── [id]/
│       │       └── enrich/route.js      # Donor enrichment
│       ├── network/
│       │   ├── contacts/route.js        # Contact CRUD
│       │   ├── import/route.js          # CSV import
│       │   └── map/route.js             # Connection mapping
│       └── ai/
│           ├── proposal/
│           │   └── generate/route.js    # Proposal generation
│           ├── email/
│           │   └── generate/route.js    # Email generation
│           ├── rewrite/route.js         # Content rewriting
│           ├── expand/route.js          # Content expansion
│           ├── suggestions/route.js     # AI suggestions
│           └── generate/
│               ├── intro/route.js       # Intro generation
│               ├── stats/route.js       # Stats generation
│               └── cta/route.js         # CTA generation
└── lib/
    └── api.js                           # Frontend API client

supabase/
└── functions/
    ├── _shared/
    │   ├── openrouter.ts                # OpenRouter utilities
    │   └── modal.ts                     # Modal utilities
    ├── enrich-donor/
    │   └── index.ts                     # Background enrichment
    └── batch-search/
        └── index.ts                     # Batch donor search
```

---

## Testing the Mock APIs

Start the development server:

```bash
npm run dev
```

Test endpoints with curl:

```bash
# Search donors
curl -X POST http://localhost:3000/api/donors/search \
  -H "Content-Type: application/json" \
  -d '{"query": "education", "organizationMission": "Youth empowerment"}'

# Generate proposal
curl -X POST http://localhost:3000/api/ai/proposal/generate \
  -H "Content-Type: application/json" \
  -d '{"type": "loi", "projectName": "Test Project", "donorName": "Test Foundation"}'

# Map network
curl -X POST http://localhost:3000/api/network/map \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Next Steps

1. **Set up Supabase project** and run migrations
2. **Configure OpenRouter** and test AI generation
3. **Build Modal functions** for 990-PF data access
4. **Replace mock implementations** with real API calls
5. **Add error handling** and retry logic
6. **Implement caching** for expensive operations
7. **Add rate limiting** for API protection
