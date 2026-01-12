-- Migration: 00004_views_indexes
-- Description: Useful views for common queries and additional indexes

-- ============================================================================
-- CAMPAIGN DONORS VIEW (with donor details)
-- ============================================================================

CREATE OR REPLACE VIEW campaign_donors_detailed AS
SELECT 
    cd.id AS campaign_donor_id,
    cd.campaign_id,
    cd.donor_id,
    cd.stage,
    cd.alignment_score,
    cd.health_score,
    cd.network_score,
    cd.mission_score,
    cd.financial_score,
    cd.health_trend,
    cd.ask_amount,
    cd.recommended_amount,
    cd.ai_recommendation,
    cd.approach_strategy,
    cd.is_rejected,
    cd.added_at,
    cd.qualified_at,
    cd.last_activity_at,
    cd.funded_at,
    
    -- Donor fields
    d.name AS donor_name,
    d.category AS donor_category,
    d.tier AS donor_tier,
    d.city AS donor_city,
    d.state AS donor_state,
    d.total_assets,
    d.focus_areas,
    d.funding_range,
    d.website AS donor_website,
    d.description AS donor_description,
    d.officers,
    d.ai_insights,
    
    -- Campaign fields
    c.name AS campaign_name,
    c.organization_id
    
FROM campaign_donors cd
JOIN donors d ON cd.donor_id = d.id
JOIN campaigns c ON cd.campaign_id = c.id;

-- ============================================================================
-- PIPELINE OVERVIEW VIEW
-- ============================================================================

CREATE OR REPLACE VIEW pipeline_overview AS
SELECT 
    c.organization_id,
    c.id AS campaign_id,
    c.name AS campaign_name,
    cd.stage,
    COUNT(*) AS donor_count,
    COALESCE(SUM(cd.ask_amount), 0) AS total_ask_amount,
    AVG(cd.alignment_score)::INTEGER AS avg_alignment_score,
    AVG(cd.health_score)::INTEGER AS avg_health_score
FROM campaigns c
LEFT JOIN campaign_donors cd ON c.id = cd.campaign_id AND cd.is_rejected = false
GROUP BY c.organization_id, c.id, c.name, cd.stage;

-- ============================================================================
-- CONTACT ACTIVITY SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW contact_activity_summary AS
SELECT 
    ct.id AS contact_id,
    ct.name AS contact_name,
    ct.title,
    ct.role,
    ct.donor_id,
    ct.organization_id,
    ct.health_score,
    ct.connection_degree,
    d.name AS donor_name,
    
    -- Activity counts
    COUNT(a.id) AS total_activities,
    COUNT(CASE WHEN a.type = 'email_sent' THEN 1 END) AS emails_sent,
    COUNT(CASE WHEN a.type = 'email_opened' THEN 1 END) AS emails_opened,
    COUNT(CASE WHEN a.type = 'call' THEN 1 END) AS calls,
    COUNT(CASE WHEN a.type = 'meeting' THEN 1 END) AS meetings,
    
    -- Last activity
    MAX(a.occurred_at) AS last_activity_at,
    
    -- Recent sentiment
    (
        SELECT sentiment 
        FROM activities 
        WHERE contact_id = ct.id AND sentiment IS NOT NULL
        ORDER BY occurred_at DESC 
        LIMIT 1
    ) AS last_sentiment

FROM contacts ct
LEFT JOIN donors d ON ct.donor_id = d.id
LEFT JOIN activities a ON ct.id = a.contact_id
GROUP BY ct.id, ct.name, ct.title, ct.role, ct.donor_id, 
         ct.organization_id, ct.health_score, ct.connection_degree, d.name;

-- ============================================================================
-- NETWORK CONNECTIONS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW network_connections AS
SELECT 
    ct.organization_id,
    d.id AS donor_id,
    d.name AS donor_name,
    d.total_assets,
    d.focus_areas,
    
    -- Connection counts by degree
    COUNT(CASE WHEN ct.connection_degree = '1st' THEN 1 END) AS first_degree_count,
    COUNT(CASE WHEN ct.connection_degree = '2nd' THEN 1 END) AS second_degree_count,
    COUNT(CASE WHEN ct.connection_degree = '3rd' THEN 1 END) AS third_degree_count,
    COUNT(*) AS total_contacts,
    
    -- Warm paths (1st or 2nd degree)
    COUNT(CASE WHEN ct.connection_degree IN ('1st', '2nd') THEN 1 END) AS warm_paths,
    
    -- Best connection
    MIN(
        CASE ct.connection_degree 
            WHEN '1st' THEN 1 
            WHEN '2nd' THEN 2 
            WHEN '3rd' THEN 3 
            ELSE 4 
        END
    ) AS best_connection_score

