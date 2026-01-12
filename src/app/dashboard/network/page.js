'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    MOCK_FOUNDATIONS,
    MOCK_CONTACTS,
    getActiveCampaign,
    getCampaigns,
    getCampaignDonorsWithDetails,
    getContactsForFoundation,
} from '@/lib/mockData';

export default function NetworkPage() {
    const router = useRouter();
    const [isHydrated, setIsHydrated] = useState(false);
    const [view, setView] = useState('upload'); // 'upload', 'build', 'map'
    const [stage, setStage] = useState('build'); // 'build' or 'map' for the tabs
    const [contacts, setContacts] = useState([]);
    const [pipelineDonors, setPipelineDonors] = useState([]);
    const [stats, setStats] = useState({ analyzed: 0, matched: 0, opportunities: 0 });
    const [searchFilter, setSearchFilter] = useState('');
    const [campaignFilter, setCampaignFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [availableCampaigns, setAvailableCampaigns] = useState([]);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // Add Connection Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [newConnection, setNewConnection] = useState({
        name: '',
        title: '',
        degree: '3rd',
        connection: '',
    });

    // Load contacts from donor search results on mount
    useEffect(() => {
        // Load campaigns from localStorage
        const campaigns = getCampaigns();
        console.log('🔄 [Network] Loaded campaigns:', campaigns.length, campaigns.map(c => c.name));
        setAvailableCampaigns(campaigns);
        
        // Extract contacts from cached donors in all campaigns
        const donorContacts = [];
        campaigns.forEach(campaign => {
            if (campaign.cachedDonors && Array.isArray(campaign.cachedDonors)) {
                campaign.cachedDonors.forEach(donor => {
                    // Create a contact for each donor (representing the foundation)
                    donorContacts.push({
                        id: `donor-${donor.id}`,
                        name: donor.name,
                        title: 'Foundation',
                        org: donor.name,
                        degree: '3rd',
                        connection: null,
                        matched: true,
                        assets: donor.total_assets,
                        focus: donor.focus_areas?.split(',')[0]?.trim() || 'General',
                        website: donor.website,
                        location: donor.location,
                        category: donor.category,
                        alignment_score: donor.alignment_score,
                        funding_range: donor.funding_range,
                        description: donor.description,
                        source: 'ai_search',
                        campaignName: campaign.name,
                    });
                });
            }
        });
        
        console.log('🔍 [Network] Extracted', donorContacts.length, 'donors from campaigns');
        
        // Merge with any previously uploaded contacts
        const storedContacts = localStorage.getItem('networkContacts');
        let allContacts = donorContacts;
        
        if (storedContacts) {
            const parsed = JSON.parse(storedContacts);
            // Only add uploaded contacts that aren't already in donor list
            const uploadedContacts = parsed.filter(c => c.source !== 'ai_search');
            allContacts = [...donorContacts, ...uploadedContacts];
        }
        
        if (allContacts.length > 0) {
            setContacts(allContacts);
            const warmPaths = allContacts.filter(c => c.degree === '1st' || c.degree === '2nd').length;
            setStats({
                analyzed: allContacts.length,
                matched: new Set(allContacts.filter(c => c.matched).map(c => c.org)).size,
                opportunities: warmPaths,
            });
            setView('connections');
        }
        
        setIsHydrated(true);
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        console.log('📁 [Network] Uploading file:', file.name);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            if (typeof text !== 'string') return;
            
            console.log('📄 [Network] Parsing CSV...');
            const parsedContacts = parseCSV(text);
            console.log('✅ [Network] Parsed', parsedContacts.length, 'contacts');
            
            // Match contacts to pipeline donors
            const matchedContacts = matchContactsToDonors(parsedContacts);
            console.log('🔗 [Network] Matched', matchedContacts.filter(c => c.matched).length, 'to pipeline');
            
            setContacts(matchedContacts);
            localStorage.setItem('networkContacts', JSON.stringify(matchedContacts));
            
            const warmPaths = matchedContacts.filter(c => c.degree === '1st' || c.degree === '2nd').length;
            const matchedOrgs = new Set(matchedContacts.filter(c => c.matched).map(c => c.org)).size;
            
            setStats({
                analyzed: matchedContacts.length,
                matched: matchedOrgs,
                opportunities: warmPaths,
            });
            setView('connections');
            showToast(`Imported ${matchedContacts.length} contacts, matched ${matchedOrgs} to pipeline`);
        };
        reader.readAsText(file);
    };

    // Parse CSV file into contacts (supports LinkedIn export format)
    const parseCSV = (text) => {
        // Clean up LinkedIn export format - remove notes section
        let cleanText = text;
        if (text.includes('First Name') && text.includes('Last Name')) {
            // Find the header row for LinkedIn format
            const headerMatch = text.match(/First Name[^\n]*/i);
            if (headerMatch) {
                const headerIndex = text.indexOf(headerMatch[0]);
                cleanText = text.substring(headerIndex);
            }
        }
        
        const lines = cleanText.split('\n').filter(line => line.trim() && !line.startsWith('#') && !line.startsWith('Notes'));
        if (lines.length < 2) return [];
        
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('📋 [Network] CSV headers:', headers);
        
        // Find column indices - LinkedIn specific format
        const firstNameIdx = headers.findIndex(h => h === 'first name' || h.includes('first'));
        const lastNameIdx = headers.findIndex(h => h === 'last name' || h.includes('last'));
        const nameIdx = headers.findIndex(h => h === 'name' && !h.includes('first') && !h.includes('last'));
        const titleIdx = headers.findIndex(h => h.includes('position') || h.includes('title') || h.includes('role'));
        const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('organization') || h.includes('employer') || h.includes('org'));
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const linkedinIdx = headers.findIndex(h => h.includes('url') || h.includes('linkedin'));
        const connectedOnIdx = headers.findIndex(h => h.includes('connected'));
        
        const contacts = [];
        for (let i = 1; i < lines.length; i++) {
            // Handle CSV values with potential commas inside quotes
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length < 2) continue;
            
            // Build full name from first + last or use name column
            let fullName = '';
            if (firstNameIdx >= 0 && lastNameIdx >= 0) {
                const firstName = values[firstNameIdx] || '';
                const lastName = values[lastNameIdx] || '';
                fullName = `${firstName} ${lastName}`.trim();
            } else if (nameIdx >= 0) {
                fullName = values[nameIdx];
            } else {
                fullName = values[0];
            }
            
            const title = titleIdx >= 0 ? values[titleIdx] : '';
            const org = companyIdx >= 0 ? values[companyIdx] : '';
            const email = emailIdx >= 0 ? values[emailIdx] : '';
            const linkedinUrl = linkedinIdx >= 0 ? values[linkedinIdx] : '';
            const connectedOn = connectedOnIdx >= 0 ? values[connectedOnIdx] : '';
            
            if (!fullName || fullName.length < 2) continue;
            
            contacts.push({
                id: Date.now() + i,
                name: fullName,
                title: title || 'Contact',
                org: org || 'Unknown Organization',
                email: email,
                linkedinUrl: linkedinUrl,
                connectedOn: connectedOn,
                degree: '1st', // LinkedIn connections are 1st degree
                connection: null,
                matched: false,
                source: 'linkedin',
            });
        }
        
        console.log('✅ [Network] Parsed contacts:', contacts.length);
        return contacts;
    };

    // Match contacts to pipeline donors based on organization names
    const matchContactsToDonors = (importedContacts) => {
        // Get all pipeline donors from campaigns
        const campaigns = getCampaigns();
        const pipelineDonorNames = new Set();
        
        campaigns.forEach(campaign => {
            if (campaign.donors) {
                campaign.donors.forEach(donor => {
                    const foundation = MOCK_FOUNDATIONS.find(f => f.id === donor.foundationId);
                    if (foundation) {
                        pipelineDonorNames.add(foundation.name.toLowerCase());
                        // Add variations
                        pipelineDonorNames.add(foundation.name.toLowerCase().replace(' foundation', ''));
                        pipelineDonorNames.add(foundation.name.toLowerCase().replace('the ', ''));
                    }
                });
            }
        });
        
        // Also add all mock foundations as potential matches
        MOCK_FOUNDATIONS.forEach(f => {
            pipelineDonorNames.add(f.name.toLowerCase());
        });
        
        console.log('🎯 [Network] Pipeline donors to match:', pipelineDonorNames.size);
        
        return importedContacts.map(contact => {
            const orgLower = contact.org.toLowerCase();
            const isMatched = [...pipelineDonorNames].some(donor => 
                orgLower.includes(donor) || donor.includes(orgLower)
            );
            
            // Find the matching foundation for additional data
            const matchedFoundation = MOCK_FOUNDATIONS.find(f => 
                f.name.toLowerCase().includes(orgLower) || orgLower.includes(f.name.toLowerCase())
            );
            
            return {
                ...contact,
                matched: isMatched,
                foundationId: matchedFoundation?.id,
                assets: matchedFoundation?.total_assets,
                focus: matchedFoundation?.focus_areas?.split(',')[0]?.trim(),
            };
        });
    };

    const handleUse990Data = () => {
        // Use all mock contacts from the seed data
        const allContacts = MOCK_CONTACTS.map(contact => {
            const foundation = MOCK_FOUNDATIONS.find(f => f.id === contact.foundationId);
            return {
                id: contact.id,
                name: contact.name,
                title: contact.title,
                org: foundation?.name || 'Unknown Foundation',
                degree: contact.connectionDegree || '3rd',
                connection: contact.connectedThrough,
                assets: foundation?.total_assets,
                focus: foundation?.focus_areas?.split(',')[0]?.trim() || 'General',
                foundationId: contact.foundationId,
            };
        });

        setContacts(allContacts);
        localStorage.setItem('networkContacts', JSON.stringify(allContacts));
        const warmPaths = allContacts.filter(c => c.degree === '1st' || c.degree === '2nd').length;
        
        setStats({
            analyzed: allContacts.length,
            matched: MOCK_FOUNDATIONS.length,
            opportunities: warmPaths,
        });
        setView('connections');
    };

    // Handle adding a new connection
    const handleAddConnection = () => {
        if (!newConnection.name.trim() || !selectedOrg) return;

        const contact = {
            id: Date.now(),
            name: newConnection.name,
            title: newConnection.title || 'Contact',
            org: selectedOrg,
            degree: newConnection.degree,
            connection: newConnection.connection || null,
        };

        const updatedContacts = [...contacts, contact];
        setContacts(updatedContacts);
        localStorage.setItem('uploadedContacts', JSON.stringify(updatedContacts));

        // Reset form
        setNewConnection({ name: '', title: '', degree: '3rd', connection: '' });
        setSelectedOrg(null);
        setShowAddModal(false);
    };

    // Group contacts by organization - show all donors from AI search
    const groupedByOrg = contacts
        .filter(contact => contact.matched || contact.source === 'ai_search')
        .reduce((acc, contact) => {
            if (!acc[contact.org]) {
                acc[contact.org] = {
                    name: contact.org,
                    assets: contact.assets,
                    focus: contact.focus,
                    website: contact.website,
                    location: contact.location,
                    category: contact.category,
                    alignment_score: contact.alignment_score,
                    funding_range: contact.funding_range,
                    description: contact.description,
                    campaignName: contact.campaignName,
                    contacts: [],
                    warmPaths: 0,
                    source: contact.source,
                };
            }
            acc[contact.org].contacts.push(contact);
            if (contact.degree === '1st' || contact.degree === '2nd') {
                acc[contact.org].warmPaths++;
            }
            return acc;
        }, {});
    
    // Count unmatched for stats
    const unmatchedCount = contacts.filter(c => !c.matched && c.source !== 'ai_search').length;

    // Loading state - prevents hydration mismatch and flash
    if (!isHydrated) {
        return (
            <div style={{
                padding: '32px',
                minHeight: '100vh',
                background: '#f8fafc',
            }} />
        );
    }

    // Upload/Choose Screen
    if (view === 'upload') {
        return (
            <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Breadcrumb */}
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '8px' }}>
                    Network <span style={{ margin: '0 8px' }}>›</span>
                    <span style={{ color: '#C9A227' }}>Upload Data</span>
                </div>

                {/* Header */}
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', marginBottom: '8px' }}>
                    Network Visualization
                </h1>
                <p style={{ fontSize: '0.9375rem', color: '#64748b', marginBottom: '32px' }}>
                    Visualize your connections to uncover hidden donor paths and strengthen your non-profit's outreach strategy.
                </p>

                {/* Two Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    {/* Warm Path Card - Upload */}
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        border: '2px dashed #e2e8f0',
                        padding: '40px 32px',
                        textAlign: 'center',
                    }}>
                        <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            backgroundColor: '#FEF3C7',
                            color: '#B45309',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '20px',
                        }}>
                            Warm Path
                        </span>

                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: '#FEF3C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                            </svg>
                        </div>

                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                            Drop your contact CSV or click to browse
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
                            Find connections to foundation boards through your own network.
                        </p>

                        <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginBottom: '24px',
                        }}>
                            Browse Files
                            <input
                                type="file"
                                accept=".csv,.xlsx"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />
                        </label>

                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                            Supports Exports From
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', color: '#94a3b8', marginBottom: '20px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                            </svg>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                            </svg>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="10" />
                            </svg>
                        </div>
                        
                        {/* Privacy Note */}
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '8px', 
                            padding: '12px 16px', 
                            background: '#f0fdf4', 
                            borderRadius: '8px',
                            border: '1px solid #bbf7d0',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            <p style={{ fontSize: '0.75rem', color: '#166534', margin: 0, lineHeight: 1.5 }}>
                                <strong>Privacy Note:</strong> Your LinkedIn connection data is processed locally and only matched connections are stored. We never share your contacts with third parties.
                            </p>
                        </div>
                    </div>

                    {/* Direct Access Card - 990 Data */}
                    <div style={{
                        background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                        borderRadius: '16px',
                        padding: '40px 32px',
                        color: 'white',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <span style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                backgroundColor: '#C9A227',
                                color: 'white',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                Direct Access
                            </span>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="#C9A227">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
                            Research Foundation Officers Directly
                        </h3>
                        <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '24px', lineHeight: 1.6 }}>
                            Skip the contact upload. Our system is pre-loaded with comprehensive 990-PF data, giving you instant access to millions of foundation board members.
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                            {[
                                '2.5M+ Board Members Indexed',
                                'Full 990-PF Filing History',
                                'Search by Interest & Region'
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#C9A227">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                    <span style={{ fontSize: '0.875rem' }}>{item}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleUse990Data}
                            style={{
                                width: '100%',
                                padding: '14px 24px',
                                backgroundColor: '#C9A227',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                        >
                            View Direct Foundation Officers
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tip Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 24px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#FEF3C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            💡
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                Tip: Expanding your network is easiest with LinkedIn data.
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                Most successful non-profits start by importing their administrator's professional connections.
                            </div>
                        </div>
                    </div>
                    <a href="#" style={{ fontSize: '0.875rem', color: '#C9A227', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        Read our export guide ↗
                    </a>
                </div>
            </div>
        );
    }

    // Connections View Screen
    const totalConnections = contacts.filter(c => c.degree === '1st' || c.degree === '2nd').length;
    const orgsWithConnections = Object.values(groupedByOrg).filter(org => org.warmPaths > 0).length;
    const coverage = Object.keys(groupedByOrg).length > 0
        ? Math.round((orgsWithConnections / Object.keys(groupedByOrg).length) * 100)
        : 0;

    // Filter organizations based on search AND filters
    const filteredOrgs = Object.values(groupedByOrg).filter(org => {
        // Text search
        if (searchFilter) {
            const term = searchFilter.toLowerCase();
            const matches = org.name.toLowerCase().includes(term) ||
                org.contacts.some(c => c.name.toLowerCase().includes(term));
            if (!matches) return false;
        }

        // Status filter (connection status)
        if (statusFilter === 'connected') {
            if (org.warmPaths === 0) return false;
        } else if (statusFilter === 'no-connection') {
            if (org.warmPaths > 0) return false;
        }

        return true;
    });

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header with Build/Map Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', marginBottom: '8px' }}>
                        Network Mapping
                    </h1>
                    <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>
                        {stage === 'build' ? 'Import and manage your network contacts' : 'See which donors you\'re connected to via your network'}
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Build/Map Stage Tabs */}
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
                        <button
                            onClick={() => setStage('build')}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: stage === 'build' ? 'white' : 'transparent',
                                color: stage === 'build' ? '#1B365D' : '#64748b',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: stage === 'build' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            }}
                        >
                            1. Build
                        </button>
                        <button
                            onClick={() => setStage('map')}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: stage === 'map' ? 'white' : 'transparent',
                                color: stage === 'map' ? '#1B365D' : '#64748b',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: stage === 'map' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            }}
                        >
                            2. Map
                        </button>
                    </div>
                    <button
                        onClick={() => setView('upload')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            background: 'white',
                            fontSize: '0.8125rem',
                            color: '#64748b',
                            cursor: 'pointer',
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                        </svg>
                        Import More
                    </button>
                </div>
            </div>

            {/* Stats Row - Premium Clickable Filter Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '24px',
            }}>
                {[
                    {
                        key: 'all',
                        label: 'Pipeline Orgs',
                        value: Object.keys(groupedByOrg).length,
                        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 7v1a3 3 0 003 3h12a3 3 0 003-3V7M21 7H3m9-4v4" /></svg>,
                        iconBg: '#e2e8f0',
                        iconColor: '#475569',
                        activeBg: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                    },
                    {
                        key: 'connected',
                        label: 'With Connections',
                        value: orgsWithConnections,
                        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="6" r="3" /><circle cx="19" cy="6" r="3" /><circle cx="12" cy="18" r="3" /><path d="M5 9v3a4 4 0 004 4h2M19 9v3a4 4 0 01-4 4h-2" /></svg>,
                        iconBg: '#DCFCE7',
                        iconColor: '#22C55E',
                        activeBg: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                    },
                    {
                        key: 'no-connection',
                        label: 'No Connections',
                        value: Object.keys(groupedByOrg).length - orgsWithConnections,
                        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>,
                        iconBg: '#FEE2E2',
                        iconColor: '#EF4444',
                        activeBg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    },
                    {
                        key: 'coverage',
                        label: 'Coverage Rate',
                        value: `${coverage}%`,
                        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
                        iconBg: '#FEF3C7',
                        iconColor: '#C9A227',
                        activeBg: 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)',
                    },
                ].map((stat) => {
                    const isActive = statusFilter === stat.key;
                    const isClickable = stat.key !== 'coverage';
                    return (
                        <button
                            key={stat.key}
                            onClick={() => isClickable && setStatusFilter(isActive ? 'all' : stat.key)}
                            style={{
                                padding: '20px',
                                background: isActive ? stat.activeBg : 'white',
                                borderRadius: '14px',
                                border: isActive ? 'none' : '1px solid #e2e8f0',
                                cursor: isClickable ? 'pointer' : 'default',
                                transition: 'all 0.2s ease',
                                boxShadow: isActive ? '0 8px 24px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                                transform: isActive ? 'translateY(-2px)' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                textAlign: 'left',
                            }}
                        >
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: isActive ? 'rgba(255, 255, 255, 0.2)' : stat.iconBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isActive ? 'white' : stat.iconColor,
                                flexShrink: 0,
                            }}>
                                {stat.icon}
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '1.75rem',
                                    fontWeight: 700,
                                    color: isActive ? 'white' : '#1e293b',
                                    lineHeight: 1,
                                }}>{stat.value}</div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    color: isActive ? 'rgba(255, 255, 255, 0.8)' : '#94a3b8',
                                    marginTop: '4px',
                                }}>{stat.label}</div>
                            </div>
                            {isActive && isClickable && (
                                <div style={{
                                    marginLeft: 'auto',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Search & Filter Bar */}
            <div style={{
                display: 'flex',
                gap: '12px',
                padding: '16px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                marginBottom: '24px',
            }}>
                {/* Search Input */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                    >
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 14px 12px 44px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            color: '#1e293b',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Campaign Filter */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={campaignFilter}
                        onChange={(e) => {
                            console.log('🔄 [Network] Campaign filter changed to:', e.target.value);
                            setCampaignFilter(e.target.value);
                        }}
                        style={{
                            padding: '12px 40px 12px 16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            color: '#1e293b',
                            backgroundColor: 'white',
                            appearance: 'none',
                            cursor: 'pointer',
                            minWidth: '160px',
                        }}
                    >
                        <option value="all">All Campaigns</option>
                        {availableCampaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </div>

                {/* Status Filter */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: '12px 40px 12px 16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            color: '#1e293b',
                            backgroundColor: 'white',
                            appearance: 'none',
                            cursor: 'pointer',
                            minWidth: '140px',
                        }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="connected">Has Connections</option>
                        <option value="no-connection">No Connections</option>
                    </select>
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </div>
            </div>

            {/* Organization Cards */}
            {filteredOrgs.map((org, i) => {
                // Use actual donor data from AI search or fallback to mock
                const location = org.location || ['New York, NY', 'San Francisco, CA', 'Seattle, WA'][i % 3];
                const potential = org.funding_range || (org.assets ? `$${(org.assets / 1000000).toFixed(1)}M` : '$50K - $200K');
                const alignmentScore = org.alignment_score || 75;
                const category = org.category || 'Foundation';
                const description = org.description || '';
                const website = org.website || '';
                const status = org.warmPaths > 0 ? 'Connected' : org.source === 'ai_search' ? 'Research' : 'New';
                const statusColors = {
                    'Connected': { bg: '#DCFCE7', color: '#166534' },
                    'Research': { bg: '#DBEAFE', color: '#1D4ED8' },
                    'New': { bg: '#e2e8f0', color: '#475569' },
                };

                return (
                    <div key={i} style={{
                        background: 'white',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        marginBottom: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    }}>
                        {/* Org Header - Premium Design */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '20px 24px',
                            background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)',
                            borderBottom: '1px solid #f1f5f9',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {/* Org Initials with Contact Count Badge */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '1.125rem',
                                        fontWeight: 700,
                                        letterSpacing: '-0.02em',
                                    }}>
                                        {org.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    {/* Contact Count Badge */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '-6px',
                                        right: '-6px',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        background: '#C9A227',
                                        color: 'white',
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid white',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                    }}>
                                        {org.contacts.length}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                            {org.name}
                                        </h3>
                                        {alignmentScore && (
                                            <span style={{
                                                padding: '2px 8px',
                                                fontSize: '0.6875rem',
                                                fontWeight: 600,
                                                borderRadius: '100px',
                                                backgroundColor: alignmentScore >= 80 ? '#DCFCE7' : alignmentScore >= 60 ? '#FEF3C7' : '#e2e8f0',
                                                color: alignmentScore >= 80 ? '#166534' : alignmentScore >= 60 ? '#92400E' : '#475569',
                                            }}>
                                                {alignmentScore}% match
                                            </span>
                                        )}
                                        <span style={{
                                            padding: '2px 8px',
                                            fontSize: '0.6875rem',
                                            fontWeight: 500,
                                            borderRadius: '100px',
                                            backgroundColor: statusColors[status]?.bg || '#e2e8f0',
                                            color: statusColors[status]?.color || '#475569',
                                        }}>
                                            {status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.8125rem', color: '#64748b' }}>
                                        <span>{category}</span>
                                        <span>•</span>
                                        <span>{location}</span>
                                        <span>•</span>
                                        <span style={{ color: '#1B365D', fontWeight: 600 }}>{potential}</span>
                                        {website && (
                                            <>
                                                <span>•</span>
                                                <a href={website} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', textDecoration: 'none' }}>
                                                    Website ↗
                                                </a>
                                            </>
                                        )}
                                    </div>
                                    {description && (
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '8px 0 0', lineHeight: 1.4 }}>
                                            {description.slice(0, 150)}{description.length > 150 ? '...' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact Tabs */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 24px',
                            borderBottom: '1px solid #f1f5f9',
                        }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[
                                    { label: 'All Contacts', count: org.contacts.length, active: true },
                                    { label: 'Decision Makers', count: org.contacts.filter(c => c.degree === '1st').length, active: false },
                                    { label: 'Influencers', count: org.contacts.filter(c => c.degree === '2nd').length, active: false },
                                ].map((tab, idx) => (
                                    <button
                                        key={idx}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '100px',
                                            border: tab.active ? 'none' : '1px solid #e2e8f0',
                                            background: tab.active ? 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)' : 'white',
                                            color: tab.active ? 'white' : '#64748b',
                                            fontSize: '0.8125rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {tab.label} ({tab.count})
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contacts Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '16px',
                            padding: '20px 24px',
                        }}>
                            {org.contacts.map((contact, j) => {
                                // Generate a streak based on degree
                                const streak = contact.degree === '1st' ? 12 : contact.degree === '2nd' ? 7 : 3;
                                const streakColor = streak >= 10 ? '#22C55E' : streak >= 5 ? '#C9A227' : '#94a3b8';

                                // Generate a brief description
                                const descriptions = [
                                    `Experienced ${contact.title} with deep expertise in ${org.focus || 'philanthropy'} initiatives.`,
                                    `Strategic leader focused on ${org.focus || 'community'} impact and sustainable growth.`,
                                    `Key decision-maker overseeing grant distributions and partnerships.`,
                                ];
                                const description = descriptions[j % descriptions.length];

                                return (
                                    <div key={j} style={{
                                        padding: '20px',
                                        borderRadius: '14px',
                                        border: contact.degree === '1st' ? '2px solid #3B82F6' : contact.degree === '2nd' ? '2px solid #22C55E' : '1px solid #e2e8f0',
                                        background: 'white',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                    }}>
                                        {/* Header with avatar and streak */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                                <div style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '12px',
                                                    backgroundColor: contact.degree === '1st' ? '#3B82F6' : contact.degree === '2nd' ? '#22C55E' : '#94a3b8',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1rem',
                                                    fontWeight: 600,
                                                }}>
                                                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                                                        {contact.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
                                                        {contact.title}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Streak Badge */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    padding: '10px 14px',
                                                    background: `linear-gradient(135deg, ${streakColor}15 0%, ${streakColor}05 100%)`,
                                                    borderRadius: '12px',
                                                    border: `1px solid ${streakColor}30`,
                                                }}>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: streakColor, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        🔥 {streak}
                                                    </div>
                                                    <div style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: 500 }}>
                                                        STREAK
                                                    </div>
                                                </div>
                                                {/* Degree Tag - Below Score */}
                                                <span style={{
                                                    padding: '4px 10px',
                                                    fontSize: '0.625rem',
                                                    fontWeight: 700,
                                                    borderRadius: '100px',
                                                    textTransform: 'uppercase',
                                                    backgroundColor: contact.degree === '1st' ? '#3B82F6' : contact.degree === '2nd' ? '#22C55E' : '#94a3b8',
                                                    color: 'white',
                                                }}>
                                                    {contact.degree}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p style={{
                                            fontSize: '0.8125rem',
                                            color: '#64748b',
                                            lineHeight: 1.5,
                                            margin: '0 0 16px',
                                        }}>
                                            {description}
                                        </p>

                                        {contact.connection && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '10px 12px',
                                                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                                borderRadius: '8px',
                                                fontSize: '0.75rem',
                                                color: '#64748b',
                                                marginBottom: '16px',
                                            }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth="2">
                                                    <circle cx="5" cy="6" r="3" /><circle cx="19" cy="6" r="3" /><circle cx="12" cy="18" r="3" />
                                                    <path d="M5 9v3a4 4 0 004 4h2M19 9v3a4 4 0 01-4 4h-2" />
                                                </svg>
                                                <span>Connected via <strong style={{ color: '#1e293b' }}>{contact.connection}</strong></span>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        <button
                                            onClick={() => router.push('/dashboard/outreach')}
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                border: contact.degree === '1st' ? 'none' : '1px solid #e2e8f0',
                                                borderRadius: '10px',
                                                background: contact.degree === '1st'
                                                    ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                                                    : 'white',
                                                color: contact.degree === '1st' ? 'white' : '#475569',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                boxShadow: contact.degree === '1st' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                                            }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                            View Profile
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Add Connection Card */}
                            <div
                                onClick={() => { setSelectedOrg(org.name); setShowAddModal(true); }}
                                style={{
                                    padding: '20px',
                                    borderRadius: '14px',
                                    border: '2px dashed #e2e8f0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '180px',
                                    cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                                    transition: 'all 0.2s ease',
                                }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    border: '2px dashed #C9A227',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#C9A227',
                                    marginBottom: '12px',
                                    fontSize: '1.5rem',
                                }}>
                                    +
                                </div>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b' }}>Add Connection</span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Expand your network</span>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Empty State - No matches found */}
            {
                Object.keys(groupedByOrg).length === 0 && contacts.length > 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px',
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                            No matches to pipeline foundations
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '16px', maxWidth: '500px', margin: '0 auto 16px' }}>
                            We analyzed <strong>{contacts.length}</strong> contacts but none work at foundations in your pipeline.
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
                            Network mapping finds contacts who work <em>at</em> foundations you're researching (e.g., "Gates Foundation" staff). 
                            LinkedIn contacts at companies like "Google" or "Microsoft" won't match foundation names.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setView('upload')}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: 'white',
                                    color: '#1B365D',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Try Different File
                            </button>
                            <button
                                onClick={() => { handleUse990Data(); }}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#1B365D',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Use 990 Foundation Data Instead
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Empty State - No contacts uploaded */}
            {
                Object.keys(groupedByOrg).length === 0 && contacts.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px',
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔗</div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                            No connections yet
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>
                            Upload your contacts or use 990 data to start mapping connections.
                        </p>
                        <button
                            onClick={() => setView('upload')}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#1B365D',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Go Back to Upload
                        </button>
                    </div>
                )
            }

            {/* Add Connection Modal */}
            {
                showAddModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '32px',
                            width: '100%',
                            maxWidth: '480px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        }}>
                            {/* Modal Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                                    Add Connection
                                </h2>
                                <button
                                    onClick={() => { setShowAddModal(false); setSelectedOrg(null); }}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#f1f5f9',
                                        cursor: 'pointer',
                                        fontSize: '1.25rem',
                                        color: '#64748b',
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            {/* Org Badge */}
                            <div style={{
                                padding: '12px 16px',
                                background: '#f8fafc',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                fontSize: '0.875rem',
                                color: '#64748b',
                            }}>
                                Adding to: <strong style={{ color: '#1e293b' }}>{selectedOrg}</strong>
                            </div>

                            {/* Form Fields */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Name */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                        Contact Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newConnection.name}
                                        onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                                        placeholder="e.g., John Smith"
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            fontSize: '0.9375rem',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>

                                {/* Title */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                        Title / Role
                                    </label>
                                    <input
                                        type="text"
                                        value={newConnection.title}
                                        onChange={(e) => setNewConnection({ ...newConnection, title: e.target.value })}
                                        placeholder="e.g., Board Member, Program Officer"
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            fontSize: '0.9375rem',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>

                                {/* Degree */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                        Connection Degree
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {['1st', '2nd', '3rd'].map((deg) => (
                                            <button
                                                key={deg}
                                                onClick={() => setNewConnection({ ...newConnection, degree: deg })}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    border: newConnection.degree === deg ? '2px solid' : '1px solid #e2e8f0',
                                                    borderColor: newConnection.degree === deg
                                                        ? (deg === '1st' ? '#3B82F6' : deg === '2nd' ? '#22C55E' : '#94a3b8')
                                                        : '#e2e8f0',
                                                    borderRadius: '8px',
                                                    background: newConnection.degree === deg
                                                        ? (deg === '1st' ? '#EFF6FF' : deg === '2nd' ? '#F0FDF4' : '#f8fafc')
                                                        : 'white',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    color: newConnection.degree === deg
                                                        ? (deg === '1st' ? '#3B82F6' : deg === '2nd' ? '#22C55E' : '#64748b')
                                                        : '#64748b',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {deg} Degree
                                            </button>
                                        ))}
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>
                                        1st = You know them directly • 2nd = Someone you know can intro • 3rd = No direct path
                                    </p>
                                </div>

                                {/* Connected Via (only for 2nd degree) */}
                                {newConnection.degree === '2nd' && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                            Connected Via
                                        </label>
                                        <input
                                            type="text"
                                            value={newConnection.connection}
                                            onChange={(e) => setNewConnection({ ...newConnection, connection: e.target.value })}
                                            placeholder="Who can make the introduction?"
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                fontSize: '0.9375rem',
                                                boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Modal Actions */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button
                                    onClick={() => { setShowAddModal(false); setSelectedOrg(null); }}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        background: 'white',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: '#64748b',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddConnection}
                                    disabled={!newConnection.name.trim()}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: newConnection.name.trim() ? '#1B365D' : '#94a3b8',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'white',
                                        cursor: newConnection.name.trim() ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    Add Connection
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Toast Notification */}
            {toast.show && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    padding: '14px 20px',
                    background: toast.type === 'error' ? '#FEE2E2' : '#DCFCE7',
                    color: toast.type === 'error' ? '#DC2626' : '#166534',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    zIndex: 1001,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    {toast.type === 'error' ? '⚠️' : '✓'} {toast.message}
                </div>
            )}
        </div >
    );
}
