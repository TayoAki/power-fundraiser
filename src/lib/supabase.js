/**
 * Supabase Client
 * 
 * Centralized client for database operations.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// DONOR OPERATIONS
// ============================================================================

export async function getDonors(filters = {}) {
    let query = supabase
        .from('donors')
        .select('*');
    
    if (filters.category) {
        query = query.eq('category', filters.category);
    }
    if (filters.state) {
        query = query.eq('state', filters.state);
    }
    if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,focus_areas.ilike.%${filters.search}%`);
    }
    if (filters.limit) {
        query = query.limit(filters.limit);
    }
    
    const { data, error } = await query.order('alignment_score', { ascending: false });
    
    if (error) {
        console.error('Error fetching donors:', error);
        throw error;
    }
    
    return data;
}

export async function getDonorById(id) {
    const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error('Error fetching donor:', error);
        throw error;
    }
    
    return data;
}

export async function updateDonor(id, updates) {
    const { data, error } = await supabase
        .from('donors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating donor:', error);
        throw error;
    }
    
    return data;
}

export async function createDonor(donor) {
    const { data, error } = await supabase
        .from('donors')
        .insert(donor)
        .select()
        .single();
    
    if (error) {
        console.error('Error creating donor:', error);
        throw error;
    }
    
    return data;
}

// ============================================================================
// CAMPAIGN OPERATIONS
// ============================================================================

export async function getCampaigns(orgId) {
    const { data, error } = await supabase
        .from('campaigns')
        .select('*, campaign_donors(count)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
    }
    
    return data;
}

export async function getCampaignById(id) {
    const { data, error } = await supabase
        .from('campaigns')
        .select(`
            *,
            campaign_donors (
                *,
                donor:donors (*)
            )
        `)
        .eq('id', id)
        .single();
    
    if (error) {
        console.error('Error fetching campaign:', error);
        throw error;
    }
    
    return data;
}

export async function createCampaign(campaign) {
    const { data, error } = await supabase
        .from('campaigns')
        .insert(campaign)
        .select()
        .single();
    
    if (error) {
        console.error('Error creating campaign:', error);
        throw error;
    }
    
    return data;
}

export async function updateCampaign(id, updates) {
    const { data, error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating campaign:', error);
        throw error;
    }
    
    return data;
}

// ============================================================================
// CAMPAIGN DONOR OPERATIONS
// ============================================================================

export async function addDonorToCampaign(campaignId, donorId, stage = 'research') {
    const { data, error } = await supabase
        .from('campaign_donors')
        .insert({
            campaign_id: campaignId,
            donor_id: donorId,
            pipeline_stage: stage,
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error adding donor to campaign:', error);
        throw error;
    }
    
    return data;
}

export async function updateCampaignDonor(campaignId, donorId, updates) {
    const { data, error } = await supabase
        .from('campaign_donors')
        .update(updates)
        .eq('campaign_id', campaignId)
        .eq('donor_id', donorId)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating campaign donor:', error);
        throw error;
    }
    
    return data;
}

export async function removeDonorFromCampaign(campaignId, donorId) {
    const { error } = await supabase
        .from('campaign_donors')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('donor_id', donorId);
    
    if (error) {
        console.error('Error removing donor from campaign:', error);
        throw error;
    }
    
    return true;
}

export async function getCampaignDonors(campaignId) {
    const { data, error } = await supabase
        .from('campaign_donors')
        .select(`
            *,
            donor:donors (*)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching campaign donors:', error);
        throw error;
    }
    
    return data;
}

// ============================================================================
// CONTACT OPERATIONS
// ============================================================================

export async function getContacts(filters = {}) {
    let query = supabase
        .from('contacts')
        .select('*');
    
    if (filters.donorId) {
        query = query.eq('donor_id', filters.donorId);
    }
    if (filters.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
    }
    
    const { data, error } = await query.order('name');
    
    if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
    }
    
    return data;
}

export async function createContact(contact) {
    const { data, error } = await supabase
        .from('contacts')
        .insert(contact)
        .select()
        .single();
    
    if (error) {
        console.error('Error creating contact:', error);
        throw error;
    }
    
    return data;
}

export async function updateContact(id, updates) {
    const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating contact:', error);
        throw error;
    }
    
    return data;
}

// ============================================================================
// ACTIVITY OPERATIONS
// ============================================================================

export async function logActivity(activity) {
    const { data, error } = await supabase
        .from('activities')
        .insert(activity)
        .select()
        .single();
    
    if (error) {
        console.error('Error logging activity:', error);
        throw error;
    }
    
    return data;
}

export async function getActivities(filters = {}) {
    let query = supabase
        .from('activities')
        .select('*');
    
    if (filters.campaignDonorId) {
        query = query.eq('campaign_donor_id', filters.campaignDonorId);
    }
    if (filters.contactId) {
        query = query.eq('contact_id', filters.contactId);
    }
    if (filters.limit) {
        query = query.limit(filters.limit);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching activities:', error);
        throw error;
    }
    
    return data;
}

// ============================================================================
// DOCUMENT OPERATIONS
// ============================================================================

export async function saveDocument(doc) {
    const { data, error } = await supabase
        .from('documents')
        .insert(doc)
        .select()
        .single();
    
    if (error) {
        console.error('Error saving document:', error);
        throw error;
    }
    
    return data;
}

export async function getDocuments(filters = {}) {
    let query = supabase
        .from('documents')
        .select('*');
    
    if (filters.organizationId) {
        query = query.eq('organization_id', filters.organizationId);
    }
    if (filters.campaignDonorId) {
        query = query.eq('campaign_donor_id', filters.campaignDonorId);
    }
    if (filters.type) {
        query = query.eq('type', filters.type);
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching documents:', error);
        throw error;
    }
    
    return data;
}

export async function updateDocument(id, updates) {
    const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating document:', error);
        throw error;
    }
    
    return data;
}

// ============================================================================
// ORGANIZATION OPERATIONS
// ============================================================================

export async function getOrganization(id) {
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error('Error fetching organization:', error);
        throw error;
    }
    
    return data;
}

export async function updateOrganization(id, updates) {
    const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating organization:', error);
        throw error;
    }
    
    return data;
}

// ============================================================================
// USER PROFILE OPERATIONS
// ============================================================================

export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*, organization:organizations(*)')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
    
    return data;
}

export async function updateUserProfile(userId, updates) {
    const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
    
    return data;
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
        console.error('Error getting current user:', error);
        return null;
    }
    
    return user;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    
    if (error) {
        console.error('Error signing in:', error);
        throw error;
    }
    
    return data;
}

export async function signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata,
        },
    });
    
    if (error) {
        console.error('Error signing up:', error);
        throw error;
    }
    
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error('Error signing out:', error);
        throw error;
    }
    
    return true;
}

// ============================================================================
// ORGANIZATION SETTINGS
// ============================================================================

/**
 * Save organization settings to the database
 */
