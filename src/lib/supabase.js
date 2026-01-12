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

export default supabase;
