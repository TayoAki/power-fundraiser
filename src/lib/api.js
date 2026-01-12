/**
 * Power Fundraiser API Client
 * 
 * Centralized API client for all backend calls.
 * Currently uses mock implementations - will be replaced with real API calls.
 * 
 * Real Implementation Plan:
 * - OpenRouter: LLM content generation (proposals, emails, insights)
 * - Modal: Data enrichment pipeline (990-PF data, donor research)
 * - Supabase: Database operations, auth, edge functions
 */

const API_BASE = '/api';

// ============================================================================
// API Client Configuration
// ============================================================================

class APIClient {
    constructor() {
        this.baseUrl = API_BASE;
        this.mockDelay = 800; // Simulate network latency
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `API Error: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // Helper for mock responses during development
    async mockResponse(data, delay = this.mockDelay) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return data;
    }
}

const api = new APIClient();

// ============================================================================
// DONOR RESEARCH API
// Searches for and enriches donor/foundation data
// Real Implementation: Modal for 990-PF data pull, OpenRouter for AI insights
// ============================================================================

export const donorResearchAPI = {
    /**
     * Search for donors matching organization's mission and criteria
     * @param {Object} params - Search parameters
     * @param {string} params.query - Search query (mission, focus areas)
     * @param {string} params.organizationMission - Org's mission for AI matching
     * @param {string[]} params.causeAreas - Target cause areas
     * @param {string} params.targetRegion - Geographic focus
     * @param {number} params.grantSizeMin - Minimum grant size
     * @param {number} params.grantSizeMax - Maximum grant size
     * @param {string} params.donorType - Foundation, Corporate, Individual
     * @returns {Promise<{donors: Array, total: number}>}
     */
    async search(params) {
        return api.request('/donors/search', {
            method: 'POST',
            body: params,
        });
    },

    /**
     * Get detailed donor profile with AI insights
     * @param {string} donorId - Donor UUID
     * @returns {Promise<Object>} - Full donor profile with AI analysis
     */
    async getDonorProfile(donorId) {
        return api.request(`/donors/${donorId}`);
    },

    /**
     * Trigger AI enrichment for a donor (generates insights, approach strategy)
     * @param {string} donorId - Donor UUID
     * @param {string} organizationMission - Org mission for personalized insights
     * @returns {Promise<Object>} - Enriched donor data with AI insights
     */
    async enrichDonor(donorId, organizationMission) {
        return api.request(`/donors/${donorId}/enrich`, {
            method: 'POST',
            body: { organizationMission },
        });
    },

    /**
     * Get AI-generated alignment score and analysis
     * @param {string} donorId - Donor UUID
     * @param {Object} orgContext - Organization context for matching
     * @returns {Promise<{score: number, analysis: string, opportunities: string[]}>}
     */
    async getAlignmentAnalysis(donorId, orgContext) {
        return api.request(`/donors/${donorId}/alignment`, {
            method: 'POST',
            body: orgContext,
        });
    },

    /**
     * Batch search for donors (used in campaign creation)
     * @param {Object} campaignConfig - Campaign search configuration
     * @returns {Promise<{donors: Array, searchId: string}>}
     */
    async batchSearch(campaignConfig) {
        return api.request('/donors/batch-search', {
            method: 'POST',
            body: campaignConfig,
        });
    },
};

// ============================================================================
// NETWORK MAPPING API
// Manages user's professional network and connection mapping
// Real Implementation: Supabase for storage, OpenRouter for relationship analysis
// ============================================================================

export const networkAPI = {
    /**
     * Import contacts from CSV/LinkedIn export
     * @param {File|Object[]} contacts - CSV file or parsed contact array
     * @returns {Promise<{imported: number, matched: number, contacts: Array}>}
     */
    async importContacts(contacts) {
        return api.request('/network/import', {
            method: 'POST',
            body: { contacts },
        });
    },

    /**
     * Get all network contacts with connection mappings
     * @param {Object} filters - Optional filters
     * @returns {Promise<{contacts: Array, stats: Object}>}
     */
    async getContacts(filters = {}) {
        const params = new URLSearchParams(filters);
        return api.request(`/network/contacts?${params}`);
    },

    /**
     * Add a new connection manually
     * @param {Object} contact - Contact data
     * @returns {Promise<Object>} - Created contact
     */
    async addContact(contact) {
        return api.request('/network/contacts', {
            method: 'POST',
            body: contact,
        });
    },

    /**
     * Update contact information
     * @param {string} contactId - Contact UUID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} - Updated contact
     */
    async updateContact(contactId, updates) {
        return api.request(`/network/contacts/${contactId}`, {
            method: 'PATCH',
            body: updates,
        });
    },

    /**
     * Delete a contact
     * @param {string} contactId - Contact UUID
     * @returns {Promise<void>}
     */
    async deleteContact(contactId) {
        return api.request(`/network/contacts/${contactId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Map connections between user's network and donor organizations
     * Finds warm paths to foundations via mutual connections
     * @param {string[]} donorIds - Optional specific donors to map
     * @returns {Promise<{mappings: Array, warmPaths: number}>}
     */
    async mapConnections(donorIds = null) {
        return api.request('/network/map', {
            method: 'POST',
            body: { donorIds },
        });
    },

    /**
     * Get warm paths to a specific donor/foundation
     * @param {string} donorId - Donor UUID
     * @returns {Promise<{paths: Array, connectionStrength: number}>}
     */
    async getWarmPaths(donorId) {
        return api.request(`/network/warm-paths/${donorId}`);
    },

    /**
     * AI analysis of network strength and recommendations
     * @returns {Promise<{analysis: string, recommendations: string[], score: number}>}
     */
    async analyzeNetwork() {
        return api.request('/network/analyze', {
            method: 'POST',
        });
    },
};

// ============================================================================
// AI CONTENT GENERATION API
// Generates proposals, emails, and other content
// Real Implementation: OpenRouter for LLM calls
// ============================================================================

export const aiContentAPI = {
    /**
     * Generate a complete proposal draft
     * @param {Object} params - Proposal parameters
     * @param {string} params.type - loi, proposal, budget, cover_letter, thank_you
     * @param {string} params.donorId - Target donor
     * @param {string} params.projectName - Project/program name
     * @param {number} params.amount - Grant request amount
     * @param {string} params.summary - Project summary
     * @param {string} params.goals - Project goals
     * @param {string} params.timeline - Project timeline
     * @returns {Promise<{content: string, title: string, outcomes: string[]}>}
     */
    async generateProposal(params) {
        return api.request('/ai/proposal/generate', {
            method: 'POST',
            body: params,
        });
    },

    /**
     * Rewrite content in a specific style
     * @param {string} content - Original content
     * @param {string} style - formal, persuasive, concise, expand
     * @returns {Promise<{content: string}>}
     */
    async rewriteContent(content, style) {
        return api.request('/ai/rewrite', {
            method: 'POST',
            body: { content, style },
        });
    },

    /**
     * Generate email draft for outreach
     * @param {Object} params - Email parameters
     * @param {string} params.recipientName - Contact name
     * @param {string} params.recipientTitle - Contact title
     * @param {string} params.organizationName - Donor org name
     * @param {string} params.purpose - intro, follow_up, thank_you, proposal_submit
     * @param {Object} params.context - Additional context (previous interactions, etc)
     * @returns {Promise<{subject: string, body: string, suggestions: string[]}>}
     */
    async generateEmail(params) {
        return api.request('/ai/email/generate', {
            method: 'POST',
            body: params,
        });
    },

    /**
     * Generate AI intro paragraph for email/proposal
     * @param {Object} context - Recipient and purpose context
     * @returns {Promise<{intro: string}>}
     */
    async generateIntro(context) {
        return api.request('/ai/generate/intro', {
            method: 'POST',
            body: context,
        });
    },

    /**
     * Generate impact statistics section
     * @param {Object} context - Organization context
     * @returns {Promise<{stats: string}>}
     */
    async generateStats(context) {
        return api.request('/ai/generate/stats', {
            method: 'POST',
            body: context,
        });
    },

    /**
     * Generate call-to-action section
     * @param {Object} context - Purpose and recipient context
     * @returns {Promise<{cta: string}>}
     */
    async generateCTA(context) {
        return api.request('/ai/generate/cta', {
            method: 'POST',
            body: context,
        });
    },

    /**
     * Add content to proposal based on AI chat
     * @param {string} currentContent - Current proposal content
     * @param {string} instruction - User instruction (e.g., "add budget section")
     * @param {Object} context - Proposal context
     * @returns {Promise<{addition: string, suggestion: string}>}
     */
    async expandContent(currentContent, instruction, context) {
        return api.request('/ai/expand', {
            method: 'POST',
            body: { currentContent, instruction, context },
        });
    },

    /**
     * Get AI suggestions to improve proposal
     * @param {string} content - Current content
     * @param {Object} donorContext - Target donor info
     * @returns {Promise<{suggestions: Array<{type: string, text: string}>}>}
     */
    async getSuggestions(content, donorContext) {
        return api.request('/ai/suggestions', {
            method: 'POST',
            body: { content, donorContext },
        });
    },

    /**
     * Analyze and score proposal strength
     * @param {string} content - Proposal content
     * @param {Object} context - Donor and ask context
     * @returns {Promise<{score: number, feedback: string[], improvements: string[]}>}
     */
    async analyzeProposal(content, context) {
        return api.request('/ai/proposal/analyze', {
            method: 'POST',
            body: { content, context },
        });
    },

    /**
     * Generate email templates based on donor context
     * @param {Object} donorContext - Donor info for personalization
     * @returns {Promise<{templates: Array}>}
     */
    async generateTemplates(donorContext) {
        return api.request('/ai/templates/generate', {
            method: 'POST',
            body: donorContext,
        });
    },
};

// ============================================================================
// CAMPAIGN API
// Manages fundraising campaigns
// Real Implementation: Supabase database operations
// ============================================================================

export const campaignAPI = {
    /**
     * Create a new campaign
     * @param {Object} campaign - Campaign data
     * @returns {Promise<Object>} - Created campaign
     */
    async create(campaign) {
        return api.request('/campaigns', {
            method: 'POST',
            body: campaign,
        });
    },

    /**
     * Get all campaigns for organization
     * @returns {Promise<{campaigns: Array}>}
     */
    async list() {
        return api.request('/campaigns');
    },

    /**
     * Get campaign by ID with donors
     * @param {string} campaignId - Campaign UUID
     * @returns {Promise<Object>}
     */
    async get(campaignId) {
        return api.request(`/campaigns/${campaignId}`);
    },

    /**
     * Update campaign
     * @param {string} campaignId - Campaign UUID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>}
     */
    async update(campaignId, updates) {
        return api.request(`/campaigns/${campaignId}`, {
            method: 'PATCH',
            body: updates,
        });
    },

    /**
     * Add donor to campaign pipeline
     * @param {string} campaignId - Campaign UUID
     * @param {string} donorId - Donor UUID
     * @param {number} alignmentScore - Optional alignment score
     * @returns {Promise<Object>} - Campaign donor record
     */
    async addDonor(campaignId, donorId, alignmentScore = null) {
        return api.request(`/campaigns/${campaignId}/donors`, {
            method: 'POST',
            body: { donorId, alignmentScore },
        });
    },

    /**
     * Move donor to pipeline stage
     * @param {string} campaignId - Campaign UUID
     * @param {string} donorId - Donor UUID
     * @param {string} stage - New pipeline stage
     * @returns {Promise<Object>}
     */
    async moveDonorStage(campaignId, donorId, stage) {
        return api.request(`/campaigns/${campaignId}/donors/${donorId}/stage`, {
            method: 'PATCH',
            body: { stage },
        });
    },

    /**
     * Reject donor from campaign
     * @param {string} campaignId - Campaign UUID
     * @param {string} donorId - Donor UUID
     * @param {string} reason - Optional rejection reason
     * @returns {Promise<void>}
     */
    async rejectDonor(campaignId, donorId, reason = null) {
        return api.request(`/campaigns/${campaignId}/donors/${donorId}/reject`, {
            method: 'POST',
            body: { reason },
        });
    },

    /**
     * Get pipeline summary for campaign
     * @param {string} campaignId - Campaign UUID
     * @returns {Promise<{stages: Array, total: number, totalValue: number}>}
     */
    async getPipelineSummary(campaignId) {
        return api.request(`/campaigns/${campaignId}/pipeline/summary`);
    },
};

// ============================================================================
// ACTIVITY API
// Logs and retrieves activities (calls, emails, meetings)
// Real Implementation: Supabase database operations
// ============================================================================

export const activityAPI = {
    /**
     * Log a new activity
     * @param {Object} activity - Activity data
     * @returns {Promise<Object>} - Created activity
     */
    async log(activity) {
        return api.request('/activities', {
            method: 'POST',
            body: activity,
        });
    },

    /**
     * Get activities for a campaign donor
     * @param {string} campaignDonorId - Campaign donor UUID
     * @returns {Promise<{activities: Array}>}
     */
    async getForCampaignDonor(campaignDonorId) {
        return api.request(`/activities?campaignDonorId=${campaignDonorId}`);
    },

    /**
     * Get activities for a contact
     * @param {string} contactId - Contact UUID
     * @returns {Promise<{activities: Array}>}
     */
    async getForContact(contactId) {
        return api.request(`/activities?contactId=${contactId}`);
    },
};

// ============================================================================
// Export default API object
// ============================================================================

export default {
    donors: donorResearchAPI,
    network: networkAPI,
    ai: aiContentAPI,
    campaigns: campaignAPI,
    activities: activityAPI,
};