export async function saveOrganizationToDB(orgData, userId) {
    console.log('💾 [Supabase] Saving organization:', orgData.name);
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('⚠️ [Supabase] Not configured, skipping org save');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('organizations')
            .insert({
                name: orgData.name,
                mission: orgData.mission || null,
                vision: orgData.vision || null,
                website: orgData.website || null,
                zip_code: orgData.zipCode || null,
                linkedin_url: orgData.linkedin || null,
                twitter_url: orgData.twitter || null,
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ [Supabase] Error saving organization:', error.message);
            return null;
        }
        
        console.log('✅ [Supabase] Organization saved with ID:', data.id);
        
        // Store org ID in localStorage for future reference
        localStorage.setItem('organizationId', data.id);
        
        return data;
    } catch (error) {
        console.error('❌ [Supabase] saveOrganizationToDB failed:', error.message);
        return null;
    }
}

/**
 * Load organization settings from the database
 */
export async function loadOrganizationFromDB(orgId) {
    console.log('📥 [Supabase] Loading organization:', orgId);
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('⚠️ [Supabase] Not configured, skipping org load');
        return null;
    }
    
    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!orgId || !uuidRegex.test(orgId)) {
        console.log('⚠️ [Supabase] Invalid org ID, skipping load');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();
        
        if (error) {
            console.warn('⚠️ [Supabase] Error loading organization:', error.message);
            return null;
        }
        
        // Transform to match expected format
        const org = {
            id: data.id,
            name: data.name,
            mission: data.mission,
            vision: data.vision,
            website: data.website,
            zipCode: data.zip_code,
            linkedin: data.linkedin_url,
            twitter: data.twitter_url,
        };
        
        console.log('✅ [Supabase] Loaded organization:', org.name);
        return org;
    } catch (error) {
        console.warn('⚠️ [Supabase] loadOrganizationFromDB failed:', error.message);
        return null;
    }
}

