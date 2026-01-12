-- Migration: 00003_functions_triggers
-- Description: Helper functions and triggers for automated updates

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_user_profiles
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_donors
    BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_campaigns
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_campaign_donors
    BEFORE UPDATE ON campaign_donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_contacts
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_notes
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_tasks
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_documents
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_email_templates
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PIPELINE STAGE CHANGE TRACKING
-- ============================================================================

CREATE OR REPLACE FUNCTION track_pipeline_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if stage actually changed
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
        INSERT INTO pipeline_stage_history (
            campaign_donor_id,
            from_stage,
            to_stage,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.stage,
            NEW.stage,
            auth.uid()
        );
        
        -- Update last_activity_at
        NEW.last_activity_at = NOW();
        
        -- Set qualified_at if moving to qualified
        IF NEW.stage = 'qualified' AND OLD.stage = 'research' THEN
            NEW.qualified_at = NOW();
        END IF;
        
        -- Set funded_at if moving to funded
        IF NEW.stage = 'funded' THEN
            NEW.funded_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_stage_change
    BEFORE UPDATE ON campaign_donors
    FOR EACH ROW EXECUTE FUNCTION track_pipeline_stage_change();

-- ============================================================================
-- CAMPAIGN STATS UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update prospect count
    UPDATE campaigns
    SET 
        prospects_count = (
            SELECT COUNT(*) FROM campaign_donors 
            WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
            AND is_rejected = false
        ),
        qualified_count = (
            SELECT COUNT(*) FROM campaign_donors 
            WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
            AND stage NOT IN ('research', 'rejected')
            AND is_rejected = false
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_campaign_stats_on_insert
    AFTER INSERT ON campaign_donors
    FOR EACH ROW EXECUTE FUNCTION update_campaign_stats();

CREATE TRIGGER update_campaign_stats_on_update
    AFTER UPDATE ON campaign_donors
    FOR EACH ROW EXECUTE FUNCTION update_campaign_stats();

CREATE TRIGGER update_campaign_stats_on_delete
    AFTER DELETE ON campaign_donors
    FOR EACH ROW EXECUTE FUNCTION update_campaign_stats();

-- ============================================================================
-- ACTIVITY TRACKING HELPERS
-- ============================================================================

-- Update last_activity_at on campaign_donor when activity is logged
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.campaign_donor_id IS NOT NULL THEN
        UPDATE campaign_donors
        SET last_activity_at = NEW.occurred_at
        WHERE id = NEW.campaign_donor_id;
    END IF;
    
    IF NEW.contact_id IS NOT NULL THEN
        UPDATE contacts
        SET last_interaction_at = NEW.occurred_at
        WHERE id = NEW.contact_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_last_activity_on_insert
    AFTER INSERT ON activities
    FOR EACH ROW EXECUTE FUNCTION update_last_activity();

-- ============================================================================
-- HEALTH SCORE CALCULATION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_health_score(
    p_campaign_donor_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_network_score INTEGER;
    v_mission_score INTEGER;
    v_recent_activity_count INTEGER;
    v_days_since_activity INTEGER;
    v_health_score INTEGER;
BEGIN
    -- Get scores from campaign_donor
    SELECT network_score, mission_score
    INTO v_network_score, v_mission_score
    FROM campaign_donors
    WHERE id = p_campaign_donor_id;
    
    -- Count recent activities (last 30 days)
    SELECT COUNT(*)
    INTO v_recent_activity_count
    FROM activities
    WHERE campaign_donor_id = p_campaign_donor_id
    AND occurred_at > NOW() - INTERVAL '30 days';
    
    -- Days since last activity
    SELECT EXTRACT(DAY FROM NOW() - MAX(occurred_at))::INTEGER
    INTO v_days_since_activity
    FROM activities
    WHERE campaign_donor_id = p_campaign_donor_id;
    
    -- Calculate weighted health score
    v_health_score := COALESCE(
        (
            (COALESCE(v_network_score, 50) * 0.3) +
            (COALESCE(v_mission_score, 50) * 0.3) +
            (LEAST(v_recent_activity_count * 10, 40)) -
            (LEAST(COALESCE(v_days_since_activity, 0), 30))
        )::INTEGER,
        50
    );
    
    -- Clamp between 0 and 100
    RETURN GREATEST(0, LEAST(100, v_health_score));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DONOR SEARCH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION search_donors(
    search_query TEXT,
    p_category donor_category DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_tier donor_tier DEFAULT NULL,
    p_min_assets BIGINT DEFAULT NULL,
    p_max_assets BIGINT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    category donor_category,
    tier donor_tier,
    city VARCHAR,
    state VARCHAR,
    total_assets BIGINT,
    focus_areas TEXT,
    alignment_score REAL,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.category,
        d.tier,
        d.city,
        d.state,
        d.total_assets,
        d.focus_areas,
        -- Simple alignment score based on text match
        ts_rank(d.search_vector, websearch_to_tsquery('english', search_query)) * 100 AS alignment_score,
        ts_rank(d.search_vector, websearch_to_tsquery('english', search_query)) AS rank
    FROM donors d
    WHERE 
        (search_query IS NULL OR d.search_vector @@ websearch_to_tsquery('english', search_query))
        AND (p_category IS NULL OR d.category = p_category)
        AND (p_state IS NULL OR d.state = p_state)
        AND (p_tier IS NULL OR d.tier = p_tier)
        AND (p_min_assets IS NULL OR d.total_assets >= p_min_assets)
        AND (p_max_assets IS NULL OR d.total_assets <= p_max_assets)
    ORDER BY rank DESC, d.total_assets DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ADD DONOR TO CAMPAIGN
-- ============================================================================

CREATE OR REPLACE FUNCTION add_donor_to_campaign(
    p_campaign_id UUID,
    p_donor_id UUID,
    p_alignment_score INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_campaign_donor_id UUID;
BEGIN
    INSERT INTO campaign_donors (
        campaign_id,
        donor_id,
        alignment_score,
        stage
    ) VALUES (
        p_campaign_id,
        p_donor_id,
        p_alignment_score,
        'research'
    )
    ON CONFLICT (campaign_id, donor_id) 
    DO UPDATE SET
        is_rejected = false,
        updated_at = NOW()
    RETURNING id INTO v_campaign_donor_id;
    
    RETURN v_campaign_donor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REJECT DONOR FROM CAMPAIGN
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_donor_from_campaign(
    p_campaign_donor_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE campaign_donors
    SET 
        is_rejected = true,
        rejected_at = NOW(),
        rejection_reason = p_reason,
        stage = 'rejected'
    WHERE id = p_campaign_donor_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MOVE DONOR TO STAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION move_donor_to_stage(
    p_campaign_donor_id UUID,
    p_new_stage donor_pipeline_stage
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE campaign_donors
    SET stage = p_new_stage
    WHERE id = p_campaign_donor_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET PIPELINE SUMMARY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pipeline_summary(
    p_campaign_id UUID DEFAULT NULL
)
RETURNS TABLE (
    stage donor_pipeline_stage,
    count BIGINT,
    total_ask_amount BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cd.stage,
        COUNT(*)::BIGINT,
        COALESCE(SUM(cd.ask_amount), 0)::BIGINT
    FROM campaign_donors cd
    JOIN campaigns c ON cd.campaign_id = c.id
    WHERE 
        c.organization_id = get_user_org_id()
        AND (p_campaign_id IS NULL OR cd.campaign_id = p_campaign_id)
        AND cd.is_rejected = false
    GROUP BY cd.stage
    ORDER BY 
        CASE cd.stage
            WHEN 'research' THEN 1
            WHEN 'qualified' THEN 2
            WHEN 'cultivating' THEN 3
            WHEN 'negotiations' THEN 4
            WHEN 'funded' THEN 5
            WHEN 'stewardship' THEN 6
            ELSE 7
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- LOG ACTIVITY HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION log_activity(
    p_type activity_type,
    p_title VARCHAR,
    p_campaign_donor_id UUID DEFAULT NULL,
    p_contact_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT NULL,
    p_sentiment activity_sentiment DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
    v_org_id UUID;
    v_donor_id UUID;
BEGIN
    -- Get org_id from campaign_donor or contact
    IF p_campaign_donor_id IS NOT NULL THEN
        SELECT c.organization_id, cd.donor_id
        INTO v_org_id, v_donor_id
        FROM campaign_donors cd
        JOIN campaigns c ON cd.campaign_id = c.id
        WHERE cd.id = p_campaign_donor_id;
    ELSIF p_contact_id IS NOT NULL THEN
        SELECT organization_id, donor_id
        INTO v_org_id, v_donor_id
        FROM contacts
        WHERE id = p_contact_id;
    ELSE
        v_org_id := get_user_org_id();
    END IF;
    
    INSERT INTO activities (
        organization_id,
        campaign_donor_id,
        contact_id,
        donor_id,
        created_by,
        type,
        title,
        description,
        duration_minutes,
        sentiment,
        metadata
    ) VALUES (
        v_org_id,
        p_campaign_donor_id,
        p_contact_id,
        v_donor_id,
        auth.uid(),
        p_type,
        p_title,
        p_description,
        p_duration_minutes,
        p_sentiment,
        p_metadata
    )
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
