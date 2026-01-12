// Mock Data Service for Power Fundraiser
// Contains seed foundations and contacts that are shared across all campaigns

// Generate a proper UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const MOCK_FOUNDATIONS = [
    {
        id: 'f1',
        name: 'The Bill & Melinda Gates Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '56-2618866',
        city: 'Seattle',
        state: 'WA',
        website: 'https://www.gatesfoundation.org',
        total_assets: 50700000000,
        total_giving: 5800000000,
        funding_range: '$500K+',
        focus_areas: 'Global Health, Education, Poverty Alleviation, Technology',
        description: 'The largest private foundation in the world, focused on enhancing healthcare and reducing extreme poverty globally, and expanding educational opportunities.',
        alignment_score: 94,
        principal_officer: 'Mark Suzman',
        officers: [
            { name: 'Mark Suzman', title: 'CEO' },
            { name: 'Melinda French Gates', title: 'Co-Chair' },
            { name: 'Bill Gates', title: 'Co-Chair' },
        ],
        ai_insights: {
            summary: 'Exceptional alignment with education and technology initiatives. Strong history of multi-year commitments to proven programs.',
            keyOpportunities: ['Global health partnerships', 'K-12 education reform', 'Digital equity programs'],
            approachStrategy: 'Submit LOI through online portal. Emphasize data-driven outcomes and scalability potential.',
        },
    },
    {
        id: 'f2',
        name: 'Ford Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '13-1684331',
        city: 'New York',
        state: 'NY',
        website: 'https://www.fordfoundation.org',
        total_assets: 16000000000,
        total_giving: 600000000,
        funding_range: '$100K - $500K',
        focus_areas: 'Social Justice, Democracy, Economic Fairness, Arts & Culture',
        description: 'One of the largest philanthropic institutions in the United States, dedicated to reducing poverty and injustice.',
        alignment_score: 88,
        principal_officer: 'Darren Walker',
        officers: [
            { name: 'Darren Walker', title: 'President' },
            { name: 'Hilary Pennington', title: 'EVP Programs' },
            { name: 'Eric Ward', title: 'VP Civic Engagement' },
        ],
        ai_insights: {
            summary: 'Strong match for social justice and community development work. Known for supporting systemic change initiatives.',
            keyOpportunities: ['Racial equity grants', 'Democracy strengthening', 'Creative placemaking'],
            approachStrategy: 'Relationship-driven. Seek introduction through program officers. Emphasize equity lens.',
        },
    },
    {
        id: 'f3',
        name: 'The Rockefeller Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '13-1659629',
        city: 'New York',
        state: 'NY',
        website: 'https://www.rockefellerfoundation.org',
        total_assets: 6000000000,
        total_giving: 200000000,
        funding_range: '$100K - $500K',
        focus_areas: 'Climate, Food Security, Health Equity, Economic Opportunity',
        description: 'Promotes the well-being of humanity throughout the world through science, data, and innovation.',
        alignment_score: 82,
        principal_officer: 'Rajiv Shah',
        officers: [
            { name: 'Rajiv Shah', title: 'President' },
            { name: 'Zia Khan', title: 'SVP Innovation' },
            { name: 'Deepali Khanna', title: 'VP Asia Regional' },
        ],
        ai_insights: {
            summary: 'Focus on data-driven solutions and innovation. Good fit for scalable, technology-enabled programs.',
            keyOpportunities: ['Power Africa initiative', 'Food systems transformation', 'Pandemic preparedness'],
            approachStrategy: 'Lead with innovation and scale potential. Strong emphasis on measurable outcomes.',
        },
    },
    {
        id: 'f4',
        name: 'Walton Family Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '13-6025857',
        city: 'Bentonville',
        state: 'AR',
        website: 'https://www.waltonfamilyfoundation.org',
        total_assets: 8500000000,
        total_giving: 750000000,
        funding_range: '$250K+',
        focus_areas: 'K-12 Education Reform, Environment, Regional Development',
        description: 'Family foundation focused on improving K-12 education, protecting rivers and oceans, and supporting the home region.',
        alignment_score: 79,
        principal_officer: 'Kyle Peterson',
        officers: [
            { name: 'Kyle Peterson', title: 'Executive Director' },
            { name: 'Caryl Stern', title: 'Senior Advisor' },
            { name: 'Marc Smiley', title: 'Dir. Education' },
        ],
        ai_insights: {
            summary: 'Strong education focus, particularly charter schools and school choice. Environmental work focuses on freshwater.',
            keyOpportunities: ['Charter school support', 'Teacher quality initiatives', 'Mississippi River restoration'],
            approachStrategy: 'Direct approach through program officers. Must align with school choice philosophy.',
        },
    },
    {
        id: 'f5',
        name: 'The Kresge Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '38-1359217',
        city: 'Troy',
        state: 'MI',
        website: 'https://kresge.org',
        total_assets: 4200000000,
        total_giving: 180000000,
        funding_range: '$100K - $250K',
        focus_areas: 'Arts & Culture, Education, Environment, Health, Human Services',
        description: 'Expands opportunity for low-income people in American cities through grantmaking and social investing.',
        alignment_score: 85,
        principal_officer: 'Rip Rapson',
        officers: [
            { name: 'Rip Rapson', title: 'President & CEO' },
            { name: 'Wendy Lewis Jackson', title: 'MD Detroit Program' },
            { name: 'Shaun Donovan', title: 'Senior Fellow' },
        ],
        ai_insights: {
            summary: 'Urban-focused with emphasis on Detroit. Strong capacity building and capital grants.',
            keyOpportunities: ['Climate resilience', 'Arts integration', 'Early childhood education'],
            approachStrategy: 'Emphasize urban impact and community voice. Multi-year funding available.',
        },
    },
    {
        id: 'f6',
        name: 'Robert Wood Johnson Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '22-2540900',
        city: 'Princeton',
        state: 'NJ',
        website: 'https://www.rwjf.org',
        total_assets: 13500000000,
        total_giving: 500000000,
        funding_range: '$100K - $500K',
        focus_areas: 'Health Equity, Healthcare Systems, Community Health',
        description: 'The nation\'s largest philanthropy dedicated solely to health, working to build a Culture of Health.',
        alignment_score: 91,
        principal_officer: 'Richard Besser',
        officers: [
            { name: 'Richard Besser', title: 'President & CEO' },
            { name: 'Julie Morita', title: 'EVP' },
            { name: 'Brian Quinn', title: 'CFO' },
        ],
        ai_insights: {
            summary: 'Laser-focused on health equity. Excellent fit for programs addressing social determinants of health.',
            keyOpportunities: ['Health equity action', 'Community health workers', 'Policy advocacy'],
            approachStrategy: 'Apply through open calls or seek program officer introduction. Data-heavy proposals preferred.',
        },
    },
    {
        id: 'f7',
        name: 'MacArthur Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '23-7093598',
        city: 'Chicago',
        state: 'IL',
        website: 'https://www.macfound.org',
        total_assets: 7800000000,
        total_giving: 280000000,
        funding_range: '$100K - $500K',
        focus_areas: 'Criminal Justice, Climate Solutions, Nuclear Security, Journalism',
        description: 'Supports creative people, effective institutions, and influential networks building a more just, verdant, and peaceful world.',
        alignment_score: 76,
        principal_officer: 'John Palfrey',
        officers: [
            { name: 'John Palfrey', title: 'President' },
            { name: 'Kathy Im', title: 'Dir. Journalism' },
            { name: 'Marlene Trestman', title: 'General Counsel' },
        ],
        ai_insights: {
            summary: 'Known for big bets and 100&Change competition. Strong justice reform portfolio.',
            keyOpportunities: ['Safety and justice challenge', 'Climate solutions', 'Press freedom'],
            approachStrategy: 'Participate in open competitions. Invite-only for direct grants.',
        },
    },
    {
        id: 'f8',
        name: 'The Duke Endowment',
        category: 'Foundation',
        tier: 'REGIONAL',
        ein: '56-0529965',
        city: 'Charlotte',
        state: 'NC',
        website: 'https://www.dukeendowment.org',
        total_assets: 4000000000,
        total_giving: 160000000,
        funding_range: '$50K - $250K',
        focus_areas: 'Child Care, Health Care, Higher Education, Rural Church',
        description: 'Focuses on the Carolinas to improve the lives of children, promote health, support higher education, and strengthen rural churches.',
        alignment_score: 72,
        principal_officer: 'Minor Shaw',
        officers: [
            { name: 'Minor Shaw', title: 'Chair' },
            { name: 'Rhett Mabry', title: 'President' },
            { name: 'Eugene Cochrane', title: 'Exec Director' },
        ],
        ai_insights: {
            summary: 'Regional focus on Carolinas only. Strong child welfare and rural health portfolio.',
            keyOpportunities: ['Child abuse prevention', 'Rural health clinics', 'Duke University programs'],
            approachStrategy: 'Must be NC/SC based. Relationship-driven with long cultivation period.',
        },
    },
    {
        id: 'f9',
        name: 'Surdna Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '13-6117990',
        city: 'New York',
        state: 'NY',
        website: 'https://surdna.org',
        total_assets: 1000000000,
        total_giving: 45000000,
        funding_range: '$50K - $150K',
        focus_areas: 'Sustainable Environments, Strong Local Economies, Thriving Cultures',
        description: 'Works toward a society that is just, sustainable, and equitable through grantmaking and other forms of support.',
        alignment_score: 84,
        principal_officer: 'Don Chen',
        officers: [
            { name: 'Don Chen', title: 'President' },
            { name: 'Kim Burnett', title: 'VP Programs' },
            { name: 'Brinda Ganguly', title: 'Dir. Strategy' },
        ],
        ai_insights: {
            summary: 'Progressive foundation with environmental justice focus. Supports movement building.',
            keyOpportunities: ['Just transition work', 'Community wealth building', 'Arts for social change'],
            approachStrategy: 'LOI process. Emphasize community leadership and systems change.',
        },
    },
    {
        id: 'f10',
        name: 'The California Endowment',
        category: 'Foundation',
        tier: 'REGIONAL',
        ein: '95-4523232',
        city: 'Los Angeles',
        state: 'CA',
        website: 'https://www.calendow.org',
        total_assets: 4100000000,
        total_giving: 175000000,
        funding_range: '$100K - $500K',
        focus_areas: 'Health Equity, Youth Development, Community Health, Policy Advocacy',
        description: 'Private health foundation focused on improving the health of Californians, particularly underserved communities.',
        alignment_score: 89,
        principal_officer: 'Robert Ross',
        officers: [
            { name: 'Robert Ross', title: 'President & CEO' },
            { name: 'Daniel Zingale', title: 'SVP' },
            { name: 'Anthony Iton', title: 'SVP Healthy Communities' },
        ],
        ai_insights: {
            summary: 'California-only. Building Healthy Communities initiative is flagship. Strong youth focus.',
            keyOpportunities: ['Health4All campaign', 'Youth leadership', 'Community organizing'],
            approachStrategy: 'Must work in California. Engage regional program managers.',
        },
    },
    {
        id: 'f11',
        name: 'Weingart Foundation',
        category: 'Foundation',
        tier: 'REGIONAL',
        ein: '95-6054814',
        city: 'Los Angeles',
        state: 'CA',
        website: 'https://www.weingartfnd.org',
        total_assets: 800000000,
        total_giving: 35000000,
        funding_range: '$25K - $100K',
        focus_areas: 'Human Services, Health, Education, Homelessness',
        description: 'Supports organizations that strengthen communities throughout Southern California.',
        alignment_score: 81,
        principal_officer: 'Miguel Santana',
        officers: [
            { name: 'Miguel Santana', title: 'President & CEO' },
            { name: 'Belen Vargas', title: 'VP Programs' },
            { name: 'Fred Ali', title: 'Board Chair' },
        ],
        ai_insights: {
            summary: 'Southern California focus. Strong capacity building and general operating support.',
            keyOpportunities: ['Homelessness prevention', 'Nonprofit capacity building', 'Core operating grants'],
            approachStrategy: 'Open application process. General operating support available.',
        },
    },
    {
        id: 'f12',
        name: 'The JPB Foundation',
        category: 'Foundation',
        tier: 'NATIONAL',
        ein: '27-6991852',
        city: 'New York',
        state: 'NY',
        website: 'https://www.jpbfoundation.org',
        total_assets: 4600000000,
        total_giving: 250000000,
        funding_range: '$100K - $500K',
        focus_areas: 'Poverty, Environment, Medical Research',
        description: 'Focuses on breaking the cycle of poverty through transformative initiatives in the areas of housing, economic security, and health.',
        alignment_score: 86,
        principal_officer: 'Barbara Picower',
        officers: [
            { name: 'Barbara Picower', title: 'President' },
            { name: 'Deepak Bhargava', title: 'VP' },
            { name: 'Eric Heins', title: 'Dir. Environment' },
        ],
        ai_insights: {
            summary: 'Large grants available. Focus on systemic poverty solutions. Invite-only.',
            keyOpportunities: ['Housing justice', 'Workers rights', 'Environmental justice'],
            approachStrategy: 'Invite-only. Seek introduction through existing grantees.',
        },
    },
];

