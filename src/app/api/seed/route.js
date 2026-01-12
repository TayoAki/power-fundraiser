/**
 * Database Seed API
 * POST /api/seed
 * 
 * Seeds the database with initial foundation data.
 * This creates the donors table if needed and inserts sample data.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const SEED_DONORS = [
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
];

export async function POST(request) {
    try {
        // Check if donors table has data
        const { data: existing, error: checkError } = await supabase
            .from('donors')
            .select('id')
            .limit(1);

        if (checkError) {
            // Table might not exist - return info about how to create it
            return NextResponse.json({
                success: false,
                error: 'Donors table does not exist',
                hint: 'Run Supabase migrations or create the table manually',
                sqlHint: `
CREATE TABLE IF NOT EXISTS donors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    tier TEXT,
    ein TEXT,
    city TEXT,
    state TEXT,
    website TEXT,
    total_assets BIGINT,
    total_giving BIGINT,
    funding_range_min INTEGER,
    funding_range_max INTEGER,
    focus_areas TEXT,
    description TEXT,
    principal_officer TEXT,
    alignment_score INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
                `.trim(),
            }, { status: 400 });
        }

        if (existing && existing.length > 0) {
            return NextResponse.json({
                success: false,
                message: 'Donors table already has data. Clear it first to re-seed.',
            });
        }

        // Insert donors
        const { data, error } = await supabase
            .from('donors')
            .insert(SEED_DONORS)
            .select();

        if (error) {
            return NextResponse.json({
                success: false,
                error: error.message,
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Seeded ${data.length} donors`,
            donors: data.map(d => ({ id: d.id, name: d.name })),
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
