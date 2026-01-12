/**
 * Seed Donors Script
 * Run with: node scripts/seed-donors.js
 * 
 * Seeds the Supabase donors table with foundation data.
 */

const SUPABASE_URL = 'https://uxfhuscgaagwbspgfvci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4Zmh1c2NnYWFnd2JzcGdmdmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxODI4NTcsImV4cCI6MjA4Mzc1ODg1N30.E8-6tfoKQriXf7EMJE1xUpSk3X5ac_3_7GUMP_IvQJ4';

const donors = [
    {
        name: 'The Bill & Melinda Gates Foundation',
        category: 'foundation',
        tier: 'mega',
        ein: '56-2618866',
        city: 'Seattle',
        state: 'WA',
        website: 'https://www.gatesfoundation.org',
        total_assets: 50700000000,
        total_giving: 5800000000,
        funding_range_min: 500000,
        funding_range_max: 50000000,
        focus_areas: 'Global Health, Education, Poverty Alleviation, Technology',
        description: 'The largest private foundation in the world, focused on enhancing healthcare and reducing extreme poverty globally.',
        principal_officer: 'Mark Suzman',
        alignment_score: 92,
    },
    {
        name: 'Ford Foundation',
        category: 'foundation',
        tier: 'major',
        ein: '13-1684331',
        city: 'New York',
        state: 'NY',
        website: 'https://www.fordfoundation.org',
        total_assets: 16000000000,
        total_giving: 600000000,
        funding_range_min: 100000,
        funding_range_max: 500000,
        focus_areas: 'Social Justice, Democracy, Economic Fairness, Arts & Culture',
        description: 'One of the largest philanthropic institutions dedicated to reducing poverty and injustice.',
        principal_officer: 'Darren Walker',
        alignment_score: 88,
    },
    {
        name: 'The Rockefeller Foundation',
        category: 'foundation',
        tier: 'major',
        ein: '13-1659629',
        city: 'New York',
        state: 'NY',
        website: 'https://www.rockefellerfoundation.org',
        total_assets: 5200000000,
        total_giving: 200000000,
        funding_range_min: 50000,
        funding_range_max: 500000,
        focus_areas: 'Health, Food Security, Economic Opportunity, Climate',
        description: 'Promotes the well-being of humanity through innovative solutions to global challenges.',
        principal_officer: 'Rajiv Shah',
        alignment_score: 85,
    },
    {
        name: 'W.K. Kellogg Foundation',
        category: 'foundation',
        tier: 'major',
        ein: '38-1359264',
        city: 'Battle Creek',
        state: 'MI',
        website: 'https://www.wkkf.org',
        total_assets: 8500000000,
        total_giving: 400000000,
        funding_range_min: 25000,
        funding_range_max: 250000,
        focus_areas: 'Children & Families, Education, Community Development, Racial Equity',
        description: 'Supports children, families, and communities to strengthen and create conditions for thriving.',
        principal_officer: 'La June Montgomery Tabron',
        alignment_score: 90,
    },
    {
        name: 'The William and Flora Hewlett Foundation',
        category: 'foundation',
        tier: 'major',
        ein: '94-1655673',
        city: 'Menlo Park',
        state: 'CA',
        website: 'https://hewlett.org',
        total_assets: 12500000000,
        total_giving: 500000000,
        funding_range_min: 100000,
        funding_range_max: 1000000,
        focus_areas: 'Education, Environment, Global Development, Performing Arts',
        description: 'Advances ideas and supports institutions to promote a better world.',
        principal_officer: 'Larry Kramer',
        alignment_score: 87,
    },
    {
        name: 'The Andrew W. Mellon Foundation',
        category: 'foundation',
        tier: 'major',
        ein: '13-1879954',
        city: 'New York',
        state: 'NY',
        website: 'https://mellon.org',
        total_assets: 7800000000,
        total_giving: 300000000,
        funding_range_min: 50000,
        funding_range_max: 500000,
        focus_areas: 'Higher Education, Arts & Culture, Humanities, Scholarly Communications',
        description: 'Supports higher education, arts and cultural heritage, and scholarly communications.',
        principal_officer: 'Elizabeth Alexander',
        alignment_score: 82,
    },
    {
        name: 'The Kresge Foundation',
        category: 'foundation',
        tier: 'major',
        ein: '38-1359217',
        city: 'Troy',
        state: 'MI',
        website: 'https://kresge.org',
        total_assets: 4200000000,
        total_giving: 180000000,
        funding_range_min: 25000,
        funding_range_max: 500000,
        focus_areas: 'Arts & Culture, Education, Environment, Health, Human Services',
        description: 'Works to expand opportunities in American cities through grantmaking and investing.',
        principal_officer: 'Rip Rapson',
        alignment_score: 86,
    },
    {
        name: 'Robert Wood Johnson Foundation',
        category: 'foundation',
        tier: 'major',
        ein: '22-2540900',
        city: 'Princeton',
        state: 'NJ',
        website: 'https://www.rwjf.org',
        total_assets: 13500000000,
        total_giving: 550000000,
        funding_range_min: 50000,
        funding_range_max: 2000000,
        focus_areas: 'Health, Healthcare Access, Public Health, Health Equity',
        description: 'The largest philanthropy devoted solely to health and healthcare in the United States.',
        principal_officer: 'Richard Besser',
        alignment_score: 91,
    },
    {
        name: 'The MacArthur Foundation',
        category: 'foundation',
        tier: 'major',
        ein: '23-7093598',
        city: 'Chicago',
        state: 'IL',
        website: 'https://www.macfound.org',
        total_assets: 7200000000,
        total_giving: 280000000,
        funding_range_min: 50000,
        funding_range_max: 1000000,
        focus_areas: 'Criminal Justice, Climate, Nuclear Risk, Journalism',
        description: 'Supports creative people, effective institutions, and influential networks building a just and peaceful world.',
        principal_officer: 'John Palfrey',
        alignment_score: 84,
    },
    {
        name: 'The Simons Foundation',
        category: 'foundation',
        tier: 'major',
        ein: '54-1876977',
        city: 'New York',
        state: 'NY',
        website: 'https://www.simonsfoundation.org',
        total_assets: 4800000000,
        total_giving: 400000000,
        funding_range_min: 100000,
        funding_range_max: 5000000,
        focus_areas: 'Scientific Research, Mathematics, Autism Research, Education',
        description: 'Advances the frontiers of research in mathematics and the basic sciences.',
        principal_officer: 'David Spergel',
        alignment_score: 78,
    },
    {
        name: 'The Duke Endowment',
        category: 'foundation',
        tier: 'regional',
        ein: '56-0529965',
        city: 'Charlotte',
        state: 'NC',
        website: 'https://www.dukeendowment.org',
        total_assets: 4100000000,
        total_giving: 170000000,
        funding_range_min: 25000,
        funding_range_max: 500000,
        focus_areas: 'Child Care, Health Care, Higher Education, Rural Churches',
        description: 'Serves the people of North Carolina and South Carolina through education, healthcare, and community development.',
        principal_officer: 'Minor Shaw',
        alignment_score: 83,
    },
    {
        name: 'The California Endowment',
        category: 'foundation',
        tier: 'regional',
        ein: '95-4523232',
        city: 'Los Angeles',
        state: 'CA',
        website: 'https://www.calendow.org',
        total_assets: 4000000000,
        total_giving: 200000000,
        funding_range_min: 25000,
        funding_range_max: 500000,
        focus_areas: 'Health, Youth Development, Community Health, Health Equity',
        description: 'A private, statewide health foundation dedicated to improving health in California communities.',
        principal_officer: 'Robert K. Ross',
        alignment_score: 89,
    },
    {
        name: 'The Cleveland Foundation',
        category: 'foundation',
        tier: 'regional',
        ein: '34-0714588',
        city: 'Cleveland',
        state: 'OH',
        website: 'https://www.clevelandfoundation.org',
        total_assets: 2800000000,
        total_giving: 120000000,
        funding_range_min: 10000,
        funding_range_max: 250000,
        focus_areas: 'Arts & Culture, Economic Development, Education, Youth Development',
        description: 'America\'s first community foundation, dedicated to enhancing the quality of life in Greater Cleveland.',
        principal_officer: 'Ronn Richard',
        alignment_score: 80,
    },
    {
        name: 'Silicon Valley Community Foundation',
        category: 'foundation',
        tier: 'regional',
        ein: '20-5205488',
        city: 'Mountain View',
        state: 'CA',
        website: 'https://www.siliconvalleycf.org',
        total_assets: 13500000000,
        total_giving: 1500000000,
        funding_range_min: 25000,
        funding_range_max: 1000000,
        focus_areas: 'Education, Immigration, Economic Security, Community Opportunity',
        description: 'Engages donors to strengthen communities through grantmaking and civic leadership.',
        principal_officer: 'Nicole Taylor',
        alignment_score: 86,
    },
    {
        name: 'The Chicago Community Trust',
        category: 'foundation',
        tier: 'regional',
        ein: '36-2167000',
        city: 'Chicago',
        state: 'IL',
        website: 'https://www.cct.org',
        total_assets: 3200000000,
        total_giving: 350000000,
        funding_range_min: 10000,
        funding_range_max: 500000,
        focus_areas: 'Arts & Culture, Basic Needs, Economic Development, Education',
        description: 'A community foundation connecting generous donors with community needs in the Chicago region.',
        principal_officer: 'Helene Gayle',
        alignment_score: 81,
    },
];

async function seedDonors() {
    console.log('Starting donor seeding...\n');
    
    // First, check if table exists and is empty
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/donors?select=id&limit=1`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
    });
    
    if (!checkResponse.ok) {
        console.error('Error checking donors table:', await checkResponse.text());
        console.log('\nMake sure the donors table exists. Run Supabase migrations first.');
        return;
    }
    
    const existingDonors = await checkResponse.json();
    if (existingDonors.length > 0) {
        console.log('Donors table already has data. Skipping seed to avoid duplicates.');
        console.log('To re-seed, clear the donors table first.');
        return;
    }
    
    // Insert donors
    let successCount = 0;
    let errorCount = 0;
    
    for (const donor of donors) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/donors`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify(donor),
        });
        
        if (response.ok) {
            console.log(`✓ Added: ${donor.name}`);
            successCount++;
        } else {
            const error = await response.text();
            console.error(`✗ Failed: ${donor.name} - ${error}`);
            errorCount++;
        }
    }
    
    console.log(`\nSeeding complete!`);
    console.log(`  Success: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
}

seedDonors().catch(console.error);
