# Power Fundraiser - Database Schema & Entity Relationship Mapping

## App Overview & Purpose

**Power Fundraiser** is an AI-powered donor management and fundraising platform designed for nonprofits. The platform helps organizations:

1. **Research & Discover Donors** - Search foundations, corporations, and individuals using AI-powered matching based on 990-PF tax filings and organizational alignment
2. **Manage Campaigns** - Create fundraising campaigns with specific goals, target regions, and cause areas
3. **Track Pipeline** - Move donors through stages (Research → Qualified → Cultivating → Negotiations → Funded → Stewardship)
4. **Build Networks** - Map connections to donor organizations through LinkedIn imports and 990-PF officer data
5. **Conduct Outreach** - Send personalized emails to contacts with AI-generated templates
6. **Generate Proposals** - Create AI-powered LOIs, proposals, budget narratives, and thank-you letters
7. **Activity Tracking** - Log calls, meetings, emails, and notes for relationship management

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MULTI-TENANT CORE                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│    ┌──────────────────┐         ┌──────────────────┐                                    │
│    │   auth.users     │         │  organizations   │                                    │
│    │   (Supabase)     │         │                  │                                    │
│    ├──────────────────┤         ├──────────────────┤                                    │
│    │ id (PK)          │         │ id (PK)          │                                    │
│    │ email            │         │ name             │                                    │
│    │ ...              │         │ mission          │                                    │
│    └────────┬─────────┘         │ vision           │                                    │
│             │                   │ website          │                                    │
│             │ 1:1               │ zip_code         │                                    │
│             ▼                   │ linkedin_url     │                                    │
│    ┌──────────────────┐         │ twitter_url      │                                    │
│    │  user_profiles   │         └────────┬─────────┘                                    │
│    ├──────────────────┤                  │                                              │
│    │ id (PK/FK)       │──────────────────┤ N:1                                          │
│    │ organization_id  │◄─────────────────┘                                              │
│    │ full_name        │                                                                 │
│    │ role             │         (All org-scoped entities reference organization_id)    │
│    │ email_settings   │                                                                 │
│    └──────────────────┘                                                                 │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DONOR MANAGEMENT                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│    ┌──────────────────┐                    ┌──────────────────┐                         │
│    │     donors       │                    │    campaigns     │                         │
│    │  (Global/Shared) │                    │   (Org-Scoped)   │                         │
│    ├──────────────────┤                    ├──────────────────┤                         │
│    │ id (PK)          │                    │ id (PK)          │                         │
│    │ name             │                    │ organization_id  │◄── RLS scoped           │
│    │ category (enum)  │                    │ created_by       │                         │
│    │ tier (enum)      │                    │ name             │                         │
│    │ ein              │                    │ description      │                         │
│    │ website          │                    │ status (enum)    │                         │
│    │ city, state      │                    │ target_amount    │                         │
│    │ total_assets     │                    │ target_region    │                         │
│    │ total_giving     │                    │ grant_size_min   │                         │
│    │ focus_areas      │                    │ grant_size_max   │                         │
│    │ officers (JSONB) │                    │ cause_areas[]    │                         │
│    │ grants (JSONB)   │                    │ search_config    │                         │
│    │ ai_insights      │                    │ prospects_count  │                         │
│    │ enrichment_status│                    │ qualified_count  │                         │
│    │ search_vector    │                    └────────┬─────────┘                         │
│    └────────┬─────────┘                             │                                   │
│             │                                       │                                   │
│             │            ┌──────────────────────────┘                                   │
│             │            │                                                              │
│             │     M:N    │ (Junction Table)                                             │
│             │            ▼                                                              │
│             │   ┌──────────────────┐                                                    │
│             └──►│  campaign_donors │◄── Main relationship table                         │
│                 ├──────────────────┤                                                    │
│                 │ id (PK)          │                                                    │
│                 │ campaign_id (FK) │                                                    │
│                 │ donor_id (FK)    │                                                    │
│                 │ stage (enum)     │  ← research/qualified/cultivating/negotiations/   │
│                 │                  │    funded/stewardship/rejected                     │
│                 │ alignment_score  │                                                    │
│                 │ health_score     │                                                    │
│                 │ network_score    │                                                    │
│                 │ mission_score    │                                                    │
│                 │ ask_amount       │                                                    │
│                 │ ai_recommendation│                                                    │
│                 │ is_rejected      │                                                    │
│                 │ qualified_at     │                                                    │
│                 │ funded_at        │                                                    │
│                 │ last_activity_at │                                                    │
│                 └────────┬─────────┘                                                    │
│                          │                                                              │
│                          │ 1:N                                                          │
│                          ▼                                                              │
│                 ┌──────────────────┐                                                    │
│                 │pipeline_stage_   │                                                    │
│                 │    history       │                                                    │
│                 ├──────────────────┤                                                    │
│                 │ id (PK)          │                                                    │
│                 │ campaign_donor_id│                                                    │
│                 │ from_stage       │                                                    │
│                 │ to_stage         │                                                    │
│                 │ changed_by       │                                                    │
│                 │ notes            │                                                    │
│                 └──────────────────┘                                                    │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              RELATIONSHIP MANAGEMENT                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│    ┌──────────────────┐              ┌──────────────────┐                               │
│    │    contacts      │              │   activities     │                               │
│    │  (Org-Scoped)    │              │  (Org-Scoped)    │                               │
│    ├──────────────────┤              ├──────────────────┤                               │
│    │ id (PK)          │              │ id (PK)          │                               │
│    │ organization_id  │              │ organization_id  │                               │
│    │ donor_id (FK)    │◄─────────────│ donor_id (FK)    │                               │
│    │ name             │              │ campaign_donor_id│                               │
│    │ email            │    ┌────────►│ contact_id (FK)  │                               │
│    │ phone            │    │         │ created_by       │                               │
│    │ title            │────┘         │ type (enum)      │  ← email_sent/call/meeting/   │
│    │ role (enum)      │              │ title            │    note/proposal_sent/etc.    │
│    │ connection_degree│              │ description      │                               │
│    │ connected_through│              │ duration_minutes │                               │
│    │ health_score     │              │ sentiment (enum) │                               │
│    │ linkedin_url     │              │ email_subject    │                               │
│    │ avatar_url       │              │ email_body       │                               │
│    │ source           │              │ tags[]           │                               │
│    └──────────────────┘              │ metadata (JSONB) │                               │
│                                      │ occurred_at      │                               │
│                                      └──────────────────┘                               │
│                                                                                          │
│    ┌──────────────────┐              ┌──────────────────┐                               │
│    │     notes        │              │     tasks        │                               │
│    │  (Org-Scoped)    │              │  (Org-Scoped)    │                               │
│    ├──────────────────┤              ├──────────────────┤                               │
│    │ id (PK)          │              │ id (PK)          │                               │
│    │ organization_id  │              │ organization_id  │                               │
│    │ campaign_donor_id│              │ campaign_donor_id│                               │
│    │ contact_id       │              │ contact_id       │                               │
│    │ created_by       │              │ assigned_to      │                               │
│    │ content          │              │ created_by       │                               │
│    │ is_pinned        │              │ title            │                               │
│    │ action_item      │              │ description      │                               │
│    │ action_due_date  │              │ is_completed     │                               │
│    └──────────────────┘              │ due_date         │                               │
│                                      │ priority         │                               │
│                                      └──────────────────┘                               │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              DOCUMENT MANAGEMENT                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│    ┌──────────────────┐              ┌──────────────────┐                               │
│    │    documents     │              │ email_templates  │                               │
│    │  (Org-Scoped)    │              │  (Org-Scoped)    │                               │
│    ├──────────────────┤              ├──────────────────┤                               │
│    │ id (PK)          │              │ id (PK)          │                               │
│    │ organization_id  │              │ organization_id  │                               │
│    │ campaign_donor_id│              │ title            │                               │
│    │ donor_id         │              │ subject          │                               │
│    │ created_by       │              │ body             │                               │
│    │ type (enum)      │  ← loi/      │ template_type    │                               │
│    │                  │    proposal/ │ tags[]           │                               │
│    │                  │    budget/   │ match_score      │                               │
│    │                  │    cover/    │ is_ai_generated  │                               │
│    │                  │    progress/ │ is_system_templ  │                               │
│    │                  │    thank_you │                  │                               │
│    │ status (enum)    │              └──────────────────┘                               │
│    │ title            │                                                                 │
│    │ content          │                                                                 │
│    │ content_json     │                                                                 │
│    │ ask_amount       │                                                                 │
│    │ program_name     │                                                                 │
│    │ word_count       │                                                                 │
│    │ ai_strength_score│                                                                 │
│    │ version          │                                                                 │
│    │ sent_at          │                                                                 │
│    └──────────────────┘                                                                 │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Entity Descriptions & Relationships