export const MOCK_CONTACTS = [
    // Gates Foundation
    { id: 'c1', foundationId: 'f1', name: 'Sarah Chen', title: 'Program Officer - Education', role: 'Decision Maker', email: 'schen@gatesfoundation.org', connectionDegree: '2nd', connectedThrough: 'David Kim (Board Member)' },
    { id: 'c2', foundationId: 'f1', name: 'Michael Torres', title: 'Senior Grants Manager', role: 'Gatekeeper', email: 'mtorres@gatesfoundation.org', connectionDegree: '3rd', connectedThrough: null },
    { id: 'c3', foundationId: 'f1', name: 'Jennifer Walsh', title: 'Deputy Director - US Programs', role: 'Influencer', email: 'jwalsh@gatesfoundation.org', connectionDegree: '3rd', connectedThrough: null },
    
    // Ford Foundation
    { id: 'c4', foundationId: 'f2', name: 'Marcus Johnson', title: 'Program Director - Civic Engagement', role: 'Champion', email: 'mjohnson@fordfoundation.org', connectionDegree: '1st', connectedThrough: null },
    { id: 'c5', foundationId: 'f2', name: 'Aisha Patel', title: 'Grants Associate', role: 'Gatekeeper', email: 'apatel@fordfoundation.org', connectionDegree: '2nd', connectedThrough: 'Marcus Johnson' },
    { id: 'c6', foundationId: 'f2', name: 'Robert Liu', title: 'Senior Fellow', role: 'Influencer', email: 'rliu@fordfoundation.org', connectionDegree: '3rd', connectedThrough: null },
    
    // Rockefeller Foundation
    { id: 'c7', foundationId: 'f3', name: 'Elena Rodriguez', title: 'Director of Grants', role: 'Decision Maker', email: 'erodriguez@rockfound.org', connectionDegree: '2nd', connectedThrough: 'Conference Contact' },
    { id: 'c8', foundationId: 'f3', name: 'James Wilson', title: 'Program Associate', role: 'Gatekeeper', email: 'jwilson@rockfound.org', connectionDegree: '3rd', connectedThrough: null },
    
    // Walton Family Foundation
    { id: 'c9', foundationId: 'f4', name: 'Karen Mitchell', title: 'Education Program Officer', role: 'Champion', email: 'kmitchell@waltonfamily.org', connectionDegree: '1st', connectedThrough: null },
    { id: 'c10', foundationId: 'f4', name: 'Thomas Green', title: 'Regional Director', role: 'Decision Maker', email: 'tgreen@waltonfamily.org', connectionDegree: '2nd', connectedThrough: 'Karen Mitchell' },
    
    // Kresge Foundation
    { id: 'c11', foundationId: 'f5', name: 'Diana Foster', title: 'Arts Program Director', role: 'Decision Maker', email: 'dfoster@kresge.org', connectionDegree: '2nd', connectedThrough: 'Arts Council Connection' },
    { id: 'c12', foundationId: 'f5', name: 'Chris Anderson', title: 'Senior Program Officer', role: 'Influencer', email: 'canderson@kresge.org', connectionDegree: '3rd', connectedThrough: null },
    
    // RWJF
    { id: 'c13', foundationId: 'f6', name: 'Dr. Maya Singh', title: 'Health Equity Director', role: 'Champion', email: 'msingh@rwjf.org', connectionDegree: '1st', connectedThrough: null },
    { id: 'c14', foundationId: 'f6', name: 'Patricia Hernandez', title: 'Grants Manager', role: 'Gatekeeper', email: 'phernandez@rwjf.org', connectionDegree: '2nd', connectedThrough: 'Dr. Maya Singh' },
    { id: 'c15', foundationId: 'f6', name: 'Andrew Kim', title: 'Research Associate', role: 'Influencer', email: 'akim@rwjf.org', connectionDegree: '3rd', connectedThrough: null },
    
    // MacArthur Foundation
    { id: 'c16', foundationId: 'f7', name: 'Lisa Thompson', title: 'Justice Program Director', role: 'Decision Maker', email: 'lthompson@macfound.org', connectionDegree: '3rd', connectedThrough: null },
    { id: 'c17', foundationId: 'f7', name: 'David Park', title: 'Program Officer', role: 'Influencer', email: 'dpark@macfound.org', connectionDegree: '3rd', connectedThrough: null },
    
    // Duke Endowment
    { id: 'c18', foundationId: 'f8', name: 'Rebecca Taylor', title: 'Child Care Program Director', role: 'Decision Maker', email: 'rtaylor@dukeendowment.org', connectionDegree: '2nd', connectedThrough: 'University Connection' },
    { id: 'c19', foundationId: 'f8', name: 'William Brown', title: 'Grants Coordinator', role: 'Gatekeeper', email: 'wbrown@dukeendowment.org', connectionDegree: '3rd', connectedThrough: null },
    
    // Surdna Foundation
    { id: 'c20', foundationId: 'f9', name: 'Jasmine Lee', title: 'Environment Program Officer', role: 'Champion', email: 'jlee@surdna.org', connectionDegree: '1st', connectedThrough: null },
    { id: 'c21', foundationId: 'f9', name: 'Carlos Mendez', title: 'Grants Associate', role: 'Gatekeeper', email: 'cmendez@surdna.org', connectionDegree: '2nd', connectedThrough: 'Jasmine Lee' },
    
    // California Endowment
    { id: 'c22', foundationId: 'f10', name: 'Nicole Washington', title: 'Regional Manager - LA', role: 'Decision Maker', email: 'nwashington@calendow.org', connectionDegree: '1st', connectedThrough: null },
    { id: 'c23', foundationId: 'f10', name: 'Kevin Tran', title: 'Youth Programs Officer', role: 'Influencer', email: 'ktran@calendow.org', connectionDegree: '2nd', connectedThrough: 'Nicole Washington' },
    
    // Weingart Foundation
    { id: 'c24', foundationId: 'f11', name: 'Amanda Foster', title: 'Grants Officer', role: 'Gatekeeper', email: 'afoster@weingartfnd.org', connectionDegree: '2nd', connectedThrough: 'Nonprofit Network' },
    { id: 'c25', foundationId: 'f11', name: 'Richard Chen', title: 'Program Director', role: 'Decision Maker', email: 'rchen@weingartfnd.org', connectionDegree: '3rd', connectedThrough: null },
    
    // JPB Foundation
    { id: 'c26', foundationId: 'f12', name: 'Stephanie Adams', title: 'Senior Program Officer', role: 'Decision Maker', email: 'sadams@jpbfoundation.org', connectionDegree: '3rd', connectedThrough: null },
    { id: 'c27', foundationId: 'f12', name: 'Michael Rivera', title: 'Poverty Programs Lead', role: 'Influencer', email: 'mrivera@jpbfoundation.org', connectionDegree: '3rd', connectedThrough: null },
];

