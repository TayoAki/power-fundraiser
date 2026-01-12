'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    getActiveCampaign,
    getCampaigns,
    getCampaignById,
    getCampaignDonorsWithDetails,
    moveDonorToStage,
    getNextStage as getNextStageFromLib,
    PIPELINE_STAGES,
    setActiveCampaign,
    MOCK_FOUNDATIONS,
    MOCK_CONTACTS,
} from '@/lib/mockData';

function formatCurrency(amount) {
    if (!amount) return '$0';
    if (amount >= 1000000000) return '$' + (amount / 1000000000).toFixed(1) + 'B';
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
    return '$' + amount.toLocaleString();
}

export default function PipelinePage() {
    const [isHydrated, setIsHydrated] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [campaignFilter, setCampaignFilter] = useState('all');
    const [viewMode, setViewMode] = useState('card');
    const [currentCampaign, setCurrentCampaign] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [pipelineData, setPipelineData] = useState([]);
    const [toast, setToast] = useState({ show: false, message: '' });
    const [stageFilter, setStageFilter] = useState(null);
    
    // Email modal state
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    
    const router = useRouter();

    useEffect(() => {
        const allCampaigns = getCampaigns();
        setCampaigns(allCampaigns);
        
        const active = getActiveCampaign();
        if (active) {
            setCurrentCampaign(active);
            loadPipelineData(active.id);
        } else {
            // Load mock data directly when no campaigns exist
            loadMockFoundationsData();
        }
        setIsHydrated(true);
    }, []);

    const loadMockFoundationsData = () => {
        // Assign mock stages to foundations for demo purposes (no stewardship)
        const stageAssignments = ['research', 'research', 'research', 'qualified', 'qualified', 'qualified', 'cultivating', 'cultivating', 'negotiations', 'negotiations', 'funded', 'funded'];
        
        // Funding amounts in thousands
        const fundingAmounts = [500, 250, 100, 150, 75, 200, 50, 300, 125, 80, 175, 225];
        
        const pipelineDonors = MOCK_FOUNDATIONS.map((foundation, index) => {
            const contacts = MOCK_CONTACTS.filter(c => c.foundationId === foundation.id);
            const stage = stageAssignments[index % stageAssignments.length];
            const fundingAmount = fundingAmounts[index % fundingAmounts.length] * 1000; // Convert to actual dollars
            
            return {
                id: foundation.id,
                name: foundation.name,
                initials: foundation.name.split(' ').map(w => w[0]).join('').slice(0, 2),
                stage: stage,
                fundingAmount: fundingAmount,
                lastActivity: getRandomActivity(),
                location: `${foundation.city}, ${foundation.state}`,
                focus: foundation.focus_areas?.split(',')[0]?.trim() || 'General',
                networkScore: contacts.some(c => c.connectionDegree === '1st') ? 85 : contacts.some(c => c.connectionDegree === '2nd') ? 65 : 45,
                missionScore: foundation.alignment_score || 75,
                financialScore: foundation.total_assets > 5000000000 ? 'High' : foundation.total_assets > 1000000000 ? 'Medium' : 'Low',
                aiRecommendation: foundation.ai_insights?.approachStrategy || 'Continue building the relationship through regular touchpoints.',
                recommendedAmount: foundation.funding_range || '$50K - $100K',
                totalAssets: foundation.total_assets,
                recentActivity: generateRecentActivity(foundation, stage),
                foundation: foundation,
                contacts: contacts,
            };
        });
        
        setPipelineData(pipelineDonors);
    };

    const getRandomActivity = () => {
        const activities = [
            'Email sent to program officer',
            'Meeting scheduled for next week',
            'Proposal draft reviewed',
            'Follow-up call completed',
            'Site visit confirmed',
            'Grant application submitted',
            'LOI under review',
            'Board presentation scheduled',
        ];
        const daysAgo = Math.floor(Math.random() * 14) + 1;
        return `${activities[Math.floor(Math.random() * activities.length)]} • ${daysAgo}d ago`;
    };

    const generateRecentActivity = (foundation, stage) => {
        const activities = [];
        if (stage === 'funded' || stage === 'stewardship') {
            activities.push({ date: '2 weeks ago', text: 'Grant awarded - $250,000 over 2 years', sentiment: 'Positive' });
            activities.push({ date: '1 month ago', text: 'Final proposal submitted', sentiment: 'Positive' });
        } else if (stage === 'negotiations') {
            activities.push({ date: '3 days ago', text: 'Budget negotiations in progress', sentiment: 'Neutral' });
            activities.push({ date: '1 week ago', text: 'Site visit completed successfully', sentiment: 'Positive' });
        } else if (stage === 'cultivating') {
            activities.push({ date: '5 days ago', text: `Meeting with ${foundation.principal_officer || 'program officer'}`, sentiment: 'Positive' });
            activities.push({ date: '2 weeks ago', text: 'LOI submitted and acknowledged', sentiment: 'Positive' });
        } else if (stage === 'qualified') {
            activities.push({ date: '1 week ago', text: 'Initial outreach email sent', sentiment: 'Neutral' });
            activities.push({ date: '2 weeks ago', text: 'Added to qualified prospects', sentiment: 'Positive' });
        } else {
            activities.push({ date: 'Recently', text: 'Research completed - strong alignment identified', sentiment: 'Positive' });
        }
        return activities;
    };

    const loadPipelineData = (campaignId) => {
        // First try to load from cachedDonors (AI-generated)
        const campaign = getCampaignById(campaignId);
        if (campaign?.cachedDonors && campaign.cachedDonors.length > 0) {
            const fundingAmounts = [500, 250, 100, 150, 75, 200, 50, 300, 125, 80, 175, 225];
            const pipelineDonors = campaign.cachedDonors.map((donor, index) => ({
                id: donor.id,
                name: donor.name,
                initials: donor.name.split(' ').map(w => w[0]).join('').slice(0, 2),
                stage: 'research',
                fundingAmount: fundingAmounts[index % fundingAmounts.length] * 1000,
                lastActivity: 'Recently added',
                location: donor.location || 'Unknown',
                focus: donor.focus_areas?.split(',')[0]?.trim() || 'General',
                networkScore: 45,
                missionScore: donor.alignment_score || 75,
                financialScore: donor.total_assets > 5000000000 ? 'High' : donor.total_assets > 1000000000 ? 'Medium' : 'Low',
                aiRecommendation: donor.description || 'Continue building the relationship through regular touchpoints.',
                recommendedAmount: donor.funding_range || '$50K - $100K',
                totalAssets: donor.total_assets,
                recentActivity: generateRecentActivity(donor, 'research'),
                foundation: donor,
                contacts: [],
            }));
            setPipelineData(pipelineDonors);
            return;
        }
        
        // Fall back to getCampaignDonorsWithDetails
        const donorsWithDetails = getCampaignDonorsWithDetails(campaignId);
        
        // If campaign has no donors, fall back to mock data
        if (!donorsWithDetails || donorsWithDetails.length === 0) {
            loadMockFoundationsData();
            return;
        }
        
        // Funding amounts based on foundation index
        const fundingAmounts = [500, 250, 100, 150, 75, 200, 50, 300, 125, 80, 175, 225];
        
        // Transform to pipeline format
        const pipelineDonors = donorsWithDetails
            .filter(d => !d.isRejected && d.foundation)
            .map((d, index) => {
                const contacts = MOCK_CONTACTS.filter(c => c.foundationId === d.foundationId);
                const fundingAmount = fundingAmounts[index % fundingAmounts.length] * 1000;
                return {
                    id: d.foundationId,
                    name: d.foundation.name,
                    initials: d.foundation.name.split(' ').map(w => w[0]).join('').slice(0, 2),
                    stage: d.stage || 'research',
                    fundingAmount: fundingAmount,
                    lastActivity: d.addedAt ? `Added ${new Date(d.addedAt).toLocaleDateString()}` : 'Recently added',
                    location: `${d.foundation.city}, ${d.foundation.state}`,
                    focus: d.foundation.focus_areas?.split(',')[0]?.trim() || 'General',
                    networkScore: contacts.some(c => c.connectionDegree === '1st') ? 85 : contacts.some(c => c.connectionDegree === '2nd') ? 65 : 45,
                    missionScore: d.alignmentScore || d.foundation.alignment_score || 75,
                    financialScore: d.foundation.total_assets > 5000000000 ? 'High' : d.foundation.total_assets > 1000000000 ? 'Medium' : 'Low',
                    aiRecommendation: d.foundation.ai_insights?.approachStrategy || 'Continue building the relationship through regular touchpoints.',
                    recommendedAmount: d.foundation.funding_range || '$50K - $100K',
                    totalAssets: d.foundation.total_assets,
                    recentActivity: generateRecentActivity(d.foundation, d.stage || 'research'),
                    foundation: d.foundation,
                    contacts: contacts,
                };
            });
        
        setPipelineData(pipelineDonors);
    };

    const handleCampaignChange = (campaignId) => {
        if (campaignId === 'all') {
            setCampaignFilter('all');
            // Load all campaigns' cachedDonors first
            const allDonors = [];
            const fundingAmounts = [500, 250, 100, 150, 75, 200, 50, 300, 125, 80, 175, 225];
            
            campaigns.forEach(c => {
                if (c.cachedDonors && c.cachedDonors.length > 0) {
                    c.cachedDonors.forEach((donor, index) => {
                        allDonors.push({
                            id: donor.id,
                            name: donor.name,
                            initials: donor.name.split(' ').map(w => w[0]).join('').slice(0, 2),
                            stage: 'research',
                            fundingAmount: fundingAmounts[index % fundingAmounts.length] * 1000,
                            lastActivity: 'Recently added',
                            location: donor.location || 'Unknown',
                            focus: donor.focus_areas?.split(',')[0]?.trim() || 'General',
                            networkScore: 45,
                            missionScore: donor.alignment_score || 75,
                            financialScore: donor.total_assets > 5000000000 ? 'High' : donor.total_assets > 1000000000 ? 'Medium' : 'Low',
                            aiRecommendation: donor.description || 'Continue building the relationship.',
                            recommendedAmount: donor.funding_range || '$50K - $100K',
                            totalAssets: donor.total_assets,
                            recentActivity: generateRecentActivity(donor, 'research'),
                            foundation: donor,
                            contacts: [],
                        });
                    });
                }
            });
            
            // Fall back to mock data if no donors exist
            if (allDonors.length === 0) {
                loadMockFoundationsData();
                return;
            }
            
            setPipelineData(allDonors);
        } else {
            const campaign = getCampaignById(campaignId);
            if (campaign) {
                setCurrentCampaign(campaign);
                setCampaignFilter(campaignId);
                setActiveCampaign(campaignId);
                loadPipelineData(campaignId);
            }
        }
    };

    // Filter stages to exclude stewardship and rename for display
    const DISPLAY_STAGES = PIPELINE_STAGES
        .filter(s => s.id !== 'stewardship')
        .map(s => s.id === 'negotiations' ? { ...s, name: 'Proposal' } : s);

    // Get display name for a stage
    const getStageName = (stageId) => {
        if (stageId === 'negotiations') return 'Proposal';
        return stageId.charAt(0).toUpperCase() + stageId.slice(1);
    };

    // Calculate stage counts from actual data (excluding stewardship)
    const stageCounts = DISPLAY_STAGES.reduce((acc, stage) => {
        acc[stage.id] = pipelineData.filter(d => d.stage === stage.id).length;
        return acc;
    }, {});

    const stages = DISPLAY_STAGES.map(s => ({
        ...s,
        count: stageCounts[s.id] || 0,
    }));

    // Find max count for scaling bars
    const maxCount = Math.max(...stages.map(s => s.count), 1);

    const totalDonors = pipelineData.length;
    const totalValue = pipelineData.reduce((sum, d) => sum + (d.fundingAmount || 0), 0);

    // Format funding amount for display
    const formatFundingAmount = (amount) => {
        if (!amount) return '$0';
        if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
        if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
        return '$' + amount.toLocaleString();
    };

    const showToast = (message) => {
        setToast({ show: true, message });
        setTimeout(() => setToast({ show: false, message: '' }), 3000);
    };

    // Handle Send Email - opens modal with recipient selection
    const handleSendEmail = () => {
        if (!selectedOrg) return;
        // Pre-select first contact if available
        if (selectedOrg.contacts && selectedOrg.contacts.length > 0) {
            setSelectedRecipient(selectedOrg.contacts[0]);
        } else {
            setSelectedRecipient(null);
        }
        setEmailSubject(`Follow-up: ${selectedOrg.name}`);
        setEmailBody('');
        setShowEmailModal(true);
    };

    // Handle Send Proposal - navigates to proposal page with donor pre-selected
    const handleSendProposal = () => {
        if (!selectedOrg) return;
        // Store selected donor info in sessionStorage for proposal page to pick up
        sessionStorage.setItem('proposalDonor', JSON.stringify({
            foundationId: selectedOrg.id,
            foundationName: selectedOrg.name,
            foundation: selectedOrg.foundation,
        }));
        router.push('/dashboard/proposal');
    };

    // Handle email send from modal
    const handleEmailSend = () => {
        if (!selectedRecipient) {
            showToast('Please select a recipient');
            return;
        }
        showToast(`Email sent to ${selectedRecipient.name}`);
        setShowEmailModal(false);
        setSelectedRecipient(null);
        setEmailSubject('');
        setEmailBody('');
    };

    const handleMoveToNextStage = (donorId) => {
        const donor = pipelineData.find(d => d.id === donorId);
        if (!donor || !currentCampaign) return;
        
        const nextStage = getNextStageFromLib(donor.stage);
        if (nextStage) {
            moveDonorToStage(currentCampaign.id, donorId, nextStage);
            showToast(`${donor.name} moved to ${nextStage.charAt(0).toUpperCase() + nextStage.slice(1)}`);
            
            // Reload pipeline data
            loadPipelineData(currentCampaign.id);
            
            // Update selected org if needed
            if (selectedOrg?.id === donorId) {
                setSelectedOrg({ ...selectedOrg, stage: nextStage });
            }
        }
    };

    const getNextStage = (currentStage) => {
        return getNextStageFromLib(currentStage);
    };

    // Handle promote in list view (works without campaign for mock data)
    const handlePromoteInList = (donor) => {
        const nextStage = getNextStage(donor.stage);
        if (!nextStage || nextStage === 'stewardship') return;
        
        // Update local state directly for demo
        setPipelineData(prev => prev.map(d => 
            d.id === donor.id ? { ...d, stage: nextStage } : d
        ));
        
        // Also update via campaign if exists
        if (currentCampaign) {
            moveDonorToStage(currentCampaign.id, donor.id, nextStage);
        }
        
        showToast(`${donor.name} promoted to ${getStageName(nextStage)}`);
    };

    const getHealthColor = (score) => {
        if (score >= 80) return '#22C55E';
        if (score >= 60) return '#C9A227';
        if (score >= 40) return '#F59E0B';
        return '#EF4444';
    };

    const getStageColor = (stage) => {
        const colors = {
            research: '#94a3b8',
            qualified: '#3B82F6',
            cultivating: '#8B5CF6',
            negotiations: '#C9A227',
            funded: '#22C55E',
        };
        return colors[stage] || '#94a3b8';
    };

    // Get filtered pipeline data based on stage filter
    const filteredPipelineData = stageFilter
        ? pipelineData.filter(d => d.stage === stageFilter)
        : pipelineData;

    if (!isHydrated) {
        return <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#64748b' }}>Loading...</div>;
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
            {/* Main Content */}
            <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', margin: '0 0 4px 0' }}>Pipeline Management</h1>
                    <p style={{ color: '#64748b', margin: 0 }}>Track progress and accelerate donor relationships</p>
                </div>

                {/* Stats Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Total Value:</span>
                            <span style={{ fontSize: '2rem', fontWeight: 700, color: '#1B365D' }}>{formatFundingAmount(totalValue)}</span>
                            <span style={{ padding: '4px 10px', background: '#D1FAE5', color: '#059669', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>+12%</span>
                        </div>
                        
                        {/* Campaign Filter */}
                        <select
                            value={campaignFilter}
                            onChange={(e) => handleCampaignChange(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                background: 'white',
                                fontSize: '0.875rem',
                                color: '#1e293b',
                                cursor: 'pointer',
                                minWidth: '180px',
                            }}
                        >
                            <option value="all">All Campaigns</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* View Toggle */}
                    <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                        <button
                            onClick={() => setViewMode('card')}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                background: viewMode === 'card' ? 'white' : 'transparent',
                                boxShadow: viewMode === 'card' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: viewMode === 'card' ? '#1e293b' : '#64748b',
                                cursor: 'pointer',
                            }}
                        >
                            ▦ Card
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                background: viewMode === 'list' ? 'white' : 'transparent',
                                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: viewMode === 'list' ? '#1e293b' : '#64748b',
                                cursor: 'pointer',
                            }}
                        >
                            ≡ List
                        </button>
                    </div>
                </div>

                {/* Pipeline Stages Bar */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Pipeline Stages</h3>
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{totalDonors} TOTAL DONORS</span>
                    </div>

                    {/* Stage Funnel - Clickable for filtering */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', gap: '24px' }}>
                        {stages.map((stage, i) => (
                            <div
                                key={stage.id}
                                onClick={() => setStageFilter(stageFilter === stage.id ? null : stage.id)}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    opacity: stageFilter && stageFilter !== stage.id ? 0.4 : 1,
                                    transition: 'opacity 0.2s',
                                }}
                            >
                                <div style={{
                                    width: '100%',
                                    height: `${Math.max(20, (stage.count / maxCount) * 80)}px`,
                                    background: `linear-gradient(180deg, ${getStageColor(stage.id)} 0%, ${getStageColor(stage.id)}99 100%)`,
                                    borderRadius: '8px 8px 0 0',
                                    marginBottom: '8px',
                                    border: stageFilter === stage.id ? '2px solid #1B365D' : 'none',
                                    boxSizing: 'border-box',
                                }} />
                                <div style={{ fontSize: '0.8125rem', color: stageFilter === stage.id ? '#1B365D' : '#1e293b', fontWeight: stageFilter === stage.id ? 700 : 500 }}>{stage.name}</div>
                                <div style={{ fontSize: '0.75rem', color: stageFilter === stage.id ? '#1B365D' : '#94a3b8', fontWeight: stageFilter === stage.id ? 600 : 400 }}>{stage.count}</div>
                            </div>
                        ))}
                    </div>
                    {stageFilter && (
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Filtering by:</span>
                            <span style={{ padding: '4px 12px', background: `${getStageColor(stageFilter)}22`, color: getStageColor(stageFilter), borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600 }}>
                                {stageFilter.charAt(0).toUpperCase() + stageFilter.slice(1)}
                            </span>
                            <button
                                onClick={() => setStageFilter(null)}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem', padding: '4px' }}
                            >
                                ✕ Clear
                            </button>
                        </div>
                    )}
                </div>

                {/* Donors Grid/List */}
                {viewMode === 'card' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        {filteredPipelineData.map(donor => (
                            <div
                                key={donor.id}
                                onClick={() => setSelectedOrg(donor)}
                                style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: selectedOrg?.id === donor.id ? '2px solid #C9A227' : '1px solid #e2e8f0',
                                    padding: '20px',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                                            {donor.initials}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{donor.name}</div>
                                            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                                Stage: <span style={{ color: getStageColor(donor.stage), fontWeight: 500 }}>{getStageName(donor.stage)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 700, color: '#1B365D', fontSize: '1rem' }}>
                                            {formatFundingAmount(donor.fundingAmount)}
                                        </span>
                                        {getNextStage(donor.stage) && getNextStage(donor.stage) !== 'stewardship' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handlePromoteInList(donor); }}
                                                title={`Promote to ${getStageName(getNextStage(donor.stage))}`}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    background: '#C9A227',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Activity</div>
                                        <div style={{ fontSize: '0.8125rem', color: '#1e293b' }}>{donor.lastActivity}</div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {donor.location}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* List View */
                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Donor</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Stage</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Amount</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Last Activity</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Promote</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPipelineData.map(donor => (
                                    <tr
                                        key={donor.id}
                                        onClick={() => setSelectedOrg(donor)}
                                        style={{ borderTop: '1px solid #e2e8f0', cursor: 'pointer', background: selectedOrg?.id === donor.id ? '#FFFBEB' : 'white' }}
                                    >
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>
                                                    {donor.initials}
                                                </div>
                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{donor.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: `${getStageColor(donor.stage)}22`, color: getStageColor(donor.stage) }}>
                                                {getStageName(donor.stage)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1B365D' }}>
                                                {formatFundingAmount(donor.fundingAmount)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', fontSize: '0.8125rem', color: '#64748b' }}>{donor.lastActivity}</td>
                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                            {getNextStage(donor.stage) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePromoteInList(donor); }}
                                                    title={`Promote to ${getStageName(getNextStage(donor.stage))}`}
                                                    style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        background: '#C9A227',
                                                        color: 'white',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'transform 0.2s',
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Side Panel */}
            {selectedOrg && (
                <div style={{
                    width: '380px',
                    background: 'white',
                    borderLeft: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    boxShadow: '-4px 0 20px rgba(0,0,0,0.05)',
                }}>
                    {/* Panel Header */}
                    <div style={{ padding: '24px', background: '#1B365D', color: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                                    {selectedOrg.initials}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedOrg(null)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', color: 'white', fontSize: '1.25rem', cursor: 'pointer' }}
                            >
                                ×
                            </button>
                        </div>
                        <h2 style={{ margin: '16px 0 8px', fontSize: '1.375rem', fontWeight: 700 }}>{selectedOrg.name}</h2>
                        <div style={{ fontSize: '0.875rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📍 {selectedOrg.location}</span>
                            <span>•</span>
                            <span>{selectedOrg.focus}</span>
                        </div>
                    </div>

                    {/* Funding Amount & Deadline */}
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Funding Amount</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B365D' }}>{formatFundingAmount(selectedOrg.fundingAmount)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Deadline</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#C9A227' }}>Mar 15</div>
                            </div>
                        </div>
                    </div>

                    {/* Contacts */}
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Contacts</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(selectedOrg.contacts || []).slice(0, 3).map((contact, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1B365D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 600 }}>
                                            {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>{contact.name}</div>
                                            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>{contact.title}</div>
                                        </div>
                                    </div>
                                    <span style={{ padding: '2px 8px', background: contact.connectionDegree === '1st' ? '#D1FAE5' : contact.connectionDegree === '2nd' ? '#FEF3C7' : '#f1f5f9', color: contact.connectionDegree === '1st' ? '#059669' : contact.connectionDegree === '2nd' ? '#B45309' : '#64748b', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600 }}>
                                        {contact.connectionDegree}
                                    </span>
                                </div>
                            ))}
                            {(!selectedOrg.contacts || selectedOrg.contacts.length === 0) && (
                                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>No contacts yet</div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Recent Activity</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {selectedOrg.recentActivity.map((activity, i) => (
                                <div key={i} style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C9A227', marginTop: '6px', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '2px' }}>{activity.date}</div>
                                        <div style={{ fontSize: '0.8125rem', color: '#1e293b', lineHeight: 1.4 }}>{activity.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{ padding: '20px 24px' }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Quick Actions</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button 
                                onClick={handleSendEmail}
                                style={{ padding: '12px', background: '#1B365D', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                Send Email
                            </button>
                            <button 
                                onClick={handleSendProposal}
                                style={{ padding: '12px', background: '#C9A227', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                Send Proposal
                            </button>
                            <button style={{ padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                Schedule Call
                            </button>
                            <button 
                                onClick={() => handlePromoteInList(selectedOrg)}
                                style={{ padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                Promote
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast.show && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', background: '#DCFCE7', color: '#166534', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 500, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', zIndex: 1001, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ✓ {toast.message}
                </div>
            )}

            {/* Email Modal */}
            {showEmailModal && selectedOrg && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002 }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '520px', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        {/* Modal Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>Send Email</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#64748b' }}>to {selectedOrg.name}</p>
                            </div>
                            <button onClick={() => setShowEmailModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
                            {/* Recipient Selection */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Select Recipient *</label>
                                {selectedOrg.contacts && selectedOrg.contacts.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {selectedOrg.contacts.map(contact => (
                                            <div 
                                                key={contact.id}
                                                onClick={() => setSelectedRecipient(contact)}
                                                style={{ 
                                                    padding: '12px 14px', 
                                                    border: selectedRecipient?.id === contact.id ? '2px solid #C9A227' : '1px solid #e2e8f0', 
                                                    borderRadius: '10px', 
                                                    cursor: 'pointer',
                                                    background: selectedRecipient?.id === contact.id ? '#FFFBEB' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                }}
                                            >
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1B365D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{contact.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{contact.title} • {contact.email || 'No email'}</div>
                                                </div>
                                                {selectedRecipient?.id === contact.id && (
                                                    <span style={{ color: '#C9A227', fontSize: '1.125rem' }}>✓</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '0.875rem' }}>
                                        No contacts available for this organization
                                    </div>
                                )}
                            </div>

                            {/* Subject */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Subject</label>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    placeholder="Email subject..."
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                                />
                            </div>

                            {/* Message Body */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Message</label>
                                <textarea
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    placeholder="Write your message..."
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', minHeight: '120px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                            <button onClick={() => setShowEmailModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                            <button 
                                onClick={handleEmailSend}
                                disabled={!selectedRecipient}
                                style={{ 
                                    padding: '10px 24px', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    background: selectedRecipient ? '#1B365D' : '#94a3b8', 
                                    color: 'white', 
                                    fontSize: '0.875rem', 
                                    fontWeight: 600, 
                                    cursor: selectedRecipient ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                                Send Email
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
