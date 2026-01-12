/**
 * Network Contacts API
 * GET /api/network/contacts - List all contacts
 * POST /api/network/contacts - Add new contact
 * 
 * Manages user's professional network for warm path mapping.
 * 
 * MOCK: Uses in-memory storage
 * REAL: Will use Supabase for persistence
 */

import { NextResponse } from 'next/server';

// Mock contact storage (will be replaced with Supabase)
let mockContacts = [
    { id: 'c1', name: 'Sarah Chen', title: 'Program Officer', org: 'Gates Foundation', orgId: 'f1', degree: '2nd', connection: 'David Kim (Board Member)', email: 'schen@gatesfoundation.org' },
    { id: 'c2', name: 'Marcus Johnson', title: 'Program Director', org: 'Ford Foundation', orgId: 'f2', degree: '1st', connection: null, email: 'mjohnson@fordfoundation.org' },
    { id: 'c3', name: 'Elena Rodriguez', title: 'Director of Grants', org: 'Rockefeller Foundation', orgId: 'f3', degree: '2nd', connection: 'Conference Contact', email: 'erodriguez@rockfound.org' },
    { id: 'c4', name: 'Dr. Maya Singh', title: 'Health Equity Director', org: 'Robert Wood Johnson Foundation', orgId: 'f4', degree: '1st', connection: null, email: 'msingh@rwjf.org' },
];

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const degreeFilter = searchParams.get('degree');
        const orgFilter = searchParams.get('org');

        await new Promise(resolve => setTimeout(resolve, 300));

        let contacts = [...mockContacts];

        if (degreeFilter) {
            contacts = contacts.filter(c => c.degree === degreeFilter);
        }

        if (orgFilter) {
            contacts = contacts.filter(c => c.org.toLowerCase().includes(orgFilter.toLowerCase()));
        }

        // Calculate stats
        const stats = {
            total: contacts.length,
            firstDegree: contacts.filter(c => c.degree === '1st').length,
            secondDegree: contacts.filter(c => c.degree === '2nd').length,
            thirdDegree: contacts.filter(c => c.degree === '3rd').length,
            orgsWithConnections: new Set(contacts.filter(c => c.degree === '1st' || c.degree === '2nd').map(c => c.org)).size,
        };

        return NextResponse.json({
            success: true,
            contacts,
            stats,
        });

    } catch (error) {
        console.error('Get contacts error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, title, org, orgId, degree, connection, email } = body;

        if (!name || !org) {
            return NextResponse.json(
                { success: false, error: 'Name and organization are required' },
                { status: 400 }
            );
        }

        await new Promise(resolve => setTimeout(resolve, 300));

        const newContact = {
            id: `c${Date.now()}`,
            name,
            title: title || '',
            org,
            orgId: orgId || null,
            degree: degree || '3rd',
            connection: connection || null,
            email: email || null,
            createdAt: new Date().toISOString(),
        };

        mockContacts.push(newContact);

        return NextResponse.json({
            success: true,
            contact: newContact,
        });

    } catch (error) {
        console.error('Add contact error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