// Helper functions
export function getFoundationById(id) {
    return MOCK_FOUNDATIONS.find(f => f.id === id);
}

export function getContactsForFoundation(foundationId) {
    return MOCK_CONTACTS.filter(c => c.foundationId === foundationId);
}

export function getContactById(id) {
    return MOCK_CONTACTS.find(c => c.id === id);
}

export function searchFoundations(query, filters = {}) {
    let results = [...MOCK_FOUNDATIONS];
    
    // Text search
    if (query) {
        const lowerQuery = query.toLowerCase();
        results = results.filter(f => 
            f.name.toLowerCase().includes(lowerQuery) ||
            f.focus_areas.toLowerCase().includes(lowerQuery) ||
            f.description.toLowerCase().includes(lowerQuery) ||
            f.city.toLowerCase().includes(lowerQuery) ||
            f.state.toLowerCase().includes(lowerQuery)
        );
    }
    
    // Region filter
    if (filters.region && filters.region !== 'All Regions') {
        results = results.filter(f => {
            if (filters.region.includes('National')) return f.tier === 'NATIONAL';
            if (filters.region.includes(f.state)) return true;
            return false;
        });
    }
    
    // Tier filter
    if (filters.tier) {
        results = results.filter(f => f.tier === filters.tier);
    }
    
    // Sort by alignment score
    results.sort((a, b) => b.alignment_score - a.alignment_score);
    
    return results;
}