### 1. Core Multi-Tenant Entities

#### **organizations**
The root tenant entity. All organization-specific data is scoped to this table via `organization_id`.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| name | VARCHAR(255) | Organization name |
| mission | TEXT | Mission statement (used for AI matching) |
| vision | TEXT | Vision statement |
| website | VARCHAR(500) | Organization website |
| zip_code | VARCHAR(20) | For geographic matching |
| linkedin_url | VARCHAR(500) | Organization LinkedIn |
| twitter_url | VARCHAR(500) | Organization Twitter |

**Relationships:**
- 1:N → `user_profiles` (members of the organization)
- 1:N → `campaigns` (fundraising campaigns)
- 1:N → `contacts` (relationship contacts)
- 1:N → `activities`, `notes`, `tasks`, `documents` (all org-scoped)

---

#### **user_profiles**
Extends Supabase `auth.users` with application-specific data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK/FK) | References auth.users(id) |
| organization_id | UUID (FK) | References organizations(id) |
| full_name | VARCHAR(255) | User's display name |
| role | VARCHAR(100) | member, admin, owner |
| email_settings | JSONB | User email preferences |

**Relationships:**
- N:1 → `organizations` (user belongs to one org)
- 1:1 → `auth.users` (Supabase auth)

---

### 2. Donor Management Entities