/**
 * Update organization settings in the database
 */
export async function updateOrganizationInDB(orgId, updates) {
    console.log('📝 [Supabase] Updating organization:', orgId);
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('⚠️ [Supabase] Not configured, skipping org update');
        return null;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!orgId || !uuidRegex.test(orgId)) {
        console.log('⚠️ [Supabase] Invalid org ID, skipping update');
        return null;
    }
    
    try {
        const dbUpdates = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.mission !== undefined) dbUpdates.mission = updates.mission;
        if (updates.vision !== undefined) dbUpdates.vision = updates.vision;
        if (updates.website !== undefined) dbUpdates.website = updates.website;
        if (updates.zipCode !== undefined) dbUpdates.zip_code = updates.zipCode;
        if (updates.linkedin !== undefined) dbUpdates.linkedin_url = updates.linkedin;
        if (updates.twitter !== undefined) dbUpdates.twitter_url = updates.twitter;
        dbUpdates.updated_at = new Date().toISOString();
        
        const { data, error } = await supabase
            .from('organizations')
            .update(dbUpdates)
            .eq('id', orgId)
            .select()
            .single();
        
        if (error) {
            console.error('❌ [Supabase] Error updating organization:', error.message);
            return null;
        }
        
        console.log('✅ [Supabase] Organization updated');
        return data;
    } catch (error) {
        console.error('❌ [Supabase] updateOrganizationInDB failed:', error.message);
        return null;
    }
}

// ============================================================================
// AI DONOR SEARCH RESULTS STORAGE
// ============================================================================

/**
 * Map category string to valid donor_category enum value
 */
function mapCategory(category) {
    const categoryMap = {
        'Foundation': 'Foundation',
        'Corporate': 'Corporate',
        'Individual': 'Individual',
        'Individual Donor': 'Individual',
        'Government': 'Government',
        'Government Grant': 'Government',
        'International': 'Other',
        'Other': 'Other',
    };
    return categoryMap[category] || 'Foundation';
}

/**
 * Save AI-generated donor search results to the database
 * Creates donors in bulk and links them to a campaign
 */
export async function saveAIDonorResults(campaignId, donors, userId) {
    console.log('💾 [Supabase] Saving', donors.length, 'AI donors to database...');
    
    // Check if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('⚠️ [Supabase] Not configured, skipping DB save');
        return [];
    }
    
    // Check if campaignId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (campaignId && !uuidRegex.test(campaignId)) {
        console.log('⚠️ [Supabase] Campaign ID is not a valid UUID, skipping campaign link:', campaignId);
        // Still save donors, just don't link to campaign
        campaignId = null;
    }
    
    try {
        // Prepare donors for insertion
        // NOTE: Only include columns that EXIST in the live Supabase database
        // See SUPABASE_NOTES.md for schema mismatch details
        // Missing columns: fiscal_year_end, principal_officer, officers, grants
        const donorsToInsert = donors.map(donor => ({
            name: donor.name,
            category: mapCategory(donor.category),
            city: donor.location?.split(',')[0]?.trim() || null,
            state: donor.location?.split(',')[1]?.trim() || null,
            website: donor.website || null,
            focus_areas: donor.focus_areas || null,
            total_assets: donor.total_assets || null,
            total_giving: donor.annual_giving || null,
            description: donor.description || null,
            ein: donor.ein ? String(donor.ein) : null,
        }));
        
        // Insert donors in bulk
        const { data: insertedDonors, error: donorsError } = await supabase
            .from('donors')
            .insert(donorsToInsert)
            .select();
        
        if (donorsError) {
            console.error('❌ [Supabase] Error inserting donors:', donorsError);
            throw donorsError;
        }
        
        console.log('✅ [Supabase] Inserted', insertedDonors.length, 'donors');
        
        // Link donors to campaign with alignment scores
        if (campaignId && insertedDonors.length > 0) {
            const campaignDonors = insertedDonors.map((insertedDonor, index) => ({
                campaign_id: campaignId,
                donor_id: insertedDonor.id,
                stage: 'research',
                alignment_score: donors[index]?.alignment_score || null,
                ai_recommendation: donors[index]?.description || null,
            }));
            
            const { error: linkError } = await supabase
                .from('campaign_donors')
                .insert(campaignDonors);
            
            if (linkError) {
                console.error('❌ [Supabase] Error linking donors to campaign:', linkError);
                // Don't throw - donors are already saved
            } else {
                console.log('✅ [Supabase] Linked donors to campaign', campaignId);
            }
        }
        
        return insertedDonors;
    } catch (error) {
        console.error('❌ [Supabase] saveAIDonorResults failed:', error);
        throw error;
    }
}