// Campaign data management
export function getCampaigns() {
    const stored = localStorage.getItem('campaigns');
    return stored ? JSON.parse(stored) : [];
}

export function saveCampaign(campaign) {
    const campaigns = getCampaigns();
    const existing = campaigns.findIndex(c => c.id === campaign.id);
    if (existing >= 0) {
        campaigns[existing] = campaign;
    } else {
        campaigns.push(campaign);
    }
    localStorage.setItem('campaigns', JSON.stringify(campaigns));
    return campaign;
}

export function createCampaign(name, config = {}) {
    // Check if a campaign with this name already exists to prevent duplicates
    const existing = getCampaigns();
    const existingCampaign = existing.find(c => c.name === name);
    if (existingCampaign) {
        console.log('📋 [mockData] Campaign with name already exists, returning existing:', name);
        return existingCampaign;
    }
    
    // Generate proper UUID for Supabase compatibility
    const campaignId = generateUUID();
    console.log('📋 [mockData] Creating NEW campaign:', name, '| UUID:', campaignId);
    
    const campaign = {
        id: campaignId,
        name,
        createdAt: new Date().toISOString(),
        status: 'active',
        searchConfig: config, // Store as searchConfig for consistency
        config,
        donors: [], // Array of { foundationId, stage, addedAt, ... }
    };
    return saveCampaign(campaign);
}