FROM contacts ct
JOIN donors d ON ct.donor_id = d.id
GROUP BY ct.organization_id, d.id, d.name, d.total_assets, d.focus_areas;

-- ============================================================================
-- RECENT ACTIVITIES VIEW
-- ============================================================================

CREATE OR REPLACE VIEW recent_activities AS
SELECT 
    a.id,
    a.organization_id,
    a.type,
    a.title,
    a.description,
    a.occurred_at,
    a.duration_minutes,
    a.sentiment,
    a.tags,
    
    -- Related entities
    cd.id AS campaign_donor_id,
    d.id AS donor_id,
    d.name AS donor_name,
    ct.id AS contact_id,
    ct.name AS contact_name,
    c.id AS campaign_id,
    c.name AS campaign_name,
    
    -- User who created
    up.full_name AS created_by_name

FROM activities a
LEFT JOIN campaign_donors cd ON a.campaign_donor_id = cd.id
LEFT JOIN donors d ON a.donor_id = d.id
LEFT JOIN contacts ct ON a.contact_id = ct.id
LEFT JOIN campaigns c ON cd.campaign_id = c.id
LEFT JOIN user_profiles up ON a.created_by = up.id
ORDER BY a.occurred_at DESC;

-- ============================================================================
-- DOCUMENT OVERVIEW VIEW
-- ============================================================================

CREATE OR REPLACE VIEW documents_overview AS
SELECT 
    doc.id,
    doc.organization_id,
    doc.type,
    doc.status,
    doc.title,
    doc.ask_amount,
    doc.program_name,
    doc.word_count,
    doc.ai_strength_score,
    doc.version,
    doc.sent_at,
    doc.created_at,
    doc.updated_at,
    
    -- Related entities
    d.id AS donor_id,
    d.name AS donor_name,
    c.id AS campaign_id,
    c.name AS campaign_name,
    
    -- Created by
    up.full_name AS created_by_name

FROM documents doc
LEFT JOIN campaign_donors cd ON doc.campaign_donor_id = cd.id
LEFT JOIN donors d ON doc.donor_id = d.id
LEFT JOIN campaigns c ON cd.campaign_id = c.id
LEFT JOIN user_profiles up ON doc.created_by = up.id;

-- ============================================================================
-- TASK DASHBOARD VIEW
-- ============================================================================

CREATE OR REPLACE VIEW tasks_dashboard AS
SELECT 
    t.id,
    t.organization_id,
    t.title,
    t.description,
    t.is_completed,
    t.completed_at,
    t.due_date,
    t.priority,
    t.created_at,
    
    -- Overdue flag
    CASE 
        WHEN t.due_date < CURRENT_DATE AND NOT t.is_completed 
        THEN true 
        ELSE false 
    END AS is_overdue,
    
    -- Days until due
    t.due_date - CURRENT_DATE AS days_until_due,
    
    -- Related entities
    d.id AS donor_id,
    d.name AS donor_name,
    ct.id AS contact_id,
    ct.name AS contact_name,
    
    -- Assigned to
    up.full_name AS assigned_to_name

FROM tasks t
LEFT JOIN campaign_donors cd ON t.campaign_donor_id = cd.id
LEFT JOIN donors d ON cd.donor_id = d.id
LEFT JOIN contacts ct ON t.contact_id = ct.id
LEFT JOIN user_profiles up ON t.assigned_to = up.id;

-- ============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_campaign_donors_campaign_stage 
    ON campaign_donors(campaign_id, stage) 
    WHERE is_rejected = false;

CREATE INDEX idx_activities_org_occurred 
    ON activities(organization_id, occurred_at DESC);

CREATE INDEX idx_tasks_org_due_incomplete 
    ON tasks(organization_id, due_date) 
    WHERE is_completed = false;

CREATE INDEX idx_contacts_org_donor 
    ON contacts(organization_id, donor_id);

CREATE INDEX idx_documents_org_status 
    ON documents(organization_id, status);

-- Partial indexes for active records
CREATE INDEX idx_campaigns_active 
    ON campaigns(organization_id) 
    WHERE status = 'active';

CREATE INDEX idx_campaign_donors_not_rejected 
    ON campaign_donors(campaign_id) 
    WHERE is_rejected = false;

-- JSONB indexes for AI insights
CREATE INDEX idx_donors_ai_insights 
    ON donors USING GIN(ai_insights);