/**
 * Load AI donor search results for a campaign from the database
 */
export async function loadCampaignDonorsFromDB(campaignId) {
    console.log('📥 [Supabase] Loading donors for campaign:', campaignId);
    
    // Check if campaignId is a valid UUID (Supabase uses UUIDs)
    // localStorage mock IDs are like "campaign-1736..." which won't work
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!campaignId || !uuidRegex.test(campaignId)) {
        console.log('⚠️ [Supabase] Campaign ID is not a valid UUID, skipping DB lookup:', campaignId);
        return [];
    }
    
    // Check if Supabase is configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('⚠️ [Supabase] Not configured, skipping DB lookup');
        return [];
    }
    
    try {
        const { data, error } = await supabase
            .from('campaign_donors')
            .select(`
                *,
                donor:donors (*)
            `)
            .eq('campaign_id', campaignId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.warn('⚠️ [Supabase] Error loading campaign donors:', error.message || error);
            return []; // Return empty instead of throwing
        }
        
        if (!data || data.length === 0) {
            console.log('📭 [Supabase] No donors found in database for campaign');
            return [];
        }
        
        // Transform to match the expected format
        const donors = data.map(cd => ({
            id: cd.donor?.id,
            name: cd.donor?.name,
            category: cd.donor?.category,
            location: cd.donor?.city && cd.donor?.state ? `${cd.donor.city}, ${cd.donor.state}` : cd.donor?.city || '',
            website: cd.donor?.website,
            focus_areas: cd.donor?.focus_areas,
            funding_range: cd.donor?.funding_range,
            alignment_score: cd.donor?.alignment_score,
            total_assets: cd.donor?.total_assets,
            annual_giving: cd.donor?.total_giving,
            description: cd.donor?.description || cd.ai_recommendation,
            deadline: cd.donor?.deadline || 'Rolling',
            status: cd.pipeline_stage || 'Research',
            source: 'database',
        })).filter(d => d.id && d.name); // Filter out any invalid entries
        
        console.log('✅ [Supabase] Loaded', donors.length, 'donors from database');
        return donors;
    } catch (error) {
        console.warn('⚠️ [Supabase] loadCampaignDonorsFromDB failed:', error.message || error);
        return [];
    }
}

/**
 * Create a campaign in the database
 */
export async function createCampaignInDB(name, searchConfig, userId, orgId) {
    console.log('📁 [Supabase] Creating campaign:', name);
    
    try {
        const { data, error } = await supabase
            .from('campaigns')
            .insert({
                name: name,
                organization_id: orgId || null,
                created_by: userId || null,
                search_config: searchConfig,
                status: 'active',
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ [Supabase] Error creating campaign:', error);
            throw error;
        }
        
        console.log('✅ [Supabase] Created campaign with ID:', data.id);
        return data;
    } catch (error) {
        console.error('❌ [Supabase] createCampaignInDB failed:', error);
        throw error;
    }
}

/**
 * Load all campaigns for an organization from the database
 */
export async function loadCampaignsFromDB(orgId, userId) {
    console.log('📋 [Supabase] Loading campaigns...');
    
    try {
        let query = supabase
            .from('campaigns')
            .select(`
                *,
                campaign_donors (count)
            `)
            .order('created_at', { ascending: false });
        
        // Filter by org or user if provided
        if (orgId) {
            query = query.eq('organization_id', orgId);
        } else if (userId) {
            query = query.eq('created_by', userId);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('❌ [Supabase] Error loading campaigns:', error);
            throw error;
        }
        
        // Transform to match expected format
        const campaigns = data.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            searchConfig: c.search_config,
            createdAt: c.created_at,
            donorCount: c.campaign_donors?.[0]?.count || 0,
        }));
        
        console.log('✅ [Supabase] Loaded', campaigns.length, 'campaigns');
        return campaigns;
    } catch (error) {
        console.error('❌ [Supabase] loadCampaignsFromDB failed:', error);
        return [];
    }
}

export default supabase;