export function getCampaignById(id) {
    return getCampaigns().find(c => c.id === id);
}

// Cache AI-generated donors with campaign to avoid regenerating
export function cacheDonorsForCampaign(campaignId, donors) {
    const campaigns = getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return null;
    
    campaign.cachedDonors = donors;
    campaign.cachedAt = new Date().toISOString();
    console.log('💾 [mockData] Cached', donors.length, 'donors for campaign:', campaign.name);
    
    saveCampaign(campaign);
    return campaign;
}

// Get cached donors for a campaign (returns null if not cached)
export function getCachedDonors(campaignId) {
    const campaign = getCampaignById(campaignId);
    if (!campaign || !campaign.cachedDonors) return null;
    
    console.log('📦 [mockData] Loaded', campaign.cachedDonors.length, 'cached donors for:', campaign.name);
    return campaign.cachedDonors;
}

export function addDonorToCampaign(campaignId, foundationId, stage = 'research') {
    const campaigns = getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return null;
    
    // Check if already exists
    const existing = campaign.donors.find(d => d.foundationId === foundationId);
    if (existing) {
        existing.stage = stage;
        existing.updatedAt = new Date().toISOString();
    } else {
        campaign.donors.push({
            foundationId,
            stage,
            addedAt: new Date().toISOString(),
            alignmentScore: getFoundationById(foundationId)?.alignment_score || 0,
            healthScore: 50,
            isRejected: false,
        });
    }
    
    saveCampaign(campaign);
    return campaign;
}

