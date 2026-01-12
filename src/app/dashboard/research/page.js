'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SearchConfigModal } from '@/components/search-config-modal';
import {
    MOCK_FOUNDATIONS,
    getCampaigns,
    createCampaign,
    getCampaignById,
    addDonorToCampaign,
    rejectDonorInCampaign,
    setActiveCampaign,
    getActiveCampaign,
    cacheDonorsForCampaign,
    getCachedDonors,
} from '@/lib/mockData';
import { donorResearchAPI } from '@/lib/api';
import { getDailySearchUsage, canPerformSearch, incrementSearchCount } from '@/lib/openrouter';
import { saveAIDonorResults, loadCampaignDonorsFromDB, createCampaignInDB, loadCampaignsFromDB } from '@/lib/supabase';

// Utility functions
function formatCurrency(amount) {
    if (!amount) return 'N/A';
    if (amount >= 1000000000) return '$' + (amount / 1000000000).toFixed(1) + 'B';
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(0) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
    return '$' + amount.toLocaleString();
}

// Donor Card Component
function DonorCard({ donor, isExpanded, onToggle, onAddToPipeline, isInPipeline, onReject, isRejected }) {
    const [activeTab, setActiveTab] = useState('insight');
    const focusTags = donor.focus_areas ? donor.focus_areas.split(',').slice(0, 3) : [];
    const insights = donor.ai_insights || {};
    const score = donor.alignment_score || 85;
    const isHighlyActive = score >= 95;

    const tabs = [
        { id: 'insight', label: 'AI Strategy Insight' },
        { id: 'approach', label: 'Suggested Approach' },
        { id: 'financial', label: '990-PF Financial Data' },
        { id: 'people', label: 'Key People' },
    ];

    // Determine border and opacity based on state
    const getBorderStyle = () => {
        if (isInPipeline) return '2px solid #C9A227';
        if (isRejected) return '1px solid #e2e8f0';
        return '1px solid #e2e8f0';
    };

    return (
        <div style={{
            background: isRejected ? '#f8fafc' : 'white',
            borderRadius: '12px',
            border: getBorderStyle(),
            marginBottom: '16px',
            overflow: 'hidden',
            boxShadow: isInPipeline ? '0 0 0 1px rgba(201, 162, 39, 0.1)' : 'none',
            opacity: isRejected ? 0.5 : 1,
            transition: 'all 0.2s',
        }}>
            {/* Card Header */}
            <div
                onClick={() => onToggle(donor.id)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '20px 24px',
                    cursor: 'pointer',
                    gap: '16px',
                }}
            >
                {/* Icon */}
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
                        <path d="M3 21h18M3 7v1a3 3 0 003 3h12a3 3 0 003-3V7M21 7H3m9-4v4" />
                    </svg>
                </div>

                {/* Name & Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: isRejected ? '#94a3b8' : '#1e293b', margin: 0, textDecoration: isRejected ? 'line-through' : 'none' }}>
                            {donor.name}
                        </h3>
                        {isHighlyActive && !isRejected && (
                            <span style={{
                                padding: '3px 10px',
                                backgroundColor: '#C9A227',
                                color: 'white',
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>
                                Highly Active
                            </span>
                        )}
                        {isRejected && (
                            <span style={{
                                padding: '3px 10px',
                                backgroundColor: '#94a3b8',
                                color: 'white',
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                            }}>
                                Passed
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', fontSize: '0.8125rem', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                            </svg>
                            {donor.city || 'N/A'}, {donor.state || 'N/A'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                            </svg>
                            {focusTags.join(', ') || donor.category || 'Foundation'}
                        </span>
                    </div>
                </div>

                {/* Match Score */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        AI Match Score
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '80px',
                            height: '6px',
                            backgroundColor: '#e2e8f0',
                            borderRadius: '3px',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                width: `${score}%`,
                                height: '100%',
                                backgroundColor: isRejected ? '#94a3b8' : (score >= 90 ? '#C9A227' : score >= 70 ? '#3b82f6' : '#94a3b8'),
                                borderRadius: '3px',
                            }} />
                        </div>
                        <span style={{ fontSize: '1.125rem', fontWeight: 700, color: isRejected ? '#94a3b8' : '#1e293b' }}>{score}%</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {/* Reject Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onReject(donor); }}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: isRejected ? 'none' : '1px solid #e2e8f0',
                            backgroundColor: isRejected ? '#94a3b8' : 'white',
                            color: isRejected ? 'white' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        title={isRejected ? 'Rejected' : 'Pass'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Add to Pipeline Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddToPipeline(donor); }}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: isInPipeline ? 'none' : '2px solid #C9A227',
                            backgroundColor: isInPipeline ? '#1B365D' : 'white',
                            color: isInPipeline ? 'white' : '#C9A227',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        title={isInPipeline ? 'In Pipeline' : 'Add to Pipeline'}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                        >
                            {isInPipeline ? (
                                <path d="M20 6L9 17l-5-5" />
                            ) : (
                                <path d="M12 5v14M5 12h14" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <>
                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '24px',
                        padding: '0 24px',
                        borderBottom: '1px solid #e2e8f0',
                    }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '12px 0',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    color: activeTab === tab.id ? '#C9A227' : '#64748b',
                                    borderBottom: activeTab === tab.id ? '2px solid #C9A227' : '2px solid transparent',
                                    marginBottom: '-1px',
                                    transition: 'color 0.2s',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ padding: '20px 24px' }}>
                        {activeTab === 'insight' && (
                            <div style={{
                                backgroundColor: '#fafafa',
                                borderRadius: '10px',
                                padding: '20px',
                                border: '1px solid #f1f5f9',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', letterSpacing: '0.05em', margin: 0 }}>
                                        AI STRATEGY INSIGHT
                                    </h4>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#C9A227">
                                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                    </svg>
                                </div>
                                <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.7, margin: 0 }}>
                                    {insights.summary || donor.description || 'Analysis pending...'}
                                </p>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                                    {focusTags[0] && (
                                        <span style={{ padding: '6px 12px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem', color: '#475569' }}>
                                            Match: {focusTags[0].trim()}
                                        </span>
                                    )}
                                    {donor.state && (
                                        <span style={{ padding: '6px 12px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem', color: '#475569' }}>
                                            Region: {donor.state}
                                        </span>
                                    )}
                                    {donor.funding_range && (
                                        <span style={{ padding: '6px 12px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem', color: '#475569' }}>
                                            Grant Size: {donor.funding_range}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'approach' && (
                            <div style={{ backgroundColor: '#fafafa', borderRadius: '10px', padding: '20px', border: '1px solid #f1f5f9' }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                                    SUGGESTED APPROACH
                                </h4>
                                <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.7, margin: 0 }}>
                                    {insights.approachStrategy || 'Begin with a brief introductory email to their program officer, highlighting your shared focus on STEM education. Follow up with a formal letter of inquiry within 2 weeks.'}
                                </p>
                            </div>
                        )}

                        {activeTab === 'financial' && (
                            <div style={{ backgroundColor: '#fafafa', borderRadius: '10px', padding: '20px', border: '1px solid #f1f5f9' }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                                    990-PF FINANCIAL DATA
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '4px' }}>Total Assets</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(donor.total_assets)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '4px' }}>Annual Giving</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(donor.total_assets * 0.05)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '4px' }}>Avg Grant</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{formatCurrency(donor.total_assets * 0.002)}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'people' && (
                            <div style={{ backgroundColor: '#fafafa', borderRadius: '10px', padding: '20px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', letterSpacing: '0.05em', margin: 0 }}>
                                        KEY PEOPLE FROM 990-PF
                                    </h4>
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 10px',
                                        backgroundColor: '#f1f5f9',
                                        borderRadius: '100px',
                                        fontSize: '0.6875rem',
                                        fontWeight: 600,
                                        color: '#64748b',
                                    }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M12 16v-4M12 8h.01" />
                                        </svg>
                                        3rd Degree Connections
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(donor.officers || [{ name: 'Program Officer', title: 'Director' }]).slice(0, 5).map((officer, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            backgroundColor: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '10px',
                                                    background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                }}>
                                                    {officer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{officer.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{officer.title}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    backgroundColor: '#f1f5f9',
                                                    borderRadius: '6px',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 600,
                                                    color: '#64748b',
                                                }}>
                                                    3rd
                                                </span>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    backgroundColor: '#DBEAFE',
                                                    borderRadius: '6px',
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 600,
                                                    color: '#1D4ED8',
                                                }}>
                                                    990 Data
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add to Pipeline Button */}
                    <div style={{ padding: '0 24px 20px' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddToPipeline(donor); }}
                            style={{
                                width: '100%',
                                padding: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                backgroundColor: isInPipeline ? '#1B365D' : '#f8f6f0',
                                color: isInPipeline ? 'white' : '#1B365D',
                                border: isInPipeline ? 'none' : '2px solid #C9A227',
                                borderRadius: '10px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {isInPipeline ? (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 6L9 17l-5-5" />
                                    </svg>
                                    Added to Pipeline
                                </>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
                                    </svg>
                                    Add to Pipeline
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default function DonorResearchPage() {
    const router = useRouter();
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [pipelineIds, setPipelineIds] = useState(new Set());
    const [rejectedIds, setRejectedIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [currentCampaign, setCurrentCampaign] = useState(null);
    const [regionFilter, setRegionFilter] = useState('All Regions');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchConfig, setSearchConfig] = useState(null);
    const [availableCampaigns, setAvailableCampaigns] = useState([]);
    
    // Ref to prevent duplicate search calls
    const isSearchingRef = useRef(false);
    const lastSearchRef = useRef('');

    // Load campaigns on mount - foundations only shown after user searches
    useEffect(() => {
        console.log('🔄 [Research] Initializing page...');
        const campaigns = getCampaigns();
        console.log('📋 [Research] Loaded campaigns:', campaigns.length, campaigns.map(c => c.name));
        setAvailableCampaigns(campaigns);
        
        // Check if we have a previously active campaign with search results
        const active = getActiveCampaign();
        console.log('🎯 [Research] Active campaign:', active ? active.name : 'None');
        if (active && active.donors && active.donors.length > 0) {
            // User has already searched in this campaign, show results
            setCurrentCampaign(active);
            setCampaignName(active.name);
            setHasSearched(true);
            
            // Build pipeline and rejected sets from campaign data
            const pipelineSet = new Set();
            const rejectedSet = new Set();
            active.donors.forEach(d => {
                if (d.isRejected) {
                    rejectedSet.add(d.foundationId);
                } else {
                    pipelineSet.add(d.foundationId);
                }
            });
            setPipelineIds(pipelineSet);
            setRejectedIds(rejectedSet);
            
            // Try to load from database first, then cache, then AI
            const loadCampaignDonors = async () => {
                setLoading(true);
                
                // 1. Try database first
                console.log('🔍 [Research] Checking database for donors...');
                const dbDonors = await loadCampaignDonorsFromDB(active.id);
                if (dbDonors && dbDonors.length > 0) {
                    console.log('⚡ [Research] Loaded', dbDonors.length, 'donors from database!');
                    setDonors(dbDonors);
                    setExpandedId(dbDonors[0].id);
                    setLoading(false);
                    return;
                }
                
                // 2. Try localStorage cache
                const cached = getCachedDonors(active.id);
                if (cached && cached.length > 0) {
                    console.log('⚡ [Research] Using cached donors - instant load!');
                    setDonors(cached);
                    setExpandedId(cached[0].id);
                    setLoading(false);
                    return;
                }
                
                // 3. No data found - need to call AI
                console.log('🔍 [Research] No saved donors found, calling AI...');
                try {
                    const config = active.searchConfig || {};
                    console.log('📤 [Research] API request config:', config);
                    
                    const response = await fetch('/api/ai/donor-search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            organizationName: config.organizationName || config.campaignName || active.name,
                            mission: config.organizationMission || config.causeAreas?.join(', ') || '',
                            zipCode: config.zipCode || config.targetRegion || '',
                            focusAreas: config.causeAreas?.join(', ') || '',
                            donorCount: 50,
                        }),
                    });
                    const result = await response.json();
                    
                    console.log('📥 [Research] API response:', { success: result.success, donorCount: result.donors?.length });
                    if (result.success && result.donors && result.donors.length > 0) {
                        setDonors(result.donors);
                        setExpandedId(result.donors[0].id);
                        // Save to database for persistence
                        const userId = sessionStorage.getItem('userId');
                        saveAIDonorResults(active.id, result.donors, userId).catch(err => 
                            console.error('Failed to save to DB:', err)
                        );
                        // Also cache locally for fast reload
                        cacheDonorsForCampaign(active.id, result.donors);
                    } else {
                        console.log('⚠️ [Research] No donors returned, using mock data');
                        setDonors(MOCK_FOUNDATIONS);
                        if (MOCK_FOUNDATIONS.length > 0) setExpandedId(MOCK_FOUNDATIONS[0].id);
                    }
                } catch (error) {
                    console.error('❌ [Research] Error loading campaign donors:', error);
                    setDonors(MOCK_FOUNDATIONS);
                    if (MOCK_FOUNDATIONS.length > 0) setExpandedId(MOCK_FOUNDATIONS[0].id);
                }
                setLoading(false);
            };
            loadCampaignDonors();
        }
        // Otherwise, user starts fresh and must perform a search
    }, []);

    // When campaign changes, load that campaign's results
    const handleCampaignChange = async (newCampaignId) => {
        const campaign = getCampaignById(newCampaignId);
        if (campaign) {
            setCurrentCampaign(campaign);
            setCampaignName(campaign.name);
            setActiveCampaign(campaign.id);
            
            // Build pipeline and rejected sets from campaign data
            const pipelineSet = new Set();
            const rejectedSet = new Set();
            campaign.donors.forEach(d => {
                if (d.isRejected) {
                    rejectedSet.add(d.foundationId);
                } else {
                    pipelineSet.add(d.foundationId);
                }
            });
            setPipelineIds(pipelineSet);
            setRejectedIds(rejectedSet);
            
            // Check cache first for instant load
            const cached = getCachedDonors(newCampaignId);
            if (cached && cached.length > 0) {
                console.log('⚡ [Research] Switching campaign - using cache!');
                setDonors(cached);
                setExpandedId(cached[0].id);
                setHasSearched(true);
                return; // No loading needed
            }
            
            // No cache - fetch from AI API
            setLoading(true);
            try {
                const config = campaign.searchConfig || {};
                console.log('🔄 [Research] Switching campaign, calling AI...');
                
                const response = await fetch('/api/ai/donor-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        organizationName: config.organizationName || config.campaignName || campaign.name,
                        mission: config.organizationMission || config.causeAreas?.join(', ') || '',
                        zipCode: config.zipCode || config.targetRegion || '',
                        focusAreas: config.causeAreas?.join(', ') || '',
                        donorCount: 50,
                    }),
                });
                const result = await response.json();
                
                if (result.success && result.donors && result.donors.length > 0) {
                    setDonors(result.donors);
                    setExpandedId(result.donors[0].id);
                    // Cache for future visits
                    cacheDonorsForCampaign(newCampaignId, result.donors);
                } else {
                    setDonors(MOCK_FOUNDATIONS);
                    if (MOCK_FOUNDATIONS.length > 0) setExpandedId(MOCK_FOUNDATIONS[0].id);
                }
            } catch (error) {
                console.error('Error loading campaign donors:', error);
                setDonors(MOCK_FOUNDATIONS);
                if (MOCK_FOUNDATIONS.length > 0) setExpandedId(MOCK_FOUNDATIONS[0].id);
            }
            
            setHasSearched(true);
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        console.log('🚀 [Research] Starting search...');
        setLoading(true);
        
        // Create or get campaign
        let campaign = currentCampaign;
        if (!campaign || campaign.name !== campaignName) {
            console.log('📁 [Research] Creating new campaign:', campaignName);
            campaign = createCampaign(campaignName, { searchConfig });
            setCurrentCampaign(campaign);
            setActiveCampaign(campaign.id);
            setAvailableCampaigns(getCampaigns());
        }
        
        // Get organization context from localStorage
        let orgData = {};
        try {
            const stored = localStorage.getItem('organizationSettings');
            if (stored) orgData = JSON.parse(stored);
            console.log('🏢 [Research] Org settings loaded:', orgData.name || 'Not set');
        } catch (e) {}
        
        try {
            console.log('📤 [Research] Sending AI search request...');
            
            // Call AI-powered donor search
            const response = await fetch('/api/ai/donor-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationName: orgData.name || campaignName,
                    mission: orgData.mission || searchConfig?.organizationMission || searchQuery,
                    zipCode: searchConfig?.zipCode || '',
                    focusAreas: searchConfig?.causeAreas?.join(', ') || searchQuery,
                    donorCount: 50,
                }),
            });
            const result = await response.json();
            
            console.log('📥 [Research] Search response:', { 
                success: result.success, 
                donorCount: result.donors?.length 
            });
            
            if (result.success && result.donors && result.donors.length > 0) {
                console.log('✅ [Research] Setting', result.donors.length, 'donors');
                setDonors(result.donors);
                setExpandedId(result.donors[0].id);
            } else {
                console.log('⚠️ [Research] No results, using mock data');
                setDonors(MOCK_FOUNDATIONS);
                if (MOCK_FOUNDATIONS.length > 0) setExpandedId(MOCK_FOUNDATIONS[0].id);
            }
        } catch (error) {
            console.error('❌ [Research] AI search error:', error);
            setDonors(MOCK_FOUNDATIONS);
            if (MOCK_FOUNDATIONS.length > 0) setExpandedId(MOCK_FOUNDATIONS[0].id);
        }
        
        setHasSearched(true);
        
        // Reset pipeline/rejected for new search view
        const pipelineSet = new Set();
        const rejectedSet = new Set();
        campaign.donors.forEach(d => {
            if (d.isRejected) {
                rejectedSet.add(d.foundationId);
            } else {
                pipelineSet.add(d.foundationId);
            }
        });
        setPipelineIds(pipelineSet);
        setRejectedIds(rejectedSet);

        // Auto-expand first result
        if (donors.length > 0) {
            setExpandedId(donors[0]?.id);
        }
        
        setLoading(false);
    };

    const handleSearchConfig = async (config) => {
        console.log('========================================');
        console.log('📥 [Research] handleSearchConfig RECEIVED');
        console.log('========================================');
        console.log('📝 [Research] Config received:', JSON.stringify(config, null, 2));
        console.log('🔒 [Research] isSearchingRef:', isSearchingRef.current);
        console.log('🔒 [Research] lastSearchRef:', lastSearchRef.current);
        
        // Check daily search limit (5 per day)
        if (!canPerformSearch()) {
            const usage = getDailySearchUsage();
            console.log('⛔ [Research] BLOCKED - Daily search limit reached:', usage);
            alert(`You've reached your daily limit of 5 AI searches. Your searches reset at midnight. You have ${usage.remaining} searches remaining today.`);
            return;
        }
        
        // Prevent concurrent searches (but allow same campaign names)
        if (isSearchingRef.current) {
            console.log('⛔ [Research] BLOCKED - Search already in progress');
            return;
        }
        
        isSearchingRef.current = true;
        
        // Increment search count
        const searchResult = incrementSearchCount();
        console.log('🔢 [Research] Search count incremented, remaining:', searchResult.remaining);
        
        console.log('✅ [Research] Proceeding with search...');
        console.log('📊 [Research] Setting state: searchConfig, campaignName, searchQuery, loading=true, hasSearched=true');
        
        setSearchConfig(config);
        setCampaignName(config.campaignName);
        setSearchQuery(config.causeAreas.join(', ') || config.organizationMission?.slice(0, 50) || '');
        setLoading(true);
        setHasSearched(true);
        
        // Create new campaign with config
        console.log('📁 [Research] Creating campaign in localStorage:', config.campaignName);
        const campaign = createCampaign(config.campaignName, config);
        console.log('📁 [Research] Campaign created with ID:', campaign.id);
        setCurrentCampaign(campaign);
        setActiveCampaign(campaign.id);
        
        // Update available campaigns list
        const updatedCampaigns = getCampaigns();
        console.log('📋 [Research] Campaigns in localStorage:', updatedCampaigns.length, updatedCampaigns.map(c => c.name));
        setAvailableCampaigns(updatedCampaigns);
        
        try {
            // Use AI-powered donor search
            console.log('🤖 [Research] API REQUEST to /api/ai/donor-search');
            const apiParams = {
                organizationName: config.organizationName || config.campaignName,
                mission: config.organizationMission || config.causeAreas?.join(', ') || '',
                zipCode: config.zipCode || config.targetRegion || '',
                focusAreas: config.causeAreas?.join(', ') || '',
                donorCount: 50,
            };
            console.log('🤖 [Research] Params:', JSON.stringify(apiParams, null, 2));
            
            const startTime = Date.now();
            const response = await fetch('/api/ai/donor-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiParams),
            });
            const result = await response.json();
            const elapsed = Date.now() - startTime;
            
            console.log('🤖 [Research] API RESPONSE received in', elapsed, 'ms');
            console.log('🤖 [Research] Response status:', response.status);
            console.log('🤖 [Research] Success:', result.success);
            console.log('🤖 [Research] Donor count:', result.donors?.length);
            console.log('🤖 [Research] Error (if any):', result.error);
            console.log('🤖 [Research] Raw result keys:', Object.keys(result));
            
            if (result.success && result.donors && result.donors.length > 0) {
                console.log('✅ [Research] Setting', result.donors.length, 'AI-generated donors to state');
                console.log('✅ [Research] First donor:', result.donors[0]?.name);
                setDonors(result.donors);
                setExpandedId(result.donors[0].id);
                // Save to database for persistence across devices
                const userId = sessionStorage.getItem('userId');
                saveAIDonorResults(campaign.id, result.donors, userId).catch(err => 
                    console.error('💾 [Research] Failed to save to DB:', err)
                );
                // Also cache locally for fast reload
                cacheDonorsForCampaign(campaign.id, result.donors);
                console.log('💾 [Research] Cached donors for campaign:', campaign.id);
            } else {
                console.log('⚠️ [Research] No AI results, falling back to MOCK_FOUNDATIONS');
                console.log('⚠️ [Research] Mock count:', MOCK_FOUNDATIONS.length);
                setDonors(MOCK_FOUNDATIONS);
                if (MOCK_FOUNDATIONS.length > 0) {
                    setExpandedId(MOCK_FOUNDATIONS[0].id);
                }
            }
        } catch (error) {
            console.error('❌ [Research] AI Search ERROR:', error.message);
            console.error('❌ [Research] Full error:', error);
            // Fallback to mock data on error
            setDonors(MOCK_FOUNDATIONS);
            if (MOCK_FOUNDATIONS.length > 0) {
                setExpandedId(MOCK_FOUNDATIONS[0].id);
            }
        }
        
        setPipelineIds(new Set());
        setRejectedIds(new Set());
        setLoading(false);
        isSearchingRef.current = false; // Reset ref to allow new searches
        console.log('========================================');
        console.log('🏁 [Research] SEARCH COMPLETE');
        console.log('========================================');
    };

    const handleAddToPipeline = (donor) => {
        if (!currentCampaign) return;
        
        const isAlreadyInPipeline = pipelineIds.has(donor.id);

        if (isAlreadyInPipeline) {
            // Remove from campaign
            setPipelineIds(prev => {
                const next = new Set(prev);
                next.delete(donor.id);
                return next;
            });
            // Update campaign data - remove donor
            const updatedCampaign = { ...currentCampaign };
            updatedCampaign.donors = updatedCampaign.donors.filter(d => d.foundationId !== donor.id);
            setCurrentCampaign(updatedCampaign);
            
            // Persist to localStorage via mock data service
            const campaigns = getCampaigns();
            const idx = campaigns.findIndex(c => c.id === currentCampaign.id);
            if (idx >= 0) {
                campaigns[idx] = updatedCampaign;
                localStorage.setItem('campaigns', JSON.stringify(campaigns));
            }
        } else {
            // Add to campaign pipeline
            addDonorToCampaign(currentCampaign.id, donor.id, 'research');
            setPipelineIds(prev => new Set(prev).add(donor.id));
            
            // Remove from rejected if adding to pipeline
            if (rejectedIds.has(donor.id)) {
                setRejectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(donor.id);
                    return next;
                });
            }
            
            // Refresh campaign data
            const refreshed = getCampaignById(currentCampaign.id);
            if (refreshed) setCurrentCampaign(refreshed);
        }
    };

    const handleReject = (donor) => {
        if (!currentCampaign) return;
        
        const isAlreadyRejected = rejectedIds.has(donor.id);

        if (isAlreadyRejected) {
            // Un-reject - add back to pipeline
            rejectDonorInCampaign(currentCampaign.id, donor.id);
            setRejectedIds(prev => {
                const next = new Set(prev);
                next.delete(donor.id);
                return next;
            });
        } else {
            // Reject donor
            rejectDonorInCampaign(currentCampaign.id, donor.id);
            setRejectedIds(prev => new Set(prev).add(donor.id));

            // Remove from pipeline if rejecting
            if (pipelineIds.has(donor.id)) {
                setPipelineIds(prev => {
                    const next = new Set(prev);
                    next.delete(donor.id);
                    return next;
                });
            }
            
            // Refresh campaign data
            const refreshed = getCampaignById(currentCampaign.id);
            if (refreshed) setCurrentCampaign(refreshed);
        }
    };

    const filteredDonors = donors.filter(d => {
        // Text search
        if (searchQuery) {
            const term = searchQuery.toLowerCase();
            const match = d.name?.toLowerCase().includes(term) ||
                d.focus_areas?.toLowerCase().includes(term) ||
                d.description?.toLowerCase().includes(term);
            if (!match) return false;
        }

        // Status filter from metric cards
        if (statusFilter === 'not-qualified') {
            return rejectedIds.has(d.id);
        } else if (statusFilter === 'high-priority') {
            return (d.alignment_score || 0) >= 90 && !rejectedIds.has(d.id);
        } else if (statusFilter === 'qualified') {
            return pipelineIds.has(d.id);
        }
        // 'all' shows everything
        return true;
    });

    // Sort: active donors by score, then pipeline items, then rejected at the very end
    const sortedDonors = [...filteredDonors].sort((a, b) => {
        const aInPipeline = pipelineIds.has(a.id);
        const bInPipeline = pipelineIds.has(b.id);
        const aRejected = rejectedIds.has(a.id);
        const bRejected = rejectedIds.has(b.id);

        // Rejected go last
        if (aRejected && !bRejected) return 1;
        if (!aRejected && bRejected) return -1;

        // Pipeline items go after active, before rejected
        if (aInPipeline && !bInPipeline) return 1;
        if (!aInPipeline && bInPipeline) return -1;

        // Otherwise sort by score
        return (b.alignment_score || 0) - (a.alignment_score || 0);
    });

    return (
        <div style={{ padding: '0' }}>
            {/* Search Section - Before Search */}
            {!hasSearched ? (
                <div style={{
                    minHeight: 'calc(100vh - 0px)',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
                    padding: '48px 40px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Decorative Elements */}
                    <div style={{
                        position: 'absolute',
                        top: '-20%',
                        right: '-10%',
                        width: '600px',
                        height: '600px',
                        background: 'radial-gradient(circle, rgba(201, 162, 39, 0.08) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: '-30%',
                        left: '-10%',
                        width: '500px',
                        height: '500px',
                        background: 'radial-gradient(circle, rgba(27, 54, 93, 0.06) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }} />

                    {/* Hero Section */}
                    <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
                        {/* Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.15) 0%, rgba(201, 162, 39, 0.05) 100%)',
                            border: '1px solid rgba(201, 162, 39, 0.2)',
                            borderRadius: '100px',
                            marginBottom: '24px',
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#C9A227">
                                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                            </svg>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400E' }}>AI-Powered Discovery</span>
                        </div>

                        {/* Title */}
                        <h1 style={{
                            fontSize: '2.75rem',
                            fontWeight: 800,
                            color: '#0F1729',
                            margin: '0 0 16px',
                            lineHeight: 1.1,
                            letterSpacing: '-0.02em',
                        }}>
                            Find Your Perfect
                            <span style={{
                                display: 'block',
                                background: 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>Funding Match</span>
                        </h1>

                        <p style={{
                            fontSize: '1.125rem',
                            color: '#64748b',
                            margin: '0 0 40px',
                            maxWidth: '600px',
                            lineHeight: 1.6,
                        }}>
                            Our AI analyzes over <strong style={{ color: '#1e293b' }}>2 million foundation profiles</strong> to identify
                            the highest-potential donors for your mission.
                        </p>

                        {/* Premium Search Bar */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '8px',
                            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
                            border: '1px solid rgba(0, 0, 0, 0.04)',
                            marginBottom: '32px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {/* Campaign Selector */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '14px 18px',
                                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                    borderRadius: '10px',
                                    minWidth: '220px',
                                }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={campaignName}
                                        onChange={(e) => setCampaignName(e.target.value)}
                                        placeholder="Enter campaign name..."
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            fontSize: '0.9375rem',
                                            fontWeight: 600,
                                            color: '#1e293b',
                                            cursor: 'text',
                                            outline: 'none',
                                            flex: 1,
                                            width: '100%',
                                        }}
                                    />
                                </div>

                                {/* Divider */}
                                <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }} />

                                {/* Search Input */}
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.35-4.35" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && setIsModalOpen(true)}
                                        placeholder="Search by mission, focus area, or foundation name..."
                                        style={{
                                            flex: 1,
                                            border: 'none',
                                            fontSize: '0.9375rem',
                                            color: '#1e293b',
                                            outline: 'none',
                                            background: 'transparent',
                                        }}
                                    />
                                </div>

                                {/* Search Button */}
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    disabled={loading}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '14px 28px',
                                        background: 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: 'white',
                                        fontSize: '0.9375rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(201, 162, 39, 0.3)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                                    </svg>
                                    Search
                                </button>
                            </div>
                        </div>

                        {/* Suggested Keywords */}
                        <div style={{ marginBottom: '40px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px',
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4M12 8h.01" />
                                </svg>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Suggested Keywords
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {['Education Reform', 'Climate Action', 'Youth Development', 'Tech Equity', 'Healthcare Access', 'Arts & Culture'].map((keyword, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSearchQuery(keyword)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '10px 16px',
                                            background: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            color: '#475569',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.borderColor = '#C9A227';
                                            e.currentTarget.style.color = '#C9A227';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.borderColor = '#e2e8f0';
                                            e.currentTarget.style.color = '#475569';
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                        {keyword}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recent Campaigns */}
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
                            padding: '24px',
                            marginBottom: '40px',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '20px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Recent Campaigns</h3>
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Continue where you left off</p>
                                    </div>
                                </div>
                                <button style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    background: 'transparent',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    fontSize: '0.8125rem',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                }}>
                                    View All
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>
                            </div>

                            {/* Campaign Table */}
                            <div style={{ overflow: 'hidden', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campaign</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prospects</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qualified</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Activity</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                            <th style={{ padding: '12px 16px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {availableCampaigns.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                                                    No campaigns yet. Start a new search to create your first campaign.
                                                </td>
                                            </tr>
                                        ) : availableCampaigns.slice(0, 5).map((campaign) => (
                                            <tr key={campaign.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            background: campaign.status === 'active' ? '#22C55E' : '#94a3b8',
                                                        }} />
                                                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{campaign.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '0.875rem', color: '#64748b' }}>{campaign.cachedDonors?.length || campaign.donors?.length || 0}</td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        background: '#FEF3C7',
                                                        color: '#92400E',
                                                        fontSize: '0.8125rem',
                                                        fontWeight: 600,
                                                        borderRadius: '6px',
                                                    }}>{campaign.donors?.filter(d => d.stage !== 'research' && !d.isRejected).length || 0}</span>
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '0.8125rem', color: '#94a3b8' }}>
                                                    {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'Recently'}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        background: campaign.status === 'active' ? '#DCFCE7' : '#f1f5f9',
                                                        color: campaign.status === 'active' ? '#166534' : '#64748b',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        borderRadius: '100px',
                                                        textTransform: 'capitalize',
                                                    }}>{campaign.status || 'active'}</span>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <button
                                                        onClick={() => {
                                                            handleCampaignChange(campaign.id);
                                                        }}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '0.8125rem',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        Continue →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Feature Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                            {[
                                {
                                    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" /></svg>,
                                    title: 'Smart Matching',
                                    description: 'AI-powered alignment scoring based on mission and funding history',
                                    color: '#C9A227',
                                    bg: 'linear-gradient(135deg, rgba(201, 162, 39, 0.1) 0%, rgba(201, 162, 39, 0.02) 100%)',
                                },
                                {
                                    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
                                    title: 'Trend Analysis',
                                    description: 'Track funding patterns and identify emerging opportunities',
                                    color: '#7C3AED',
                                    bg: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.02) 100%)',
                                },
                                {
                                    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4" /><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>,
                                    title: 'Verified Data',
                                    description: 'Up-to-date 990-PF filings and organizational intelligence',
                                    color: '#059669',
                                    bg: 'linear-gradient(135deg, rgba(5, 150, 105, 0.1) 0%, rgba(5, 150, 105, 0.02) 100%)',
                                },
                            ].map((feature, i) => (
                                <div key={i} style={{
                                    background: 'white',
                                    borderRadius: '14px',
                                    padding: '24px',
                                    border: '1px solid rgba(0, 0, 0, 0.06)',
                                    transition: 'all 0.2s',
                                }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: feature.bg,
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: feature.color,
                                        marginBottom: '16px',
                                    }}>
                                        {feature.icon}
                                    </div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>{feature.title}</h4>
                                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* Results View */
                <div style={{ padding: '24px 32px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>
                            {currentCampaign?.name || 'New Campaign Research'}
                        </h1>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 16px',
                                border: 'none',
                                borderRadius: '8px',
                                background: '#1B365D',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'white',
                                cursor: 'pointer',
                            }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            New Strategy
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: '16px', marginBottom: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Campaign Name
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={currentCampaign?.id || ''}
                                    onChange={(e) => handleCampaignChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 36px 12px 14px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        color: '#1e293b',
                                        backgroundColor: 'white',
                                        boxSizing: 'border-box',
                                        appearance: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {availableCampaigns.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                                >
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Search Donors
                            </label>
                            <div style={{ position: 'relative' }}>
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
                                    placeholder="Search by name, location, or keyword..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
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
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                Filter View
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={regionFilter}
                                    onChange={(e) => setRegionFilter(e.target.value)}
                                    style={{
                                        width: '160px',
                                        padding: '12px 36px 12px 14px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        color: '#1e293b',
                                        appearance: 'none',
                                        backgroundColor: 'white',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <option>All Regions</option>
                                    <option>Pacific Northwest</option>
                                    <option>Northeast</option>
                                    <option>Southeast</option>
                                </select>
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                                >
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Bar - Premium Clickable Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        {[
                            {
                                key: 'all',
                                label: 'Total Prospects',
                                value: donors.length,
                                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
                                bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                                iconBg: '#e2e8f0',
                                iconColor: '#475569',
                                activeBg: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                            },
                            {
                                key: 'not-qualified',
                                label: 'Not Qualified',
                                value: rejectedIds.size,
                                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>,
                                bg: 'white',
                                iconBg: '#FEE2E2',
                                iconColor: '#EF4444',
                                activeBg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                            },
                            {
                                key: 'high-priority',
                                label: 'High Priority',
                                value: donors.filter(d => (d.alignment_score || 0) >= 90 && !rejectedIds.has(d.id)).length,
                                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>,
                                bg: 'white',
                                iconBg: '#DBEAFE',
                                iconColor: '#3B82F6',
                                activeBg: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                            },
                            {
                                key: 'qualified',
                                label: 'Qualified',
                                value: pipelineIds.size,
                                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>,
                                bg: 'white',
                                iconBg: '#FEF3C7',
                                iconColor: '#C9A227',
                                activeBg: 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)',
                            },
                        ].map(metric => {
                            const isActive = statusFilter === metric.key;
                            return (
                                <button
                                    key={metric.key}
                                    onClick={() => setStatusFilter(isActive ? 'all' : metric.key)}
                                    style={{
                                        background: isActive ? metric.activeBg : metric.bg,
                                        borderRadius: '14px',
                                        border: isActive ? 'none' : '1px solid #e2e8f0',
                                        padding: '18px 20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isActive ? '0 8px 24px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                                        transform: isActive ? 'translateY(-2px)' : 'none',
                                    }}
                                >
                                    <div style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : metric.iconBg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isActive ? 'white' : metric.iconColor,
                                    }}>
                                        {metric.icon}
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{
                                            fontSize: '1.75rem',
                                            fontWeight: 700,
                                            color: isActive ? 'white' : '#1B365D',
                                            lineHeight: 1,
                                        }}>{metric.value}</div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: isActive ? 'rgba(255, 255, 255, 0.8)' : '#94a3b8',
                                            marginTop: '4px',
                                            fontWeight: 500,
                                        }}>{metric.label}</div>
                                    </div>
                                    {isActive && (
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

                    {/* Results Count & Sort */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                        padding: '16px 20px',
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                                    <path d="M3 6h18M7 12h10M10 18h4" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>
                                    {sortedDonors.length} {statusFilter === 'all' ? 'Organizations' :
                                        statusFilter === 'not-qualified' ? 'Not Qualified' :
                                            statusFilter === 'high-priority' ? 'High Priority Matches' :
                                                'Qualified Prospects'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    {statusFilter !== 'all' ? (
                                        <span>
                                            Filtering from {donors.length} total •
                                            <button
                                                onClick={() => setStatusFilter('all')}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#3B82F6',
                                                    cursor: 'pointer',
                                                    padding: '0 4px',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Clear filter
                                            </button>
                                        </span>
                                    ) : 'Based on your search criteria'}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: '#64748b' }}>
                                <span>Sort:</span>
                                <button style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 12px',
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: '#1e293b',
                                }}>
                                    Match Score
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                                Loading results...
                            </div>
                        ) : (
                            sortedDonors.map(donor => (
                                <DonorCard
                                    key={donor.id}
                                    donor={donor}
                                    isExpanded={expandedId === donor.id}
                                    onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                                    onAddToPipeline={handleAddToPipeline}
                                    isInPipeline={pipelineIds.has(donor.id)}
                                    onReject={handleReject}
                                    isRejected={rejectedIds.has(donor.id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Search Configuration Modal */}
            <SearchConfigModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSubmit={handleSearchConfig}
            />

            {/* Floating Pipeline Action Bar - only show after search with results */}
            {hasSearched && pipelineIds.size > 0 && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(27, 54, 93, 0.4), 0 4px 16px rgba(0,0,0,0.2)',
                    zIndex: 40,
                    animation: 'slideUp 0.3s ease-out',
                }}>
                    {/* Pipeline Count Badge */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: '#C9A227',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.125rem',
                            color: 'white',
                        }}>
                            {pipelineIds.size}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>
                                Qualified {pipelineIds.size === 1 ? 'Lead' : 'Leads'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                                in your pipeline
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '32px', backgroundColor: 'rgba(255,255,255,0.2)' }} />

                    {/* Map Connections Button */}
                    <button
                        onClick={() => {
                            router.push('/dashboard/network');
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#C9A227',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="5" cy="6" r="3" />
                            <circle cx="19" cy="6" r="3" />
                            <circle cx="12" cy="18" r="3" />
                            <path d="M5 9v3a4 4 0 004 4h2M19 9v3a4 4 0 01-4 4h-2" />
                        </svg>
                        Map Connections
                    </button>

                    {/* View Pipeline Link */}
                    <a
                        href="/dashboard/pipeline"
                        style={{
                            fontSize: '0.8125rem',
                            color: 'rgba(255,255,255,0.8)',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        View Pipeline
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>
            )}

            <style jsx global>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