#### **donors** (Global/Shared)
Foundation, corporate, and individual donor records. This is **shared data** across all organizations (sourced from 990-PF filings, enrichment APIs, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| name | VARCHAR(500) | Donor/Foundation name |
| category | ENUM | Foundation, Corporate, Individual, Government, Other |
| tier | ENUM | LOCAL, REGIONAL, NATIONAL, INTERNATIONAL |
| ein | VARCHAR(20) | Employer Identification Number |
| website | VARCHAR(500) | Donor website |
| description | TEXT | Description of the donor |
| city, state, country | VARCHAR | Location |
| total_assets | BIGINT | From 990-PF |
| total_revenue | BIGINT | From 990-PF |
| total_giving | BIGINT | Annual giving amount |
| giving_range_min/max | INTEGER | Typical grant range |
| funding_range | VARCHAR(100) | Human-readable range (e.g., "$50K - $100K") |
| focus_areas | TEXT | Comma-separated focus areas |
| principal_officer | VARCHAR(255) | Main officer name |
| officers | JSONB | Array of {name, title} objects |
| grants | JSONB | Historical grant data |
| enrichment_status | ENUM | pending, in_progress, completed, failed |
| enriched_at | TIMESTAMPTZ | When AI enrichment completed |
| ai_insights | JSONB | AI-generated insights (summary, opportunities, approach) |
| search_vector | TSVECTOR | Full-text search index |

**Relationships:**
- M:N → `campaigns` (via `campaign_donors` junction table)
- 1:N → `contacts` (people at this donor organization)

---

#### **campaigns**
Fundraising campaigns owned by an organization.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| organization_id | UUID (FK) | Owning organization |
| created_by | UUID (FK) | User who created the campaign |
| name | VARCHAR(255) | Campaign name |
| description | TEXT | Campaign description |
| status | ENUM | active, paused, completed, archived |
| target_amount | BIGINT | Fundraising goal |
| target_region | VARCHAR(255) | Geographic focus |
| grant_size_min/max | INTEGER | Target grant size |
| cause_areas | TEXT[] | Array of cause areas |
| organization_mission | TEXT | Snapshot of org mission for AI |
| strategic_goals | TEXT | Campaign-specific goals |
| search_config | JSONB | AI search configuration |
| prospects_count | INTEGER | Auto-calculated via trigger |
| qualified_count | INTEGER | Auto-calculated via trigger |

**Relationships:**
- N:1 → `organizations`
- M:N → `donors` (via `campaign_donors`)

---

#### **campaign_donors** (Junction Table) ⭐
The **central relationship table** connecting campaigns to donors with pipeline tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| campaign_id | UUID (FK) | References campaigns(id) |
| donor_id | UUID (FK) | References donors(id) |
| stage | ENUM | Pipeline stage (see below) |
| alignment_score | INTEGER (0-100) | AI-calculated alignment |
| health_score | INTEGER (0-100) | Relationship health |
| network_score | INTEGER (0-100) | Network connection strength |
| mission_score | INTEGER (0-100) | Mission alignment |
| financial_score | VARCHAR(50) | High/Medium/Low |
| health_trend | VARCHAR(20) | stable, improving, declining |
| ask_amount | BIGINT | Requested grant amount |
| recommended_amount | VARCHAR(100) | AI-recommended ask |
| ai_recommendation | TEXT | AI approach recommendation |
| approach_strategy | TEXT | Detailed approach strategy |
| is_rejected | BOOLEAN | Donor rejected from pipeline |
| rejected_at | TIMESTAMPTZ | When rejected |
| rejection_reason | TEXT | Why rejected |
| added_at | TIMESTAMPTZ | When added to campaign |
| qualified_at | TIMESTAMPTZ | When moved to qualified |
| funded_at | TIMESTAMPTZ | When funding received |
| last_activity_at | TIMESTAMPTZ | Most recent activity |

**Pipeline Stages:**
1. `research` - Initial research/discovery
2. `qualified` - Vetted and worth pursuing
3. `cultivating` - Building relationship
4. `negotiations` - Proposal submitted, in discussions
5. `funded` - Grant received
6. `stewardship` - Ongoing relationship management
7. `rejected` - Passed/declined

**Relationships:**
- N:1 → `campaigns`
- N:1 → `donors`
- 1:N → `pipeline_stage_history`
- 1:N → `activities`, `notes`, `tasks`, `documents`

**Unique Constraint:** `(campaign_id, donor_id)` - A donor can only be in a campaign once.

---

#### **pipeline_stage_history**
Audit trail of pipeline stage changes for campaign donors.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| campaign_donor_id | UUID (FK) | References campaign_donors(id) |
| from_stage | ENUM | Previous stage (null if first) |
| to_stage | ENUM | New stage |
| changed_by | UUID (FK) | User who made the change |
| notes | TEXT | Optional notes about the change |
| created_at | TIMESTAMPTZ | When change occurred |

**Relationships:**
- N:1 → `campaign_donors`
- N:1 → `auth.users` (changed_by)

---

### 3. Relationship Management Entities

#### **contacts**
People at donor organizations that the nonprofit has relationships with.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| organization_id | UUID (FK) | Owning nonprofit org |
| donor_id | UUID (FK) | Optional link to donor org |
| name | VARCHAR(255) | Contact name |
| email | VARCHAR(255) | Contact email |
| phone | VARCHAR(50) | Contact phone |
| title | VARCHAR(255) | Job title |
| role | ENUM | Champion, Key Voter, Influencer, Gatekeeper, Decision Maker, Program Officer, Board Member, New, Other |
| connection_degree | ENUM | 1st, 2nd, 3rd, none |
| connected_through | VARCHAR(255) | Who connects you |
| health_score | INTEGER (0-100) | Relationship health |
| last_interaction_at | TIMESTAMPTZ | Last activity with contact |
| linkedin_url | VARCHAR(500) | LinkedIn profile |
| twitter_url | VARCHAR(500) | Twitter profile |
| avatar_url | VARCHAR(500) | Profile photo |
| source | VARCHAR(100) | Where contact came from |
| imported_at | TIMESTAMPTZ | When imported |

**Contact Roles Explained:**
- **Champion** - Actively advocates for your org internally
- **Decision Maker** - Has authority to approve grants
- **Key Voter** - Votes on funding decisions
- **Influencer** - Can sway decision makers
- **Gatekeeper** - Controls access to decision makers
- **Program Officer** - Manages grant programs

**Relationships:**
- N:1 → `organizations`
- N:1 → `donors` (optional)
- 1:N → `activities`
- 1:N → `notes`
- 1:N → `tasks`

---

#### **activities**
All interactions and events (emails, calls, meetings, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| organization_id | UUID (FK) | Owning org |
| campaign_donor_id | UUID (FK) | Optional campaign-donor link |
| contact_id | UUID (FK) | Optional contact link |
| donor_id | UUID (FK) | Optional direct donor link |
| created_by | UUID (FK) | User who logged activity |
| type | ENUM | email_sent, email_opened, email_clicked, email_replied, call, meeting, note, proposal_sent, stage_change, task_completed, other |
| title | VARCHAR(500) | Activity title |
| description | TEXT | Details |
| duration_minutes | INTEGER | For calls/meetings |
| sentiment | ENUM | positive, neutral, negative |
| email_subject | VARCHAR(500) | For email activities |
| email_body | TEXT | Email content |
| email_tracking_id | VARCHAR(255) | For email tracking |
| tags | TEXT[] | Activity tags |
| metadata | JSONB | Additional data |
| occurred_at | TIMESTAMPTZ | When activity happened |

**Relationships:**
- N:1 → `organizations`
- N:1 → `campaign_donors` (optional)
- N:1 → `contacts` (optional)
- N:1 → `donors` (optional)

---

#### **notes**
Free-form notes attached to donors or contacts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| organization_id | UUID (FK) | Owning org |
| campaign_donor_id | UUID (FK) | Optional campaign-donor link |
| contact_id | UUID (FK) | Optional contact link |
| created_by | UUID (FK) | Author |
| content | TEXT | Note content |
| is_pinned | BOOLEAN | Pin to top |
| action_item | VARCHAR(500) | Extracted action item |
| action_due_date | DATE | Action due date |

---

#### **tasks**
Follow-up tasks and to-dos.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| organization_id | UUID (FK) | Owning org |
| campaign_donor_id | UUID (FK) | Optional link |
| contact_id | UUID (FK) | Optional link |
| assigned_to | UUID (FK) | Assigned user |
| created_by | UUID (FK) | Creator |
| title | VARCHAR(500) | Task title |
| description | TEXT | Task details |
| is_completed | BOOLEAN | Completion status |
| completed_at | TIMESTAMPTZ | When completed |
| due_date | DATE | Due date |
| priority | VARCHAR(20) | low, medium, high |

---

### 4. Document Management Entities

#### **documents**
Proposals, LOIs, budgets, and other generated documents.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| organization_id | UUID (FK) | Owning org |
| campaign_donor_id | UUID (FK) | Optional link |
| donor_id | UUID (FK) | Target donor |
| created_by | UUID (FK) | Author |
| type | ENUM | loi, proposal, budget, cover_letter, progress_report, thank_you, other |
| status | ENUM | draft, in_review, sent, accepted, rejected |
| title | VARCHAR(500) | Document title |
| content | TEXT | Plain text content |
| content_json | JSONB | Structured content |
| ask_amount | BIGINT | Grant request amount |
| program_name | VARCHAR(255) | Program name |
| word_count | INTEGER | Auto-calculated |
| ai_strength_score | INTEGER | AI quality score |
| version | INTEGER | Version number |
| sent_at | TIMESTAMPTZ | When sent to donor |

---

#### **email_templates**
Reusable email templates.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| organization_id | UUID (FK) | Owning org (null for system) |
| title | VARCHAR(255) | Template name |
| subject | VARCHAR(500) | Email subject line |
| body | TEXT | Email body with placeholders |
| template_type | VARCHAR(100) | intro, follow_up, thank_you, etc. |
| tags | TEXT[] | Template tags |
| match_score | INTEGER | AI relevance score |
| is_ai_generated | BOOLEAN | Was AI-created |
| is_system_template | BOOLEAN | System-provided template |

---

## Relationship Summary Table

| From Entity | Relationship | To Entity | Description |
|-------------|--------------|-----------|-------------|
| organizations | 1:N | user_profiles | Org has many members |
| organizations | 1:N | campaigns | Org runs campaigns |
| organizations | 1:N | contacts | Org tracks contacts |
| organizations | 1:N | activities | Org logs activities |
| organizations | 1:N | notes | Org creates notes |
| organizations | 1:N | tasks | Org has tasks |
| organizations | 1:N | documents | Org generates docs |
| organizations | 1:N | email_templates | Org has templates |
| campaigns | M:N | donors | Via campaign_donors |
| campaigns | 1:N | campaign_donors | Campaign has prospects |
| donors | 1:N | campaign_donors | Donor in campaigns |
| donors | 1:N | contacts | People at donor org |
| campaign_donors | 1:N | pipeline_stage_history | Stage change audit |
| campaign_donors | 1:N | activities | Activities for this prospect |
| campaign_donors | 1:N | notes | Notes for this prospect |
| campaign_donors | 1:N | tasks | Tasks for this prospect |
| campaign_donors | 1:N | documents | Docs for this prospect |
| contacts | 1:N | activities | Activities with contact |
| contacts | 1:N | notes | Notes about contact |
| contacts | 1:N | tasks | Tasks related to contact |

---

## Data Flow Diagram

```
User Journey:

┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   SETTINGS  │      │  RESEARCH   │      │  PIPELINE   │
│             │      │             │      │             │
│ Set up org  │ ───► │ AI searches │ ───► │ Track stages│
│ mission,    │      │ for matching│      │ Research →  │
│ vision      │      │ donors      │      │ Qualified → │
│             │      │             │      │ Cultivating │
└─────────────┘      └─────────────┘      └──────┬──────┘
                                                  │
                     ┌────────────────────────────┼────────────────────────────┐
                     │                            │                            │
                     ▼                            ▼                            ▼
              ┌─────────────┐             ┌─────────────┐             ┌─────────────┐
              │   NETWORK   │             │  OUTREACH   │             │  PROPOSAL   │
              │             │             │             │             │             │
              │ Map connec- │             │ Email       │             │ AI-generate │
              │ tions via   │             │ contacts,   │             │ LOIs, full  │
              │ LinkedIn &  │             │ log calls,  │             │ proposals,  │
              │ 990-PF data │             │ schedule    │             │ budgets     │
              │             │             │ meetings    │             │             │
              └─────────────┘             └─────────────┘             └─────────────┘
                     │                            │                            │
                     └────────────────────────────┼────────────────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────┐
                                         │   FUNDED    │
                                         │             │
                                         │ Grant       │
                                         │ received,   │
                                         │ begin       │
                                         │ stewardship │
                                         └─────────────┘
```

---

## Row Level Security (RLS) Strategy

All organization-scoped tables use RLS to ensure multi-tenant isolation:

1. **Direct Scoping**: Tables with `organization_id` column are filtered directly
2. **Indirect Scoping**: Tables like `campaign_donors` are filtered via JOIN to `campaigns`
3. **Shared Data**: `donors` table is readable by all authenticated users (public 990-PF data)
4. **Helper Function**: `get_user_org_id()` returns the current user's organization

---

## Key Database Functions

| Function | Purpose |
|----------|---------|
| `get_user_org_id()` | Returns user's organization_id for RLS |
| `update_updated_at()` | Trigger to auto-update timestamps |
| `track_pipeline_stage_change()` | Logs stage changes to history |
| `update_campaign_stats()` | Updates prospect/qualified counts |
| `update_last_activity()` | Updates last_activity_at timestamps |
| `calculate_health_score()` | Computes relationship health |
| `search_donors()` | Full-text search with filters |
| `add_donor_to_campaign()` | Adds donor to campaign pipeline |
| `reject_donor_from_campaign()` | Marks donor as rejected |
| `move_donor_to_stage()` | Changes pipeline stage |
| `get_pipeline_summary()` | Returns stage counts and totals |
| `log_activity()` | Creates activity record |

---

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| donors | `idx_donors_search` (GIN) | Full-text search |
| donors | `idx_donors_category` | Filter by type |
| donors | `idx_donors_tier` | Filter by tier |
| donors | `idx_donors_state` | Geographic filter |
| campaigns | `idx_campaigns_org` | RLS queries |
| campaign_donors | `idx_campaign_donors_campaign` | Campaign queries |
| campaign_donors | `idx_campaign_donors_stage` | Pipeline views |
| contacts | `idx_contacts_org` | RLS queries |
| contacts | `idx_contacts_role` | Role filtering |
| activities | `idx_activities_occurred` | Timeline queries |

---

## Enum Types

```sql
-- Donor classification
CREATE TYPE donor_category AS ENUM ('Foundation', 'Corporate', 'Individual', 'Government', 'Other');
CREATE TYPE donor_tier AS ENUM ('LOCAL', 'REGIONAL', 'NATIONAL', 'INTERNATIONAL');
CREATE TYPE enrichment_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- Campaign management
CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'completed', 'archived');

-- Pipeline stages
CREATE TYPE donor_pipeline_stage AS ENUM (
    'research', 'qualified', 'cultivating', 'negotiations', 
    'funded', 'stewardship', 'rejected'
);

-- Contact classification
CREATE TYPE contact_role AS ENUM (
    'Champion', 'Key Voter', 'Influencer', 'Gatekeeper',
    'Decision Maker', 'Program Officer', 'Board Member', 'New', 'Other'
);
CREATE TYPE connection_degree AS ENUM ('1st', '2nd', '3rd', 'none');

-- Activity tracking
CREATE TYPE activity_type AS ENUM (
    'email_sent', 'email_opened', 'email_clicked', 'email_replied',
    'call', 'meeting', 'note', 'proposal_sent', 'stage_change', 
    'task_completed', 'other'
);
CREATE TYPE activity_sentiment AS ENUM ('positive', 'neutral', 'negative');

-- Document management
CREATE TYPE document_type AS ENUM (
    'loi', 'proposal', 'budget', 'cover_letter', 
    'progress_report', 'thank_you', 'other'
);
CREATE TYPE document_status AS ENUM ('draft', 'in_review', 'sent', 'accepted', 'rejected');
```

---

## Migration Files

The schema is split across three migration files:

1. **`00001_create_base_tables.sql`** - All table definitions, indexes, and enum types
2. **`00002_rls_policies.sql`** - Row Level Security policies for multi-tenant isolation
3. **`00003_functions_triggers.sql`** - Helper functions, triggers, and stored procedures

---

## Usage Examples

### Add a donor to a campaign pipeline
```sql
SELECT add_donor_to_campaign(
    'campaign-uuid-here',
    'donor-uuid-here',
    85  -- alignment score
);
```

### Get pipeline summary for a campaign
```sql
SELECT * FROM get_pipeline_summary('campaign-uuid-here');
-- Returns: stage, count, total_ask_amount
```

### Search donors by focus area
```sql
SELECT * FROM search_donors(
    'education technology youth',  -- search query
    'Foundation',                   -- category filter
    'CA',                          -- state filter
    'NATIONAL',                    -- tier filter
    NULL,                          -- min assets
    NULL,                          -- max assets
    50,                            -- limit
    0                              -- offset
);
```

### Log an activity
```sql
SELECT log_activity(
    'call',                        -- type
    'Intro call with program officer', -- title
    'campaign-donor-uuid',         -- campaign_donor_id
    'contact-uuid',                -- contact_id
    'Discussed partnership opportunities', -- description
    15,                            -- duration_minutes
    'positive'                     -- sentiment
);
```