export function removeDonorFromCampaign(campaignId, foundationId) {
    const campaigns = getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return null;
    
    campaign.donors = campaign.donors.filter(d => d.foundationId !== foundationId);
    saveCampaign(campaign);
    return campaign;
}

export function rejectDonorInCampaign(campaignId, foundationId) {
    const campaigns = getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return null;
    
    const donor = campaign.donors.find(d => d.foundationId === foundationId);
    if (donor) {
        donor.isRejected = !donor.isRejected;
        donor.stage = donor.isRejected ? 'rejected' : 'research';
    }
    
    saveCampaign(campaign);
    return campaign;
}

export function moveDonorToStage(campaignId, foundationId, newStage) {
    const campaigns = getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return null;
    
    const donor = campaign.donors.find(d => d.foundationId === foundationId);
    if (donor) {
        donor.stage = newStage;
        donor.updatedAt = new Date().toISOString();
        if (newStage === 'qualified' && !donor.qualifiedAt) {
            donor.qualifiedAt = new Date().toISOString();
        }
        if (newStage === 'funded' && !donor.fundedAt) {
            donor.fundedAt = new Date().toISOString();
        }
    }
    
    saveCampaign(campaign);
    return campaign;
}

export function getCampaignDonorsWithDetails(campaignId) {
    const campaign = getCampaignById(campaignId);
    if (!campaign) return [];
    
    return campaign.donors.map(d => ({
        ...d,
        foundation: getFoundationById(d.foundationId),
        contacts: getContactsForFoundation(d.foundationId),
    }));
}

// Get active campaign (most recently used)
export function getActiveCampaign() {
    const activeId = localStorage.getItem('activeCampaignId');
    if (activeId) {
        const campaign = getCampaignById(activeId);
        if (campaign) return campaign;
    }
    const campaigns = getCampaigns();
    return campaigns.length > 0 ? campaigns[campaigns.length - 1] : null;
}

export function setActiveCampaign(campaignId) {
    localStorage.setItem('activeCampaignId', campaignId);
}

// Pipeline stages
export const PIPELINE_STAGES = [
    { id: 'research', name: 'Research', color: '#94a3b8' },
    { id: 'qualified', name: 'Qualified', color: '#3B82F6' },
    { id: 'cultivating', name: 'Cultivating', color: '#8B5CF6' },
    { id: 'negotiations', name: 'Negotiations', color: '#C9A227' },
    { id: 'funded', name: 'Funded', color: '#22C55E' },
    { id: 'stewardship', name: 'Stewardship', color: '#059669' },
];

export function getNextStage(currentStage) {
    const index = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
    if (index >= 0 && index < PIPELINE_STAGES.length - 1) {
        return PIPELINE_STAGES[index + 1].id;
    }
    return null;
}
