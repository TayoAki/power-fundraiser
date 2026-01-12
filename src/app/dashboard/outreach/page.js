'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getStoredGoogleTokens } from '@/lib/google';
import {
    getActiveCampaign,
    getCampaigns,
    getCampaignById,
    getCampaignDonorsWithDetails,
    getContactsForFoundation,
    MOCK_FOUNDATIONS,
    MOCK_CONTACTS,
    setActiveCampaign,
    PIPELINE_STAGES,
} from '@/lib/mockData';
import { aiContentAPI } from '@/lib/api';

// Dynamically import RichTextEditor to avoid SSR issues
const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
    ssr: false,
    loading: () => <div style={{ minHeight: '300px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading editor...</div>
});

// Helper function to format currency
function formatCurrency(amount) {
    if (!amount) return '$0';
    if (amount >= 1000000000) return '$' + (amount / 1000000000).toFixed(1) + 'B';
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
    return '$' + amount.toLocaleString();
}

// Helper to generate realistic activity for contacts
function generateContactActivity(contact) {
    const activityTypes = [
        { type: 'email_opened', label: 'Opened Email', detail: 'Partnership inquiry viewed', time: '2h ago' },
        { type: 'intro_sent', label: 'Intro Sent', detail: 'Initial outreach email', time: '1d ago' },
        { type: 'meeting', label: 'Meeting Scheduled', detail: 'Via calendar invite', time: '3d ago' },
        { type: 'reply', label: 'Replied', detail: 'Expressed interest', time: '5d ago' },
        { type: 'call', label: 'Call Completed', detail: '15 min intro call', time: '1w ago' },
    ];
    // Select 1-2 random activities based on contact id hash
    const hash = contact.id.charCodeAt(1) || 0;
    const activity1 = activityTypes[hash % activityTypes.length];
    const activity2 = activityTypes[(hash + 2) % activityTypes.length];
    return [activity1, activity2];
}

// Helper to calculate streak for a contact based on activities
function calculateStreak(activities) {
    if (!activities || activities.length === 0) return 0;
    // Count consecutive days/weeks with activity (simplified: count of recent activities)
    return Math.min(activities.length, 30); // Cap at 30 day streak
}

