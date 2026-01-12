-- Migration: 00002_rls_policies
-- Description: Row Level Security policies for multi-tenant isolation
-- All data is scoped to the user's organization

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Get user's organization ID
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

-- Users can view their own organization
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    USING (id = get_user_org_id());

-- Users can update their own organization
CREATE POLICY "Users can update own organization"
    ON organizations FOR UPDATE
    USING (id = get_user_org_id());

-- ============================================================================
-- USER PROFILES POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- DONORS POLICIES
-- Donors are shared across all organizations (public data from 990-PF)
-- ============================================================================

-- All authenticated users can view donors
CREATE POLICY "Authenticated users can view donors"
    ON donors FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can insert/update donors (for enrichment pipeline)
CREATE POLICY "Service role can manage donors"
    ON donors FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- CAMPAIGNS POLICIES
-- ============================================================================

-- Users can view campaigns in their organization
CREATE POLICY "Users can view org campaigns"
    ON campaigns FOR SELECT
    USING (organization_id = get_user_org_id());

-- Users can create campaigns in their organization
CREATE POLICY "Users can create org campaigns"
    ON campaigns FOR INSERT
    WITH CHECK (organization_id = get_user_org_id());

-- Users can update campaigns in their organization
CREATE POLICY "Users can update org campaigns"
    ON campaigns FOR UPDATE
    USING (organization_id = get_user_org_id());

-- Users can delete campaigns in their organization
CREATE POLICY "Users can delete org campaigns"
    ON campaigns FOR DELETE
    USING (organization_id = get_user_org_id());

-- ============================================================================
-- CAMPAIGN_DONORS POLICIES
-- ============================================================================

-- Users can view campaign_donors for their org's campaigns
CREATE POLICY "Users can view org campaign_donors"
    ON campaign_donors FOR SELECT
    USING (
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE organization_id = get_user_org_id()
        )
    );

-- Users can manage campaign_donors for their org's campaigns
CREATE POLICY "Users can insert org campaign_donors"
    ON campaign_donors FOR INSERT
    WITH CHECK (
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE organization_id = get_user_org_id()
        )
    );

CREATE POLICY "Users can update org campaign_donors"
    ON campaign_donors FOR UPDATE
    USING (
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE organization_id = get_user_org_id()
        )
    );

CREATE POLICY "Users can delete org campaign_donors"
    ON campaign_donors FOR DELETE
    USING (
        campaign_id IN (
            SELECT id FROM campaigns 
            WHERE organization_id = get_user_org_id()
        )
    );

-- ============================================================================
-- CONTACTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view org contacts"
    ON contacts FOR SELECT
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert org contacts"
    ON contacts FOR INSERT
    WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "Users can update org contacts"
    ON contacts FOR UPDATE
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can delete org contacts"
    ON contacts FOR DELETE
    USING (organization_id = get_user_org_id());

-- ============================================================================
-- ACTIVITIES POLICIES
-- ============================================================================

CREATE POLICY "Users can view org activities"
    ON activities FOR SELECT
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert org activities"
    ON activities FOR INSERT
    WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "Users can update org activities"
    ON activities FOR UPDATE
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can delete org activities"
    ON activities FOR DELETE
    USING (organization_id = get_user_org_id());

-- ============================================================================
-- NOTES POLICIES
-- ============================================================================

CREATE POLICY "Users can view org notes"
    ON notes FOR SELECT
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert org notes"
    ON notes FOR INSERT
    WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "Users can update org notes"
    ON notes FOR UPDATE
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can delete org notes"
    ON notes FOR DELETE
    USING (organization_id = get_user_org_id());

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================

CREATE POLICY "Users can view org tasks"
    ON tasks FOR SELECT
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert org tasks"
    ON tasks FOR INSERT
    WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "Users can update org tasks"
    ON tasks FOR UPDATE
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can delete org tasks"
    ON tasks FOR DELETE
    USING (organization_id = get_user_org_id());

-- ============================================================================
-- DOCUMENTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view org documents"
    ON documents FOR SELECT
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert org documents"
    ON documents FOR INSERT
    WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "Users can update org documents"
    ON documents FOR UPDATE
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can delete org documents"
    ON documents FOR DELETE
    USING (organization_id = get_user_org_id());

-- ============================================================================
-- PIPELINE STAGE HISTORY POLICIES
-- ============================================================================

CREATE POLICY "Users can view org stage history"
    ON pipeline_stage_history FOR SELECT
    USING (
        campaign_donor_id IN (
            SELECT cd.id FROM campaign_donors cd
            JOIN campaigns c ON cd.campaign_id = c.id
            WHERE c.organization_id = get_user_org_id()
        )
    );

CREATE POLICY "Users can insert org stage history"
    ON pipeline_stage_history FOR INSERT
    WITH CHECK (
        campaign_donor_id IN (
            SELECT cd.id FROM campaign_donors cd
            JOIN campaigns c ON cd.campaign_id = c.id
            WHERE c.organization_id = get_user_org_id()
        )
    );

-- ============================================================================
-- EMAIL TEMPLATES POLICIES
-- ============================================================================

-- Users can view their org's templates OR system templates
CREATE POLICY "Users can view templates"
    ON email_templates FOR SELECT
    USING (
        organization_id = get_user_org_id() 
        OR is_system_template = true
    );

CREATE POLICY "Users can insert org templates"
    ON email_templates FOR INSERT
    WITH CHECK (organization_id = get_user_org_id());

CREATE POLICY "Users can update org templates"
    ON email_templates FOR UPDATE
    USING (organization_id = get_user_org_id());

CREATE POLICY "Users can delete org templates"
    ON email_templates FOR DELETE
    USING (organization_id = get_user_org_id());
