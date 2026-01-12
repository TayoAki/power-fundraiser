/**
 * AI-Powered Donor Search API
 * POST /api/ai/donor-search
 * 
 * Generates donor prospects using AI based on organization mission and location
 */

import { NextResponse } from 'next/server';
import { generateJSON } from '@/lib/openrouter';
import { MOCK_FOUNDATIONS } from '@/lib/mockData';

const DONOR_SEARCH_PROMPT = `You are an expert nonprofit fundraising researcher with access to comprehensive foundation databases, IRS 990-PF filings, corporate giving programs, and philanthropic networks. Your task is to identify and score potential funding sources for nonprofits.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON array - no markdown, no explanation, no code blocks
2. Generate exactly the requested number of unique donors
3. Every donor MUST have ALL required fields filled with realistic data
4. Prioritize geographic relevance based on the provided ZIP code

DONOR DISTRIBUTION:
- LOCAL (35%): Community foundations, family foundations, local businesses, municipal grants within 50 miles of ZIP code
- REGIONAL (25%): State-level foundations, regional corporate programs, state government grants
- NATIONAL (30%): Major national foundations, Fortune 500 corporate giving, federal grants
- INTERNATIONAL (10%): Global foundations funding US projects, international NGOs

DONOR TYPES TO INCLUDE:
- Private Foundations (40%)
- Corporate Giving Programs (25%)
- Community Foundations (15%)
- Government Grants (10%)
- Individual Philanthropists / Family Offices (10%)

REQUIRED OUTPUT SCHEMA (each donor must have ALL fields):
{
  "name": "Full legal name of foundation/corporation/donor",
  "category": "Foundation" | "Corporate" | "Individual Donor" | "Government Grant" | "International",
  "alignment_score": 0-100 integer based on mission fit + geographic relevance,
  "funding_range": "$X - $Y" format (e.g., "$25K - $100K"),
  "deadline": "Rolling" | "Quarterly" | "Annual" | specific date like "March 15, 2026",
  "focus_areas": "Comma-separated list of 3-5 specific focus areas",
  "website": "https://actual-website.org",
  "description": "2-3 sentences explaining why this donor aligns with the nonprofit's mission",
  "total_assets": number or null (from 990-PF Part II total assets),
  "annual_giving": number or null (from 990-PF total grants paid),
  "location": "City, State" format,
  
  // 990-PF DATA (for foundations - use null for corporate/government):
  "ein": "XX-XXXXXXX" format or null (Employer Identification Number),
  "fiscal_year_end": "MM/YYYY" or null,
  "principal_officer": "Name, Title" of primary contact (from 990-PF Part VIII),
  "officers": [
    {
      "name": "Full Name",
      "title": "Title (e.g., President, Trustee, Executive Director)",
      "compensated": true/false
    }
  ] // Array of 2-5 key officers/trustees from 990-PF Part VIII
}

SCORING GUIDELINES:
- 90-100: Perfect mission + focus area match, actively funds in target region
- 80-89: Strong alignment, funds similar projects nationally
- 70-79: Good alignment, may require cultivation
- 60-69: Moderate alignment, worth researching
- 50-59: Possible fit, requires strong case

QUALITY REQUIREMENTS:
- Use real foundation/corporation names when possible
- Websites should be plausible URLs (use actual domains for known foundations)
- Funding ranges should be realistic for the donor type
- Local donors should reference actual cities near the ZIP code
- Descriptions must specifically mention how the donor connects to the nonprofit's mission
- For foundations, include accurate 990-PF data: EIN, officers, fiscal year
- Officer names should be realistic (use actual names for well-known foundations)
- Principal officer is the primary contact for grant inquiries

Return ONLY a valid JSON array. No other text.`;

export async function POST(request) {
    console.log('🔍 [API/donor-search] Received search request');
    
    try {
        const body = await request.json();
        const {
            organizationName,
            mission,
            zipCode,
            focusAreas,
            fundingRange,
            donorCount = 50,
        } = body;

        console.log('📋 [API/donor-search] Search params:', { organizationName, zipCode, donorCount });

        if (!mission && !organizationName) {
            return NextResponse.json(
                { success: false, error: 'Organization name or mission is required' },
                { status: 400 }
            );
        }

        // Build the user prompt
        const userPrompt = `Find ${donorCount} potential funding sources for this nonprofit:

ORGANIZATION: ${organizationName || 'Nonprofit Organization'}
MISSION: ${mission || 'Community impact and social good'}
LOCATION (ZIP): ${zipCode || 'National'}
FOCUS AREAS: ${focusAreas || 'General philanthropy'}
PREFERRED FUNDING RANGE: ${fundingRange || 'Any amount'}

Generate exactly ${donorCount} diverse, high-quality donor prospects. Prioritize donors who:
1. Have funded similar missions in the past
2. Are geographically relevant to ZIP code ${zipCode}
3. Match the focus areas: ${focusAreas || 'General philanthropy'}
4. Give in the range: ${fundingRange || 'Any amount'}

Return ONLY a valid JSON array with ${donorCount} donor objects. No other text.`;

        const messages = [
            { role: 'system', content: DONOR_SEARCH_PROMPT },
            { role: 'user', content: userPrompt }
        ];

        console.log('🤖 [API/donor-search] Calling AI with 60s timeout...');
        
        // 60 second timeout - matches Vercel Pro limit
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI request timed out after 60s')), 60000)
        );
        
        const aiPromise = generateJSON(messages, {
            maxTokens: 16000,  // Increased for 100 donors
            temperature: 0.7,
        });
        
        const donors = await Promise.race([aiPromise, timeoutPromise]);

        console.log('✅ [API/donor-search] Generated', donors?.length || 0, 'donors');

        if (!donors || !Array.isArray(donors)) {
            throw new Error('Invalid response format from AI');
        }

        // Normalize and validate donor data (including 990-PF fields)
        const normalizedDonors = donors.map((donor, index) => ({
            id: `ai-${Date.now()}-${index}`,
            name: donor.name || 'Unknown Foundation',
            category: donor.category || 'Foundation',
            alignment_score: Math.min(100, Math.max(0, donor.alignment_score || 50)),
            funding_range: donor.funding_range || '$10K - $50K',
            deadline: donor.deadline || 'Rolling',
            focus_areas: donor.focus_areas || 'General',
            status: 'Research',
            website: donor.website || '',
            description: donor.description || '',
            total_assets: donor.total_assets || null,
            annual_giving: donor.annual_giving || null,
            location: donor.location || '',
            source: 'ai_search',
            // 990-PF data
            ein: donor.ein || null,
            fiscal_year_end: donor.fiscal_year_end || null,
            principal_officer: donor.principal_officer || null,
            officers: donor.officers || [],
        }));
        
        console.log('📊 [API/donor-search] First donor sample:', JSON.stringify(normalizedDonors[0], null, 2));

        return NextResponse.json({
            success: true,
            donors: normalizedDonors,
            count: normalizedDonors.length,
            searchParams: { organizationName, mission, zipCode },
        });

    } catch (error) {
        console.error('❌ [API/donor-search] Error:', error.message);
        
        // Return mock data as fallback when AI fails
        console.log('⚠️ [API/donor-search] Returning mock data as fallback');
        const fallbackDonors = MOCK_FOUNDATIONS.slice(0, 15).map((donor, index) => ({
            ...donor,
            id: `fallback-${Date.now()}-${index}`,
            source: 'mock_fallback',
        }));
        
        return NextResponse.json({
            success: true,
            donors: fallbackDonors,
            count: fallbackDonors.length,
            fallback: true,
            error: error.message,
        });
    }
}
