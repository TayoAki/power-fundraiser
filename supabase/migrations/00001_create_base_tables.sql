-- Migration: 00001_create_base_tables
-- Description: Creates the foundational tables for Power Fundraiser donor management
-- Supabase compatible with RLS (Row Level Security)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & ORGANIZATIONS
-- ============================================================================

-- Organizations table (nonprofits using the platform)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    mission TEXT,
    vision TEXT,
    website VARCHAR(500),
    zip_code VARCHAR(20),
    linkedin_url VARCHAR(500),
    twitter_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name VARCHAR(255),
    role VARCHAR(100) DEFAULT 'member',
    email_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DONORS (Foundations, Corporations, Individuals)
-- ============================================================================

-- Donor types enum
CREATE TYPE donor_category AS ENUM ('Foundation', 'Corporate', 'Individual', 'Government', 'Other');
CREATE TYPE donor_tier AS ENUM ('LOCAL', 'REGIONAL', 'NATIONAL', 'INTERNATIONAL');
CREATE TYPE enrichment_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- Main donors table
CREATE TABLE donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic info
    name VARCHAR(500) NOT NULL,
    category donor_category DEFAULT 'Foundation',
    tier donor_tier,
    ein VARCHAR(20),
    website VARCHAR(500),
    description TEXT,
    
    -- Location
    city VARCHAR(255),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',
    
    -- Financial data (from 990-PF)
    total_assets BIGINT,
    total_revenue BIGINT,
    total_giving BIGINT,
    fiscal_year_end VARCHAR(20),
    form_type VARCHAR(50),
    
    -- Giving patterns
    giving_range_min INTEGER,
    giving_range_max INTEGER,
    funding_range VARCHAR(100),
    focus_areas TEXT,
    
    -- Key people
    principal_officer VARCHAR(255),
    officers JSONB DEFAULT '[]',
    
    -- Grant history
    grants JSONB DEFAULT '[]',
    
    -- AI enrichment
    enrichment_status enrichment_status DEFAULT 'pending',
    enriched_at TIMESTAMPTZ,
    ai_insights JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(focus_areas, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C')
    ) STORED
);

-- Index for full-text search
CREATE INDEX idx_donors_search ON donors USING GIN(search_vector);
CREATE INDEX idx_donors_category ON donors(category);
CREATE INDEX idx_donors_tier ON donors(tier);
CREATE INDEX idx_donors_state ON donors(state);

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================

CREATE TYPE campaign_status AS ENUM ('active', 'paused', 'completed', 'archived');

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status campaign_status DEFAULT 'active',
    
    -- Campaign configuration
    target_amount BIGINT,
    target_region VARCHAR(255),
    grant_size_min INTEGER,
    grant_size_max INTEGER,
    cause_areas TEXT[],
    
    -- AI search config
    organization_mission TEXT,
    strategic_goals TEXT,
    search_config JSONB DEFAULT '{}',
    
    -- Stats
    prospects_count INTEGER DEFAULT 0,
    qualified_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_org ON campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- ============================================================================
-- CAMPAIGN-DONOR RELATIONSHIP (Junction Table)
-- ============================================================================

CREATE TYPE donor_pipeline_stage AS ENUM (
    'research',
    'qualified', 
    'cultivating',
    'negotiations',
    'funded',
    'stewardship',
    'rejected'
);

CREATE TABLE campaign_donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    donor_id UUID NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    
    -- Pipeline status
    stage donor_pipeline_stage DEFAULT 'research',
    
    -- Scoring
    alignment_score INTEGER CHECK (alignment_score >= 0 AND alignment_score <= 100),
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    network_score INTEGER CHECK (network_score >= 0 AND network_score <= 100),
    mission_score INTEGER CHECK (mission_score >= 0 AND mission_score <= 100),
    financial_score VARCHAR(50),
    health_trend VARCHAR(20) DEFAULT 'stable',
    
    -- Ask details
    ask_amount BIGINT,
    recommended_amount VARCHAR(100),
    
    -- AI recommendations
    ai_recommendation TEXT,
    approach_strategy TEXT,
    
    -- Status flags
    is_rejected BOOLEAN DEFAULT FALSE,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Timestamps
    added_at TIMESTAMPTZ DEFAULT NOW(),
    qualified_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    funded_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id, donor_id)
);

CREATE INDEX idx_campaign_donors_campaign ON campaign_donors(campaign_id);
CREATE INDEX idx_campaign_donors_donor ON campaign_donors(donor_id);
CREATE INDEX idx_campaign_donors_stage ON campaign_donors(stage);

-- ============================================================================
-- CONTACTS (People at Donor Organizations)
-- ============================================================================

