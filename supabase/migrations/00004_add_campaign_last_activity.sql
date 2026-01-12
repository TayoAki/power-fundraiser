-- Migration: 00004_add_campaign_last_activity
-- Description: Adds last_activity_at column to campaigns table for tracking recent activity

-- Add last_activity_at to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing campaigns to use created_at as initial last_activity_at
UPDATE campaigns 
SET last_activity_at = COALESCE(updated_at, created_at) 
WHERE last_activity_at IS NULL;

-- Create index for sorting by last activity
CREATE INDEX IF NOT EXISTS idx_campaigns_last_activity ON campaigns(last_activity_at DESC);

-- Add cached_donors JSONB column to store AI search results
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS cached_donors JSONB DEFAULT '[]';

-- Function to update last_activity_at automatically
CREATE OR REPLACE FUNCTION update_campaign_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE campaigns 
    SET last_activity_at = NOW(), updated_at = NOW()
    WHERE id = NEW.campaign_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update campaign last_activity when campaign_donors changes
DROP TRIGGER IF EXISTS trigger_campaign_donor_activity ON campaign_donors;
CREATE TRIGGER trigger_campaign_donor_activity
    AFTER INSERT OR UPDATE ON campaign_donors
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_last_activity();
