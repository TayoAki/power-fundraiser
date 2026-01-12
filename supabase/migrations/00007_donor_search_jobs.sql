-- Donor Search Jobs table for polling architecture
-- Stores async search job status and results

CREATE TABLE IF NOT EXISTS donor_search_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Job status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, complete, error
    progress INTEGER DEFAULT 0, -- 0-100 progress percentage
    stage VARCHAR(100), -- Current processing stage message
    
    -- Search parameters
    organization_name VARCHAR(500),
    mission TEXT,
    zip_code VARCHAR(20),
    focus_areas TEXT,
    donor_count INTEGER DEFAULT 50,
    
    -- Results (stored as JSONB when complete)
    results JSONB DEFAULT '[]',
    error_message TEXT,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Cleanup: auto-delete after 1 hour
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Index for quick status lookups
CREATE INDEX idx_donor_search_jobs_status ON donor_search_jobs(status);
CREATE INDEX idx_donor_search_jobs_expires ON donor_search_jobs(expires_at);

-- Auto-cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_search_jobs()
RETURNS void AS $$
BEGIN
    DELETE FROM donor_search_jobs WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