export default function OutreachPage() {
    const [isHydrated, setIsHydrated] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [selectedContact, setSelectedContact] = useState(null);
    const [view, setView] = useState('contacts'); // 'contacts', 'email', 'profile'
    const [searchQuery, setSearchQuery] = useState('');
    const [contactFilter, setContactFilter] = useState('all'); // 'all', 'decision', 'influencers'

    // Campaign and organizations state
    const [campaigns, setCampaigns] = useState([]);
    const [currentCampaign, setCurrentCampaign] = useState(null);
    const [organizations, setOrganizations] = useState([]);

    // Email compose state
    const [emailData, setEmailData] = useState({
        to: '',
        subject: '',
        body: '',
    });

    // Profile view state
    const [activityFilter, setActivityFilter] = useState('All');
    const [profileTab, setProfileTab] = useState('Notes');
    const [noteInput, setNoteInput] = useState('');
    const [activities, setActivities] = useState([
        { id: 1, type: 'email_opened', label: 'Opened Email', time: 'Today, 2:14 PM', detail: 'Re: Partnership Opportunity Q4', subtext: 'Opened the email 3 times. Clicked on "Impact Report" link.', color: '#22C55E' },
        { id: 2, type: 'call', label: 'Call Logged', time: 'Oct 24, 10:30 AM', detail: 'Introductory Call', duration: '15m', subtext: 'Discussed the upcoming gala. Very interested in the new education initiative. Requested a one-pager on the budget breakdown.', color: '#F59E0B', tags: ['Positive', '1 Attachment'], sentiment: 'positive' },
        { id: 3, type: 'meeting', label: 'Meeting', time: 'Oct 15, 2:00 PM', detail: 'Quarterly Strategy Review', subtext: 'Attendees: Sarah J., Michael R., You', color: '#3B82F6', hasIcon: true },
        { id: 4, type: 'email_sent', label: 'Email Sent', time: 'Oct 12, 9:00 AM', detail: 'Subject: Introduction to Global Health Initiative', color: '#3B82F6' },
    ]);
    const [notes, setNotes] = useState([
        { id: 1, author: 'You', date: 'Oct 20', text: 'Key donor preference: Prefers early morning meetings (before 10 AM) and is very data-driven. Always include impact metrics in proposals.', pinned: true },
        { id: 2, author: 'You', date: 'Oct 24', text: 'Note from call: Interest level is high. Mentioned that their fiscal year ends in December, so we need to get the proposal in by Nov 15th to be considered for this cycle.', action: 'Send Proposal by Nov 15' },
        { id: 3, author: 'You', date: 'Oct 10', text: 'Initial research completed. Has a history of supporting education and community development initiatives.' },
    ]);
    const [tasks, setTasks] = useState([
        { id: 1, text: 'Send proposal by Nov 15', completed: false, dueDate: 'Nov 15' },
        { id: 2, text: 'Follow up on budget one-pager request', completed: false, dueDate: 'Nov 10' },
    ]);
    const [showLogModal, setShowLogModal] = useState(null); // 'call' or 'meeting' or null
    const [logData, setLogData] = useState({ duration: '15', summary: '', sentiment: 'positive' });
    const [newTaskInput, setNewTaskInput] = useState('');
    const [newTaskDue, setNewTaskDue] = useState('');
    const [pinNewNote, setPinNewNote] = useState(false);

    // Contact activities tracking (for streaks)
    const [contactActivities, setContactActivities] = useState({});

    // Edit profile modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        title: '',
        email: '',
        role: '',
    });

    // Pipeline stage tracking for foundations
    const [foundationStages, setFoundationStages] = useState({});

    // Get current stage for a foundation
    const getFoundationStage = (foundationId) => {
        return foundationStages[foundationId] || 'research';
    };

    // Get stage info (name, color) for a foundation
    const getStageInfo = (foundationId) => {
        const stageId = getFoundationStage(foundationId);
        return PIPELINE_STAGES.find(s => s.id === stageId) || PIPELINE_STAGES[0];
    };

    // Move foundation to next stage
    const moveToNextStage = (foundationId) => {
        const currentStage = getFoundationStage(foundationId);
        const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
        if (currentIndex < PIPELINE_STAGES.length - 1) {
            const nextStage = PIPELINE_STAGES[currentIndex + 1];
            setFoundationStages(prev => ({
                ...prev,
                [foundationId]: nextStage.id
            }));
            showToast(`Moved to ${nextStage.name}!`, 'success');
        }
    };

    // Move foundation to a specific stage
    const moveToStage = (foundationId, stageId) => {
        setFoundationStages(prev => ({
            ...prev,
            [foundationId]: stageId
        }));
        const stage = PIPELINE_STAGES.find(s => s.id === stageId);
        showToast(`Moved to ${stage?.name || stageId}!`, 'success');
    };

    // Email functionality state
    const [isGenerating, setIsGenerating] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateSearch, setTemplateSearch] = useState('');

    // Template data with full content
    const emailTemplates = [
        {
            id: 1,
            title: 'Impact-First Approach',
            preview: '"It was wonderful meeting you at the Gala. Our new initiative aligns perfectly with your goals..."',
            tags: ['Metrics Heavy', 'Warm Tone'],
            best: true,
            matchScore: 94,
            subject: 'Continuing our conversation from the Gala',
            body: `Dear {firstName},

It was wonderful meeting you at the Annual Philanthropy Gala last week. Our conversation about {orgFocus} really resonated with me, and I wanted to follow up on some of the ideas we discussed.

As you may know, our organization has been working on initiatives that align perfectly with {orgName}'s mission. In the past year alone, we've:

• Reached over 15,000 beneficiaries across 12 communities
• Achieved a 94% program success rate
• Maintained administrative costs below 8%

I believe there's a meaningful opportunity for collaboration that could amplify both our impact. Would you be open to a brief call next week to explore this further?

Looking forward to hearing from you.

Warm regards,
[Your Name]`
        },
        {
            id: 2,
            title: 'Formal Board Intro',
            preview: '"Writing to you regarding the upcoming quarterly board review and our strategic alignment..."',
            tags: ['Formal', 'Prestige'],
            matchScore: 78,
            subject: 'Strategic Partnership Proposal for Q4 Review',
            body: `Dear {firstName},

I am writing to you regarding the upcoming quarterly board review and the strategic opportunities that lie ahead for organizations like ours.

{orgName} has consistently demonstrated exceptional leadership in the philanthropic space, and your recent initiatives in {orgFocus} have not gone unnoticed by our team.

We believe that a formal partnership between our organizations could:

1. Expand program reach by an estimated 40%
2. Create shared infrastructure efficiencies
3. Position both organizations as leaders in collaborative philanthropy

I would be honored to present a formal proposal to your board at your earliest convenience. Please let me know if you would be available for a preliminary discussion.

Respectfully,
[Your Name]
[Your Title]`
        },
        {
            id: 3,
            title: 'Mutual Connection',
            preview: '"David Kim suggested I reach out regarding the grants committee and our shared history..."',
            tags: ['Referral', 'Network'],
            matchScore: 65,
            subject: 'Introduction via David Kim - Grant Opportunities',
            body: `Dear {firstName},

David Kim suggested I reach out to you regarding the grants committee and our shared history of supporting community initiatives.

David mentioned that {orgName} is currently exploring new partnerships for the upcoming fiscal year, and he thought there might be a great alignment with our organization's work.

A bit about us:
We've been operating in the {orgFocus} space for over a decade, with a proven track record of delivering measurable outcomes. David thought you might be particularly interested in our approach to community engagement.

Would you have 20 minutes for a brief introductory call? I'd love to learn more about {orgName}'s priorities and share how we might support your goals.

Best regards,
[Your Name]`
        },
    ];

    // Show toast notification
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // Apply template to email
    const applyTemplate = (template) => {
        const firstName = selectedContact?.name?.split(' ')[0] || 'there';
        const orgName = selectedOrg?.name || 'your organization';
        const orgFocus = 'community development';

        const filledBody = template.body
            .replace(/{firstName}/g, firstName)
            .replace(/{orgName}/g, orgName)
            .replace(/{orgFocus}/g, orgFocus);

        const filledSubject = template.subject
            .replace(/{firstName}/g, firstName)
            .replace(/{orgName}/g, orgName);

        setEmailData(prev => ({
            ...prev,
            subject: filledSubject,
            body: filledBody,
        }));
        setSelectedTemplate(template.id);
        showToast(`Template "${template.title}" applied!`);
    };

    // Generate AI intro
    const generateIntro = async () => {
        setIsGenerating(true);
        try {
            const result = await aiContentAPI.generateIntro({
                recipientName: selectedContact?.name,
                organizationName: selectedOrg?.name,
                donorName: selectedOrg?.name,
                purpose: 'outreach',
                tone: 'professional',
            });
            if (result.success && result.intro) {
                setEmailData(prev => ({
                    ...prev,
                    body: result.intro + prev.body,
                }));
                showToast('AI intro generated!');
            }
        } catch (error) {
            console.error('AI intro error:', error);
            // Fallback
            const firstName = selectedContact?.name?.split(' ')[0] || 'there';
            const intro = `Dear ${firstName},\n\nI hope this message finds you well. I've been following ${selectedOrg?.name || 'your organization'}'s incredible work in the community.\n\n`;
            setEmailData(prev => ({ ...prev, body: intro + prev.body }));
        }
        setIsGenerating(false);
    };

    // Generate AI stats
    const generateStats = async () => {
        setIsGenerating(true);
        try {
            let orgData = {};
            try {
                const stored = localStorage.getItem('organizationSettings');
                if (stored) orgData = JSON.parse(stored);
            } catch (e) {}
            
            const result = await aiContentAPI.generateStats({
                organizationName: orgData.name || 'Our organization',
                focusArea: selectedOrg?.focus_areas?.split(',')[0] || 'community development',
            });
            if (result.success && result.stats) {
                setEmailData(prev => ({ ...prev, body: prev.body + result.stats }));
                showToast('Stats inserted!');
            }
        } catch (error) {
            console.error('AI stats error:', error);
            const stats = `\n\n• 2,500+ individuals served\n• 92% satisfaction rate\n• 15 community partnerships\n\n`;
            setEmailData(prev => ({ ...prev, body: prev.body + stats }));
        }
        setIsGenerating(false);
    };

    // Generate AI CTA
    const generateCTA = async () => {
        setIsGenerating(true);
        try {
            const result = await aiContentAPI.generateCTA({
                purpose: 'meeting',
                senderName: '[Your Name]',
                urgency: 'normal',
                recipientName: selectedContact?.name,
            });
            if (result.success && result.cta) {
                setEmailData(prev => ({ ...prev, body: prev.body + result.cta }));
                showToast('Call-to-action added!');
            }
        } catch (error) {
            console.error('AI CTA error:', error);
            const cta = `\n\nWould you be available for a brief call next week?\n\nBest regards,\n[Your Name]`;
            setEmailData(prev => ({ ...prev, body: prev.body + cta }));
        }
        setIsGenerating(false);
    };

    // Send email
    const handleSendEmail = async () => {
        if (!emailData.subject.trim()) {
            showToast('Please add a subject line', 'error');
            return;
        }
        if (!emailData.body.trim()) {
            showToast('Please add email content', 'error');
            return;
        }
        
        const recipientEmail = emailData.to || selectedContact?.email;
        if (!recipientEmail) {
            showToast('No recipient email address', 'error');
            return;
        }
        
        setIsGenerating(true);
        
        try {
            // Get email settings
            const emailSettingsStr = localStorage.getItem('emailSettings');
            const emailSettings = emailSettingsStr ? JSON.parse(emailSettingsStr) : { provider: 'gmail' };
            const googleAuth = getStoredGoogleTokens();
            
            console.log('📧 [Outreach] Sending email via:', googleAuth ? 'gmail' : 'smtp');
            console.log('📧 [Outreach] To:', recipientEmail);
            
            // Convert body to HTML
            const emailHtml = `<div style="font-family: Arial, sans-serif;">${emailData.body.replace(/\n/g, '<br>')}</div>`;
            
            // Send via API
            const response = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipientEmail,
                    subject: emailData.subject,
                    body: emailHtml,
                    provider: googleAuth ? 'gmail' : 'smtp',
                    // Gmail auth
                    accessToken: googleAuth?.accessToken,
                    refreshToken: googleAuth?.refreshToken,
                    fromEmail: googleAuth?.email,
                    // SMTP settings
                    smtpHost: emailSettings.smtpHost,
                    smtpPort: emailSettings.smtpPort,
                    smtpUsername: emailSettings.smtpUsername,
                    smtpPassword: emailSettings.smtpPassword,
                }),
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ [Outreach] Email sent successfully via', result.provider);
                
                // Log the activity for this contact
                const newActivity = {
                    id: Date.now(),
                    type: 'email_sent',
                    label: 'Email Sent',
                    time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                    detail: `Subject: ${emailData.subject}`,
                    color: '#3B82F6'
                };
                
                // Update contact activities
                setContactActivities(prev => {
                    const contactId = selectedContact.id;
                    const existing = prev[contactId] || [];
                    return {
                        ...prev,
                        [contactId]: [newActivity, ...existing]
                    };
                });
                
                // Also add to the activities list for profile view
                setActivities(prev => [newActivity, ...prev]);
                
                showToast('Email sent successfully!', 'success');
                
                // Navigate to profile view for this contact
                setTimeout(() => {
                    setView('profile');
                }, 1000);
            } else {
                console.error('❌ [Outreach] Email failed:', result.error);
                showToast(result.error || 'Failed to send email', 'error');
            }
        } catch (error) {
            console.error('❌ [Outreach] Email error:', error);
            showToast('Failed to send email. Check your email settings.', 'error');
        }
        
        setIsGenerating(false);
    };

    // Save draft
    const handleSaveDraft = () => {
        showToast('Draft saved!');
    };

    // Discard
    const handleDiscard = () => {
        setEmailData({ to: '', subject: '', body: '' });
        setSelectedTemplate(null);
        setView('contacts');
        showToast('Draft discarded', 'error');
    };

    // Transform foundation data to organization format for UI
    const transformToOrganization = (foundation, contacts) => {
        const transformedContacts = contacts.map(c => ({
            id: c.id,
            name: c.name,
            title: c.title,
            role: c.role,
            email: c.email,
            avatar: null,
            connectionDegree: c.connectionDegree,
            connectedThrough: c.connectedThrough,
        }));

        return {
            id: foundation.id,
            name: foundation.name,
            initials: foundation.name.split(' ').map(w => w[0]).join('').slice(0, 2),
            location: `${foundation.city}, ${foundation.state}`,
            potential: foundation.funding_range || formatCurrency(foundation.total_assets * 0.001),
            lastActivity: 'Recently added',
            status: 'Active',
            step: null,
            contactCount: transformedContacts.length,
            contacts: transformedContacts,
            foundation: foundation,
            focusAreas: foundation.focus_areas,
            alignmentScore: foundation.alignment_score,
            aiInsights: foundation.ai_insights,
        };
    };

    // Load organizations based on campaign or show all foundations
    const loadOrganizations = (campaignId = null) => {
        let orgs = [];
        
        if (campaignId && campaignId !== 'all') {
            // First try to load from cachedDonors (AI-generated)
            const campaign = getCampaignById(campaignId);
            if (campaign?.cachedDonors && campaign.cachedDonors.length > 0) {
                orgs = campaign.cachedDonors.map(donor => {
                    // Extract officers as contacts
                    const contacts = (donor.officers || []).map((officer, idx) => ({
                        id: `officer-${donor.id}-${idx}`,
                        name: officer.name || officer.person_name || 'Unknown',
                        title: officer.title || officer.role || 'Officer',
                        role: officer.title?.toLowerCase().includes('director') || officer.title?.toLowerCase().includes('president') 
                            ? 'Decision Maker' 
                            : 'Influencer',
                        email: officer.email || '',
                        status: 'New',
                        source: '990-PF',
                    }));
                    
                    return {
                        id: donor.id,
                        name: donor.name,
                        initials: donor.name.split(' ').map(w => w[0]).join('').slice(0, 2),
                        location: donor.location || 'Unknown',
                        funding: donor.funding_range || '$50K - $200K',
                        status: 'Active',
                        step: null,
                        contactCount: contacts.length,
                        contacts: contacts,
                        foundation: donor,
                        focusAreas: donor.focus_areas,
                        alignmentScore: donor.alignment_score,
                        aiInsights: { summary: donor.description },
                    };
                });
            } else {
                // Fall back to campaign donors with details
                const donorsWithDetails = getCampaignDonorsWithDetails(campaignId);
                orgs = donorsWithDetails
                    .filter(d => !d.isRejected && d.foundation)
                    .map(d => transformToOrganization(d.foundation, d.contacts || []));
            }
        }
        
        // If no campaign data or 'all' selected, load from all campaigns' cachedDonors
        if (orgs.length === 0) {
            const allCampaigns = getCampaigns();
            allCampaigns.forEach(campaign => {
                if (campaign.cachedDonors && campaign.cachedDonors.length > 0) {
                    campaign.cachedDonors.forEach(donor => {
                        // Extract officers as contacts
                        const contacts = (donor.officers || []).map((officer, idx) => ({
                            id: `officer-${donor.id}-${idx}`,
                            name: officer.name || officer.person_name || 'Unknown',
                            title: officer.title || officer.role || 'Officer',
                            role: officer.title?.toLowerCase().includes('director') || officer.title?.toLowerCase().includes('president') 
                                ? 'Decision Maker' 
                                : 'Influencer',
                            email: officer.email || '',
                            status: 'New',
                            source: '990-PF',
                        }));
                        
                        orgs.push({
                            id: donor.id,
                            name: donor.name,
                            initials: donor.name.split(' ').map(w => w[0]).join('').slice(0, 2),
                            location: donor.location || 'Unknown',
                            funding: donor.funding_range || '$50K - $200K',
                            status: 'Active',
                            step: null,
                            contactCount: contacts.length,
                            contacts: contacts,
                            foundation: donor,
                            focusAreas: donor.focus_areas,
                            alignmentScore: donor.alignment_score,
                            aiInsights: { summary: donor.description },
                        });
                    });
                }
            });
        }
        
        // Final fallback to mock foundations
        if (orgs.length === 0) {
            orgs = MOCK_FOUNDATIONS.map(f => {
                const contacts = getContactsForFoundation(f.id);
                return transformToOrganization(f, contacts);
            });
        }
        
        setOrganizations(orgs);
        if (orgs.length > 0 && !selectedOrg) {
            setSelectedOrg(orgs[0]);
        }
    };

    useEffect(() => {
        // Load campaigns
        const allCampaigns = getCampaigns();
        setCampaigns(allCampaigns);
        
        // Get active campaign
        const active = getActiveCampaign();
        if (active) {
            setCurrentCampaign(active);
            loadOrganizations(active.id);
        } else {
            // No active campaign, load all foundations
            loadOrganizations(null);
        }
        
        setIsHydrated(true);
    }, []);

    // Handle campaign filter change
    const handleCampaignChange = (campaignId) => {
        if (campaignId === 'all') {
            setCurrentCampaign(null);
            loadOrganizations(null);
        } else {
            const campaign = getCampaignById(campaignId);
            if (campaign) {
                setCurrentCampaign(campaign);
                setActiveCampaign(campaignId);
                loadOrganizations(campaignId);
            }
        }
        setSelectedOrg(null);
    };

    // Filter organizations by search query
    const filteredOrganizations = organizations.filter(org => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            org.name.toLowerCase().includes(query) ||
            org.location.toLowerCase().includes(query) ||
            org.focusAreas?.toLowerCase().includes(query)
        );
    });

    // Get filtered contacts based on contact filter
    const getFilteredContacts = (contacts) => {
        if (contactFilter === 'all') return contacts;
        if (contactFilter === 'decision') {
            return contacts.filter(c => c.role === 'Decision Maker' || c.role === 'Champion');
        }
        if (contactFilter === 'influencers') {
            return contacts.filter(c => c.role === 'Influencer');
        }
        return contacts;
    };

    // Count contacts by type for tabs
    const getContactCounts = (contacts) => {
        const decisionMakers = contacts.filter(c => c.role === 'Decision Maker' || c.role === 'Champion').length;
        const influencers = contacts.filter(c => c.role === 'Influencer').length;
        return { decisionMakers, influencers };
    };

    if (!isHydrated) {
        return (
            <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#64748b' }}>
                Loading...
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return { bg: '#22C55E', text: 'white' };
            case 'Needs Action': return { bg: '#EF4444', text: 'white' };
            case 'Pending': return { bg: '#94a3b8', text: 'white' };
            case 'At Risk': return { bg: '#EF4444', text: 'white' };
            default: return { bg: '#e2e8f0', text: '#64748b' };
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'Champion': return { bg: '#FEF3C7', text: '#B45309' };
            case 'Decision Maker': return { bg: '#DCFCE7', text: '#166534' };
            case 'Key Voter': return { bg: '#FEE2E2', text: '#DC2626' };
            case 'Influencer': return { bg: '#E0E7FF', text: '#4338CA' };
            case 'Gatekeeper': return { bg: '#FEE2E2', text: '#DC2626' };
            case 'Meeting': return { bg: '#FEF3C7', text: '#B45309' };
            case 'New': return { bg: '#E0E7FF', text: '#4338CA' };
            default: return { bg: '#f1f5f9', text: '#64748b' };
        }
    };

    const getHealthColor = (score) => {
        if (!score) return '#e2e8f0';
        if (score >= 80) return '#22C55E';
        if (score >= 60) return '#C9A227';
        if (score >= 40) return '#F59E0B';
        return '#EF4444';
    };

    const handleEmailClick = (contact) => {
        if (!contact) return;
        setSelectedContact(contact);
        const emailAddress = contact.email || `${contact.name.split(' ')[0].toLowerCase()}.${contact.name.split(' ')[1]?.toLowerCase() || ''}@${selectedOrg?.name?.toLowerCase().replace(/\s+/g, '') || 'example'}.org`;
        setEmailData({
            to: emailAddress,
            subject: 'Following up on our conversation',
            body: `Hi ${contact.name.split(' ')[0]},\n\nI hope this email finds you well.\n\nBest regards,\nAlex`,
        });
        setView('email');
    };

    const handleProfileClick = (contact) => {
        if (!contact) return;
        setSelectedContact(contact);
        setView('profile');
    };

    // Edit profile handlers
    const openEditModal = () => {
        if (!selectedContact) return;
        setEditFormData({
            name: selectedContact.name,
            title: selectedContact.title,
            email: selectedContact.email || `${selectedContact.name.split(' ')[0].toLowerCase()}.${selectedContact.name.split(' ')[1]?.toLowerCase() || ''}@${selectedOrg?.name?.toLowerCase().replace(/\s+/g, '') || 'example'}.org`,
            role: selectedContact.role,
        });
        setShowEditModal(true);
    };

    const handleSaveProfile = () => {
        if (!selectedContact || !selectedOrg) return;
        // Update the selected contact with new data
        const updatedContact = {
            ...selectedContact,
            name: editFormData.name,
            title: editFormData.title,
            email: editFormData.email,
            role: editFormData.role,
        };
        
        // Update in the organizations state
        setOrganizations(prev => prev.map(org => {
            if (org.id === selectedOrg.id) {
                return {
                    ...org,
                    contacts: org.contacts.map(c => 
                        c.id === selectedContact.id ? updatedContact : c
                    )
                };
            }
            return org;
        }));
        
        // Update selected org
        setSelectedOrg(prev => ({
            ...prev,
            contacts: prev.contacts.map(c => 
                c.id === selectedContact.id ? updatedContact : c
            )
        }));
        
        // Update selected contact
        setSelectedContact(updatedContact);
        
        setShowEditModal(false);
        showToast('Profile updated successfully!', 'success');
    };

    // Profile view handlers
    const handleSaveNote = () => {
        if (!noteInput.trim()) {
            showToast('Please enter a note', 'error');
            return;
        }
        const newNote = {
            id: Date.now(),
            author: 'You',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            text: noteInput.trim(),
            pinned: pinNewNote,
        };
        setNotes(prev => [newNote, ...prev]);
        setNoteInput('');
        setPinNewNote(false);
        showToast(pinNewNote ? 'Pinned note saved!' : 'Note saved!');
    };

    const handleDeleteNote = (noteId) => {
        setNotes(prev => prev.filter(note => note.id !== noteId));
        showToast('Note deleted');
    };

    const handleTogglePin = (noteId) => {
        setNotes(prev => prev.map(note =>
            note.id === noteId ? { ...note, pinned: !note.pinned } : note
        ));
    };

    const handleLogActivity = (type) => {
        if (!logData.summary.trim()) {
            showToast('Please enter a summary', 'error');
            return;
        }
        const newActivity = {
            id: Date.now(),
            type: type,
            label: type === 'call' ? 'Call Logged' : 'Meeting Logged',
            time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
            detail: type === 'call' ? `${logData.duration}m ${type === 'call' ? 'Call' : 'Meeting'}` : logData.summary.split('.')[0],
            duration: type === 'call' ? `${logData.duration}m` : undefined,
            subtext: logData.summary,
            color: type === 'call' ? '#F59E0B' : '#3B82F6',
            tags: logData.sentiment === 'positive' ? ['Positive'] : logData.sentiment === 'negative' ? ['Needs Follow-up'] : [],
            sentiment: logData.sentiment,
        };
        setActivities(prev => [newActivity, ...prev]);
        setShowLogModal(null);
        setLogData({ duration: '15', summary: '', sentiment: 'positive' });
        showToast(`${type === 'call' ? 'Call' : 'Meeting'} logged successfully!`);
    };

    const handleToggleTask = (taskId) => {
        setTasks(prev => prev.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
        ));
    };

    const handleAddTask = () => {
        if (!newTaskInput.trim()) {
            showToast('Please enter a task', 'error');
            return;
        }
        const newTask = {
            id: Date.now(),
            text: newTaskInput.trim(),
            completed: false,
            dueDate: newTaskDue || 'No due date',
        };
        setTasks(prev => [...prev, newTask]);
        setNewTaskInput('');
        setNewTaskDue('');
        showToast('Task added!');
    };

    const handleDeleteTask = (taskId) => {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        showToast('Task deleted');
    };

    const handleCall = () => {
        showToast('Opening phone dialer...', 'success');
        // In a real app, this would trigger tel: link or VoIP
    };

    const getFilteredActivities = () => {
        if (activityFilter === 'All') return activities;
        if (activityFilter === 'Emails') return activities.filter(a => a.type.includes('email'));
        if (activityFilter === 'Calls') return activities.filter(a => a.type === 'call');
        return activities;
    };

    // Get health score label and color
    const getHealthLabel = (score) => {
        if (!score) return { label: 'Unknown', color: '#94a3b8' };
        if (score >= 80) return { label: 'Excellent', color: '#22C55E' };
        if (score >= 60) return { label: 'Good', color: '#C9A227' };
        if (score >= 40) return { label: 'Needs Attention', color: '#F59E0B' };
        return { label: 'At Risk', color: '#EF4444' };
    };

    // Get last interaction from activities
    const getLastInteraction = () => {
        if (activities.length === 0) return 'No interactions yet';
        const last = activities[0];
        return `${last.label} • ${last.time}`;
    };

    // Get next step from incomplete tasks
    const getNextStep = () => {
        const incompleteTasks = tasks.filter(t => !t.completed);
        if (incompleteTasks.length === 0) return 'No pending tasks';
        const next = incompleteTasks[0];
        return `${next.text} (${next.dueDate})`;
    };

    // Profile View
    if (view === 'profile' && selectedContact) {
        return (
            <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
                {/* Left Sidebar */}
                <div style={{ width: '260px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                    {/* Back Button */}
                    <button
                        onClick={() => setView('contacts')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: '20px', fontSize: '0.875rem', color: '#1e293b', cursor: 'pointer', textAlign: 'left', fontWeight: 500 }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                        Back to Organization
                    </button>

                    {/* Associated With */}
                    <div style={{ padding: '0 20px 20px' }}>
                        <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '12px' }}>Associated With</div>
                        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#1B365D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                                    {selectedOrg.initials}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{selectedOrg.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Major Donor • Active</div>
                                </div>
                            </div>
                            {/* Pipeline Stage Dropdown */}
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 500 }}>Pipeline Stage</div>
                                <select
                                    value={getFoundationStage(selectedOrg?.id)}
                                    onChange={(e) => moveToStage(selectedOrg?.id, e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: `1px solid ${getStageInfo(selectedOrg?.id).color}`,
                                        background: getStageInfo(selectedOrg?.id).color + '15',
                                        color: getStageInfo(selectedOrg?.id).color,
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {PIPELINE_STAGES.map(stage => (
                                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Other Contacts */}
                    <div style={{ padding: '0 20px', flex: 1 }}>
                        <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '12px' }}>Other Contacts</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {selectedOrg.contacts.map(contact => (
                                <button
                                    key={contact.id}
                                    onClick={() => setSelectedContact(contact)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                                        background: selectedContact.id === contact.id ? '#FEF9C3' : 'transparent',
                                        border: 'none', borderRadius: '10px', cursor: 'pointer', textAlign: 'left', width: '100%'
                                    }}
                                >
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: selectedContact.id === contact.id ? '#C9A227' : '#e2e8f0', color: selectedContact.id === contact.id ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                                        {contact.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{contact.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{contact.title}</div>
                                    </div>
                                    {contact.healthScore >= 80 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Contact Header */}
                    <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '24px 32px' }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            {/* Profile Photo */}
                            <div style={{ position: 'relative' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
                                    {selectedContact.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '20px', height: '20px', borderRadius: '50%', background: '#22C55E', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                                </div>
                            </div>
                            {/* Contact Info */}
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>{selectedContact.name}</h1>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.875rem', color: '#64748b' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                        {selectedContact.title}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                        {selectedOrg.location || 'New York, NY'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#64748b', marginTop: '6px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>
                                    {selectedContact.name.split(' ')[0].toLowerCase()}.{selectedContact.name.split(' ')[1]?.toLowerCase() || ''}@{selectedOrg.name.toLowerCase().replace(/\s+/g, '').slice(0, 3)}.org
                                </div>
                                {/* Action Buttons - Below Contact Info */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                    <button onClick={openEditModal} style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                        Edit
                                    </button>
                                    <button onClick={handleCall} style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
                                        Call
                                    </button>
                                    <button onClick={() => handleEmailClick(selectedContact)} style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>
                                        Email
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', padding: '20px 32px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
                        {/* Streak */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '32px', borderRight: '1px solid #e2e8f0' }}>
                            {(() => {
                                const streak = calculateStreak(contactActivities[selectedContact.id] || []);
                                return (
                                    <>
                                        <div style={{ 
                                            width: '48px', 
                                            height: '48px', 
                                            borderRadius: '12px', 
                                            background: streak > 0 ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : '#f1f5f9',
                                            display: 'flex', 
                                            flexDirection: 'column',
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            color: streak > 0 ? 'white' : '#94a3b8'
                                        }}>
                                            <span style={{ fontSize: '1.125rem' }}>{streak > 0 ? '🔥' : '—'}</span>
                                            {streak > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{streak}</span>}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Streak</div>
                                            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: streak > 0 ? '#D97706' : '#94a3b8' }}>
                                                {streak > 0 ? `${streak} day${streak > 1 ? 's' : ''}` : 'No streak'}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        {/* Last Interaction */}
                        <div style={{ paddingLeft: '32px', paddingRight: '32px', borderRight: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Last Interaction</div>
                            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', marginTop: '4px' }}>{getLastInteraction()}</div>
                        </div>
                        {/* Next Step */}
                        <div style={{ paddingLeft: '32px', paddingRight: '32px', borderRight: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Next Step</div>
                            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', marginTop: '4px' }}>{getNextStep()}</div>
                        </div>
                        {/* AI Insight */}
                        <div style={{ flex: 1, paddingLeft: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>✨</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B45309' }}>AI Insight from 990-PF</div>
                                <div style={{ fontSize: '0.8125rem', color: '#78350F', lineHeight: 1.4 }}>{selectedContact.name.split(' ')[0]} joined the board of the "Community Arts Fund" last month. Consider mentioning shared interests in arts education.</div>
                            </div>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>
                        {/* Activity History */}
                        <div style={{ padding: '24px 32px', overflowY: 'auto', background: '#f8fafc' }}>
                            {/* Activity Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    Activity History
                                </h2>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['All', 'Emails', 'Calls'].map((t) => (
                                        <button key={t} onClick={() => setActivityFilter(t)} style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: activityFilter === t ? '#1e293b' : 'transparent', color: activityFilter === t ? 'white' : '#64748b', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}>{t}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div style={{ position: 'relative', paddingLeft: '24px' }}>
                                <div style={{ position: 'absolute', left: '6px', top: '8px', bottom: '8px', width: '2px', background: '#e2e8f0' }} />
                                {getFilteredActivities().length === 0 ? (
                                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                        No activities found for this filter.
                                    </div>
                                ) : getFilteredActivities().map((item, i) => (
                                    <div key={i} style={{ position: 'relative', marginBottom: '24px' }}>
                                        <div style={{ position: 'absolute', left: '-20px', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: item.color }} />
                                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: item.color }}>{item.label}</span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.time}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: item.subtext ? '8px' : '0' }}>
                                                {item.hasIcon && <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg></div>}
                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.detail}</span>
                                                {item.duration && <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.75rem', color: '#64748b' }}>{item.duration}</span>}
                                            </div>
                                            {item.subtext && <div style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.6 }}>{item.subtext}</div>}
                                            {item.tags && (
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                    {item.tags.map(tag => (
                                                        <span key={tag} style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '100px', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {tag === 'Positive' && <span style={{ color: '#22C55E' }}>●</span>}
                                                            {tag === '1 Attachment' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>}
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Sidebar - Notes */}
                        <div style={{ background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {/* Notes Tabs */}
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    {['Notes', 'Tasks', 'Files'].map((tab) => (
                                        <button key={tab} onClick={() => setProfileTab(tab)} style={{ padding: '0', border: 'none', background: 'none', fontSize: '0.875rem', fontWeight: profileTab === tab ? 600 : 500, color: profileTab === tab ? '#1e293b' : '#64748b', cursor: 'pointer', borderBottom: profileTab === tab ? '2px solid #1e293b' : 'none', paddingBottom: '4px' }}>{tab}</button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                                    </button>
                                    <button style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Note Input */}
                            {profileTab === 'Notes' && (
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                    <div style={{ position: 'relative' }}>
                                        <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Type a note, call summary, or paste an email..." style={{ width: '100%', padding: '12px', paddingRight: '40px', border: '1px solid #e2e8f0', borderRadius: '10px', minHeight: '60px', fontSize: '0.875rem', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                                        <button onClick={() => setPinNewNote(!pinNewNote)} title={pinNewNote ? 'Will be pinned' : 'Click to pin when saved'} style={{ position: 'absolute', right: '12px', bottom: '12px', padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: pinNewNote ? '#F59E0B' : '#94a3b8' }}>
                                            📌
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
                                        <button onClick={() => setShowLogModal('call')} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', color: '#64748b' }}>Log Call</button>
                                        <button onClick={() => setShowLogModal('meeting')} style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', color: '#64748b' }}>Log Meeting</button>
                                        {pinNewNote && <span style={{ fontSize: '0.75rem', color: '#F59E0B', marginLeft: '8px' }}>Will be pinned</span>}
                                        <button onClick={handleSaveNote} style={{ marginLeft: 'auto', padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#1B365D', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', color: 'white' }}>Save Note</button>
                                    </div>
                                </div>
                            )}

                            {/* Notes List */}
                            {profileTab === 'Notes' && (
                                <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', background: '#f8fafc' }}>
                                    {[...notes].sort((a, b) => b.pinned - a.pinned).map((note) => (
                                        <div key={note.id} style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#C9A227', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 600 }}>You</div>
                                                <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1e293b' }}>{note.author}</span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{note.pinned ? 'Pinned • ' : ''}{note.date}</span>
                                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                                                    <button onClick={() => handleTogglePin(note.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: note.pinned ? '#F59E0B' : '#94a3b8', padding: '4px' }} title={note.pinned ? 'Unpin' : 'Pin'}>📌</button>
                                                    <button onClick={() => handleDeleteNote(note.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }} title="Delete note">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0, lineHeight: 1.6 }}>{note.text}</p>
                                            {note.action && (
                                                <div style={{ marginTop: '12px', padding: '8px 12px', background: '#FEF3C7', borderRadius: '6px', fontSize: '0.8125rem', color: '#B45309', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>⚡</span> Action: {note.action}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {notes.length === 0 && (
                                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>No notes yet. Add one above!</div>
                                    )}
                                </div>
                            )}

                            {/* Tasks List */}
                            {profileTab === 'Tasks' && (
                                <>
                                    {/* Add Task Input */}
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <input 
                                                type="text" 
                                                value={newTaskInput} 
                                                onChange={(e) => setNewTaskInput(e.target.value)} 
                                                placeholder="Add a new task..." 
                                                style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input 
                                                type="text" 
                                                value={newTaskDue} 
                                                onChange={(e) => setNewTaskDue(e.target.value)} 
                                                placeholder="Due date (e.g., Nov 20)" 
                                                style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8125rem', boxSizing: 'border-box' }}
                                            />
                                            <button onClick={handleAddTask} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#1B365D', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', color: 'white' }}>Add Task</button>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', background: '#f8fafc' }}>
                                        {tasks.map((task) => (
                                            <div key={task.id} style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div onClick={() => handleToggleTask(task.id)} style={{ width: '20px', height: '20px', borderRadius: '4px', border: task.completed ? 'none' : '2px solid #e2e8f0', background: task.completed ? '#22C55E' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                                                    {task.completed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.875rem', color: task.completed ? '#94a3b8' : '#1e293b', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.text}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Due: {task.dueDate}</div>
                                                </div>
                                                <button onClick={() => handleDeleteTask(task.id)} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        {tasks.length === 0 && (
                                            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>No tasks yet. Add one above!</div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Files List */}
                            {profileTab === 'Files' && (
                                <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', background: '#f8fafc' }}>
                                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                                        <div>No files uploaded yet.</div>
                                        <button style={{ marginTop: '12px', padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', color: '#64748b' }}>Upload File</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Log Activity Modal */}
                {showLogModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
                                    Log {showLogModal === 'call' ? 'Call' : 'Meeting'}
                                </h3>
                                <button onClick={() => setShowLogModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Contact</label>
                                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#C9A227', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                                            {selectedContact.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{selectedContact.name}</span>
                                    </div>
                                </div>
                                {showLogModal === 'call' && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Duration (minutes)</label>
                                        <input type="number" value={logData.duration} onChange={(e) => setLogData(prev => ({ ...prev, duration: e.target.value }))} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                                    </div>
                                )}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Summary</label>
                                    <textarea value={logData.summary} onChange={(e) => setLogData(prev => ({ ...prev, summary: e.target.value }))} placeholder={`What was discussed in this ${showLogModal}?`} style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', minHeight: '100px', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Sentiment</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[
                                            { value: 'positive', label: 'Positive', color: '#22C55E' },
                                            { value: 'neutral', label: 'Neutral', color: '#94a3b8' },
                                            { value: 'negative', label: 'Needs Follow-up', color: '#EF4444' },
                                        ].map((s) => (
                                            <button key={s.value} onClick={() => setLogData(prev => ({ ...prev, sentiment: s.value }))} style={{ flex: 1, padding: '10px', border: logData.sentiment === s.value ? `2px solid ${s.color}` : '1px solid #e2e8f0', borderRadius: '8px', background: logData.sentiment === s.value ? `${s.color}15` : 'white', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', color: logData.sentiment === s.value ? s.color : '#64748b' }}>
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button onClick={() => setShowLogModal(null)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                                <button onClick={() => handleLogActivity(showLogModal)} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: '#1B365D', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: 'white' }}>
                                    Log {showLogModal === 'call' ? 'Call' : 'Meeting'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Profile Modal */}
                {showEditModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>
                                    Edit Contact Profile
                                </h3>
                                <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div style={{ padding: '24px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Full Name</label>
                                    <input 
                                        type="text" 
                                        value={editFormData.name} 
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))} 
                                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }} 
                                    />
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Job Title</label>
                                    <input 
                                        type="text" 
                                        value={editFormData.title} 
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))} 
                                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }} 
                                    />
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Email Address</label>
                                    <input 
                                        type="email" 
                                        value={editFormData.email} 
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))} 
                                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }} 
                                    />
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>Role</label>
                                    <select 
                                        value={editFormData.role} 
                                        onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value }))}
                                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', background: 'white' }}
                                    >
                                        <option value="Decision Maker">Decision Maker</option>
                                        <option value="Champion">Champion</option>
                                        <option value="Influencer">Influencer</option>
                                        <option value="Gatekeeper">Gatekeeper</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button onClick={() => setShowEditModal(false)} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                                <button onClick={handleSaveProfile} style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', background: '#1B365D', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: 'white' }}>
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast Notification */}
                {toast.show && (
                    <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', background: toast.type === 'error' ? '#FEE2E2' : '#DCFCE7', color: toast.type === 'error' ? '#DC2626' : '#166534', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 500, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', zIndex: 1001, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {toast.type === 'error' ? '⚠️' : '✓'} {toast.message}
                    </div>
                )}
            </div>
        );
    }





























    // Email Compose View
    if (view === 'email' && selectedContact) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                {/* Toast Notification */}
                {toast.show && (
                    <div style={{
                        position: 'fixed',
                        top: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '12px 24px',
                        background: toast.type === 'error' ? '#FEE2E2' : '#DCFCE7',
                        border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                        zIndex: 1100,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}>
                        <span style={{ fontSize: '1rem' }}>{toast.type === 'error' ? '⚠️' : '✅'}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: toast.type === 'error' ? '#991B1B' : '#166534' }}>{toast.message}</span>
                    </div>
                )}
                <div style={{ width: '100%', maxWidth: '1200px', height: '90vh', background: 'white', borderRadius: '20px', display: 'flex', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                    {/* Email Compose Section */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Premium Header */}
                        <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)', color: 'white', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.125rem', boxShadow: '0 4px 12px rgba(201, 162, 39, 0.3)' }}>
                                {selectedContact.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Compose Email to {selectedContact.name}</div>
                                <div style={{ fontSize: '0.875rem', opacity: 0.85, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span>{selectedContact.title}</span>
                                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
                                    <span style={{ color: '#C9A227', fontWeight: 600 }}>Warm Lead</span>
                                    {(() => {
                                        const streak = calculateStreak(contactActivities[selectedContact.id] || []);
                                        return streak > 0 ? (
                                            <span style={{ padding: '3px 10px', background: 'rgba(249, 115, 22, 0.2)', borderRadius: '100px', fontSize: '0.75rem', color: '#F97316', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                🔥 {streak} day streak
                                            </span>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                            <button
                                onClick={() => setView('contacts')}
                                title="Close composer"
                                style={{ width: '36px', height: '36px', border: 'none', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >×</button>
                        </div>

                        {/* Email Form */}
                        <div style={{ flex: 1, padding: '28px', overflowY: 'auto', background: '#fafafa' }}>
                            {/* To & Subject Fields */}
                            <div style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#64748b', width: '70px', fontWeight: 500 }}>To:</span>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#f1f5f9', borderRadius: '100px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#C9A227', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 600 }}>
                                                {selectedContact.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{selectedContact.name}</span>
                                            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{'<'}{emailData.to}{'>'}</span>
                                        </div>
                                        <div title="Email verified and deliverable" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22C55E', cursor: 'help' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Verified</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#64748b', width: '70px', fontWeight: 500 }}>Subject:</span>
                                    <input
                                        type="text"
                                        value={emailData.subject}
                                        onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                        placeholder="Enter a compelling subject line..."
                                        style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9375rem', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* Rich Text Editor */}
                            <RichTextEditor
                                content={emailData.body}
                                onChange={(html) => setEmailData({ ...emailData, body: html })}
                                placeholder="Write your message here..."
                                onGenerateIntro={generateIntro}
                                onGenerateStats={generateStats}
                                onGenerateCTA={generateCTA}
                                isGenerating={isGenerating}
                            />
                        </div>

                        {/* Premium Footer */}
                        <div style={{ padding: '20px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', background: 'white' }}>
                            <button
                                onClick={handleDiscard}
                                title="Discard this draft"
                                style={{ padding: '10px 18px', border: 'none', background: 'transparent', fontSize: '0.875rem', color: '#EF4444', fontWeight: 500, cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                Discard
                            </button>
                            <button
                                onClick={handleSaveDraft}
                                title="Save as draft - continue later"
                                style={{ padding: '10px 18px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.875rem', color: '#64748b', fontWeight: 500, cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17,21 17,13 7,13 7,21" /><polyline points="7,3 7,8 15,8" /></svg>
                                Save Draft
                            </button>
                            <button
                                onClick={() => showToast('Send Later scheduling coming soon!')}
                                title="Schedule this email for later"
                                style={{ padding: '10px 18px', border: '1px solid #22C55E', background: 'white', fontSize: '0.875rem', color: '#22C55E', fontWeight: 500, cursor: 'pointer', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
                                Send Later
                            </button>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div title="Email tracking is enabled" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f0fdf4', borderRadius: '6px', cursor: 'help' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 500 }}>AI Tracking On</span>
                                </div>
                                <button
                                    onClick={handleSendEmail}
                                    disabled={isGenerating}
                                    title="Send email with AI-powered open and click tracking"
                                    style={{ padding: '12px 28px', border: 'none', borderRadius: '10px', background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)', fontSize: '0.9375rem', color: 'white', fontWeight: 600, cursor: isGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: isGenerating ? 'none' : '0 4px 14px rgba(201, 162, 39, 0.35)' }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9 22,2" /></svg>
                                    {isGenerating ? 'Sending...' : 'Send Email'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Templates Sidebar */}
                    <div style={{ width: '320px', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', padding: '24px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>📄</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>DRAFTS & TEMPLATES</span>
                            </div>
                            <button style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', fontSize: '0.75rem', cursor: 'pointer' }}>AI Library</button>
                        </div>

                        <input
                            type="text"
                            value={templateSearch}
                            onChange={(e) => setTemplateSearch(e.target.value)}
                            placeholder="Search templates..."
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                        />

                        <div style={{ padding: '12px', background: 'white', borderRadius: '8px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Goal: <strong style={{ color: '#1e293b' }}>Secure Meeting (Q3)</strong></div>
                        </div>

                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '12px' }}>
                            {templateSearch ? `RESULTS (${emailTemplates.filter(t => t.title.toLowerCase().includes(templateSearch.toLowerCase()) || t.tags.some(tag => tag.toLowerCase().includes(templateSearch.toLowerCase()))).length})` : 'SUGGESTED FOR YOU'}
                        </div>

                        {emailTemplates
                            .filter(template => {
                                if (!templateSearch) return true;
                                const search = templateSearch.toLowerCase();
                                return template.title.toLowerCase().includes(search) ||
                                    template.tags.some(tag => tag.toLowerCase().includes(search)) ||
                                    template.preview.toLowerCase().includes(search);
                            })
                            .map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => applyTemplate(template)}
                                    title="Click to use this template"
                                    style={{
                                        padding: '16px',
                                        background: selectedTemplate === template.id ? '#fffbeb' : 'white',
                                        borderRadius: '12px',
                                        border: selectedTemplate === template.id ? '2px solid #C9A227' : template.best ? '2px solid #C9A227' : '1px solid #e2e8f0',
                                        marginBottom: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {template.best && <span>✨</span>}
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{template.title}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {selectedTemplate === template.id && (
                                                <span style={{ padding: '2px 8px', background: '#22C55E', color: 'white', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 700 }}>Applied</span>
                                            )}
                                            {template.best && !selectedTemplate && <span style={{ padding: '2px 8px', background: '#C9A227', color: 'white', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 700 }}>Best Match</span>}
                                            <span style={{ padding: '2px 8px', background: template.matchScore >= 90 ? '#DCFCE7' : '#f1f5f9', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 600, color: template.matchScore >= 90 ? '#166534' : '#64748b' }}>{template.matchScore}%</span>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 8px 0', lineHeight: 1.5 }}>{template.preview}</p>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {template.tags.map(tag => (
                                            <span key={tag} style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.6875rem', color: '#64748b' }}>{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}

                        <div style={{ marginTop: '24px', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '12px' }}>📚 CONTEXT & REFERENCES</div>
                        <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span>📄</span>
                                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>990-PF Data (2023)</span>
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                Foundation granted <span style={{ color: '#C9A227', fontWeight: 600 }}>$50k</span> to "Health for All".
                            </div>
                            <button style={{ marginTop: '8px', padding: '4px 0', background: 'none', border: 'none', fontSize: '0.75rem', color: '#22C55E', cursor: 'pointer' }}>+ Insert Quote</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main Contacts View
    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
            {/* Left Sidebar - Organizations List */}
            <div style={{ width: '320px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>Organizations</h2>
                        <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{filteredOrganizations.length} Found</span>
                    </div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Filter by Campaign</div>
                    <select 
                        value={currentCampaign?.id || 'all'}
                        onChange={(e) => handleCampaignChange(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', appearance: 'none', background: 'white', cursor: 'pointer' }}
                    >
                        <option value="all">All Foundations</option>
                        {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.name} {c.status === 'active' ? '(Active)' : ''}</option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div style={{ padding: '16px 20px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search organizations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                        />
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                    </div>
                </div>

                {/* Org List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
                    {filteredOrganizations.map(org => (
                        <div
                            key={org.id}
                            onClick={() => setSelectedOrg(org)}
                            style={{
                                padding: '16px',
                                borderRadius: '12px',
                                marginBottom: '8px',
                                cursor: 'pointer',
                                border: selectedOrg?.id === org.id ? '2px solid #C9A227' : '1px solid transparent',
                                background: selectedOrg?.id === org.id ? '#FFFBEB' : 'transparent',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#1B365D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem', position: 'relative' }}>
                                    {org.initials}
                                    {org.contactCount > 0 && (
                                        <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', borderRadius: '50%', background: '#C9A227', color: 'white', fontSize: '0.625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{org.contactCount}</span>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>{org.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Last activity: {org.lastActivity}</div>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{org.lastActivity}</span>
                            </div>

                        </div>
                    ))}
                </div>

                {/* Add Org Button */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
                    <button style={{ width: '100%', padding: '12px', border: '1px dashed #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem', color: '#64748b', cursor: 'pointer' }}>
                        🏢 Add Organization
                    </button>
                </div>
            </div>

            {/* Main Content - Contacts */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {selectedOrg && (
                    <>
                        {/* Org Header */}
                        <div style={{ padding: '24px 32px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#1B365D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{selectedOrg.initials}</div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B365D', margin: 0 }}>{selectedOrg.name}</h1>
                                            {selectedOrg.alignmentScore && (
                                                <span style={{ 
                                                    padding: '4px 10px', 
                                                    background: selectedOrg.alignmentScore >= 85 ? '#DCFCE7' : selectedOrg.alignmentScore >= 70 ? '#FEF3C7' : '#f1f5f9',
                                                    color: selectedOrg.alignmentScore >= 85 ? '#166534' : selectedOrg.alignmentScore >= 70 ? '#B45309' : '#64748b',
                                                    borderRadius: '12px', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 600 
                                                }}>
                                                    {selectedOrg.alignmentScore}% Match
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>{selectedOrg.location} • Potential: {selectedOrg.potential}</div>
                                        {/* Pipeline Stage Dropdown */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>Stage:</span>
                                            <select
                                                value={getFoundationStage(selectedOrg.id)}
                                                onChange={(e) => moveToStage(selectedOrg.id, e.target.value)}
                                                style={{
                                                    padding: '6px 28px 6px 12px',
                                                    borderRadius: '100px',
                                                    border: `2px solid ${getStageInfo(selectedOrg.id).color}`,
                                                    backgroundColor: getStageInfo(selectedOrg.id).color + '15',
                                                    color: getStageInfo(selectedOrg.id).color,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    appearance: 'none',
                                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(getStageInfo(selectedOrg.id).color)}' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: 'right 8px center',
                                                }}
                                            >
                                                {PIPELINE_STAGES.map(stage => (
                                                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                                {(() => {
                                    const counts = getContactCounts(selectedOrg.contacts);
                                    return [
                                        { id: 'all', label: `All Contacts (${selectedOrg.contacts.length})` },
                                        { id: 'decision', label: `Decision Makers (${counts.decisionMakers})` },
                                        { id: 'influencers', label: `Influencers (${counts.influencers})` },
                                    ];
                                })().map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setContactFilter(tab.id)}
                                        style={{
                                            padding: '10px 16px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            background: contactFilter === tab.id ? '#1B365D' : '#f1f5f9',
                                            color: contactFilter === tab.id ? 'white' : '#64748b',
                                            fontSize: '0.8125rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contacts Grid */}
                        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
                            {getFilteredContacts(selectedOrg.contacts).length === 0 ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>👥</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>No contacts found</div>
                                    <div style={{ fontSize: '0.875rem' }}>Try adjusting your filter or add new contacts.</div>
                                </div>
                            ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                {getFilteredContacts(selectedOrg.contacts).map(contact => (
                                    <div key={contact.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                        {/* Contact Header */}
                                        <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', gap: '16px' }}>
                                                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1.125rem' }}>
                                                        {contact.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>{contact.name}</div>
                                                        <div style={{ fontSize: '0.8125rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{contact.title}</div>
                                                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '4px 12px',
                                                                borderRadius: '100px',
                                                                fontSize: '0.6875rem',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                background: getRoleColor(contact.role).bg,
                                                                color: getRoleColor(contact.role).text,
                                                            }}>{contact.role}</span>
                                                            {contact.connectionDegree && (
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '4px 10px',
                                                                    borderRadius: '100px',
                                                                    fontSize: '0.6875rem',
                                                                    fontWeight: 600,
                                                                    background: contact.connectionDegree === '1st' ? '#DCFCE7' : '#f1f5f9',
                                                                    color: contact.connectionDegree === '1st' ? '#166534' : '#64748b',
                                                                }}>{contact.connectionDegree} Connection</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Streak Display */}
                                                {(() => {
                                                    const streak = calculateStreak(contactActivities[contact.id] || []);
                                                    return (
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ 
                                                                width: '56px', 
                                                                height: '56px', 
                                                                borderRadius: '12px', 
                                                                background: streak > 0 ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : '#f1f5f9',
                                                                display: 'flex', 
                                                                flexDirection: 'column',
                                                                alignItems: 'center', 
                                                                justifyContent: 'center',
                                                                color: streak > 0 ? 'white' : '#94a3b8'
                                                            }}>
                                                                <span style={{ fontSize: '1.25rem' }}>{streak > 0 ? '🔥' : '—'}</span>
                                                                {streak > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{streak}</span>}
                                                            </div>
                                                            <div style={{ fontSize: '0.625rem', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Streak</div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {/* Recent Activity */}
                                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', minHeight: '100px', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                                                Recent Activity
                                            </div>
                                            {(contactActivities[contact.id] || []).length === 0 ? (
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
                                                    No activity recorded yet
                                                </div>
                                            ) : (
                                                (contactActivities[contact.id] || []).slice(0, 2).map((activity, i, arr) => (
                                                    <div key={activity.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: i < arr.length - 1 ? '10px' : '0' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: activity.color || '#22C55E', marginTop: '6px', flexShrink: 0 }} />
                                                            <div>
                                                                <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: 600 }}>{activity.label}</div>
                                                                {activity.detail && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{activity.detail}</div>}
                                                            </div>
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{activity.time}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                                            <button
                                                onClick={() => handleEmailClick(contact)}
                                                style={{ padding: '14px 8px', background: '#C9A227', border: 'none', color: 'white', fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                                    <path d="M22 6l-10 7L2 6" />
                                                </svg>
                                                Email
                                            </button>
                                            <button style={{ padding: '14px 8px', background: 'white', border: 'none', borderLeft: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                                                </svg>
                                                Call
                                            </button>
                                            <button style={{ padding: '14px 8px', background: 'white', border: 'none', borderLeft: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" />
                                                    <line x1="16" y1="2" x2="16" y2="6" />
                                                    <line x1="8" y1="2" x2="8" y2="6" />
                                                    <line x1="3" y1="10" x2="21" y2="10" />
                                                </svg>
                                                Schedule
                                            </button>
                                            <button
                                                onClick={() => handleProfileClick(contact)}
                                                style={{ padding: '14px 8px', background: 'white', border: 'none', borderLeft: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="3" />
                                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                                                </svg>
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