CREATE TYPE contact_role AS ENUM (
    'Champion',
    'Key Voter', 
    'Influencer',
    'Gatekeeper',
    'Decision Maker',
    'Program Officer',
    'Board Member',
    'New',
    'Other'
);

CREATE TYPE connection_degree AS ENUM ('1st', '2nd', '3rd', 'none');

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES donors(id) ON DELETE SET NULL,
    
    -- Contact info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    title VARCHAR(255),
    
    -- Relationship data
    role contact_role DEFAULT 'Other',
    connection_degree connection_degree DEFAULT 'none',
    connected_through VARCHAR(255),
    
    -- Engagement tracking
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    last_interaction_at TIMESTAMPTZ,
    
    -- Social profiles
    linkedin_url VARCHAR(500),
    twitter_url VARCHAR(500),
    
    -- Avatar/photo
    avatar_url VARCHAR(500),
    
    -- Source tracking
    source VARCHAR(100),
    imported_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_org ON contacts(organization_id);
CREATE INDEX idx_contacts_donor ON contacts(donor_id);
CREATE INDEX idx_contacts_role ON contacts(role);

-- ============================================================================
-- ACTIVITIES (Emails, Calls, Meetings)
-- ============================================================================

CREATE TYPE activity_type AS ENUM (
    'email_sent',
    'email_opened',
    'email_clicked',
    'email_replied',
    'call',
    'meeting',
    'note',
    'proposal_sent',
    'stage_change',
    'task_completed',
    'other'
);

CREATE TYPE activity_sentiment AS ENUM ('positive', 'neutral', 'negative');

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Related entities
    campaign_donor_id UUID REFERENCES campaign_donors(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    donor_id UUID REFERENCES donors(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Activity details
    type activity_type NOT NULL,
    title VARCHAR(500),
    description TEXT,
    
    -- Call/meeting specific
    duration_minutes INTEGER,
    sentiment activity_sentiment,
    
    -- Email specific
    email_subject VARCHAR(500),
    email_body TEXT,
    email_tracking_id VARCHAR(255),
    
    -- Tags and metadata
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_org ON activities(organization_id);
CREATE INDEX idx_activities_campaign_donor ON activities(campaign_donor_id);
CREATE INDEX idx_activities_contact ON activities(contact_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_occurred ON activities(occurred_at DESC);

-- ============================================================================
-- NOTES (Contact/Donor Notes)
-- ============================================================================

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Related entities
    campaign_donor_id UUID REFERENCES campaign_donors(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Note content
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    
    -- Action items extracted from note
    action_item VARCHAR(500),
    action_due_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_org ON notes(organization_id);
CREATE INDEX idx_notes_campaign_donor ON notes(campaign_donor_id);
CREATE INDEX idx_notes_contact ON notes(contact_id);

-- ============================================================================
-- TASKS
-- ============================================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Related entities
    campaign_donor_id UUID REFERENCES campaign_donors(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Task details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    
    -- Due date
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'medium',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_org ON tasks(organization_id);
CREATE INDEX idx_tasks_campaign_donor ON tasks(campaign_donor_id);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_completed ON tasks(is_completed);

-- ============================================================================
-- PROPOSALS & DOCUMENTS
-- ============================================================================

CREATE TYPE document_type AS ENUM (
    'loi',
    'proposal',
    'budget',
    'cover_letter',
    'progress_report',
    'thank_you',
    'other'
);

CREATE TYPE document_status AS ENUM ('draft', 'in_review', 'sent', 'accepted', 'rejected');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Related entities
    campaign_donor_id UUID REFERENCES campaign_donors(id) ON DELETE SET NULL,
    donor_id UUID REFERENCES donors(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Document details
    type document_type NOT NULL,
    status document_status DEFAULT 'draft',
    title VARCHAR(500) NOT NULL,
    
    -- Content
    content TEXT,
    content_json JSONB,
    
    -- Request details
    ask_amount BIGINT,
    program_name VARCHAR(255),
    
    -- Metadata
    word_count INTEGER,
    ai_strength_score INTEGER,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    
    -- Timestamps
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_campaign_donor ON documents(campaign_donor_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);

-- ============================================================================
-- PIPELINE STAGE HISTORY (for tracking progression)
-- ============================================================================

CREATE TABLE pipeline_stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_donor_id UUID NOT NULL REFERENCES campaign_donors(id) ON DELETE CASCADE,
    
    from_stage donor_pipeline_stage,
    to_stage donor_pipeline_stage NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stage_history_campaign_donor ON pipeline_stage_history(campaign_donor_id);

-- ============================================================================
-- EMAIL TEMPLATES
-- ============================================================================

CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    
    -- Categorization
    template_type VARCHAR(100),
    tags TEXT[],
    
    -- AI metadata
    match_score INTEGER,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    
    -- System vs custom
    is_system_template BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_org ON email_templates(organization_id);
