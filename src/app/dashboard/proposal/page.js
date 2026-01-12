'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';
import { getStoredGoogleTokens } from '@/lib/google';
import {
    getCampaigns,
    getCampaignById,
    getCampaignDonorsWithDetails,
    getActiveCampaign,
    MOCK_FOUNDATIONS,
    MOCK_CONTACTS,
    getContactsForFoundation,
} from '@/lib/mockData';
import { aiContentAPI } from '@/lib/api';

// Document types
const documentTypes = [
    { id: 'loi', name: 'Letter of Inquiry (LOI)', icon: '✉️', description: 'Generate initial outreach emails or letters to foundations.' },
    { id: 'proposal', name: 'Full Proposal', icon: '📄', description: 'Comprehensive grant request structure with custom narrative.' },
    { id: 'budget', name: 'Budget Narrative', icon: '💰', description: 'Explain financial needs and justify line items in detail.' },
    { id: 'cover', name: 'Cover Letter', icon: '📝', description: 'Personalized introduction for formal grant applications.' },
    { id: 'progress', name: 'Progress Report', icon: '📈', description: 'Update donors on impact metrics and project milestones.' },
    { id: 'thankyou', name: 'Thank You Letter', icon: '💛', description: 'Generate personalized donor stewardship and gratitude.' },
];

// Helper function to format currency
function formatCurrency(amount) {
    if (!amount) return '$0';
    if (amount >= 1000000000) return '$' + (amount / 1000000000).toFixed(1) + 'B';
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
    if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
    return '$' + amount.toLocaleString();
}

// Helper function to format time ago
function formatTimeAgo(dateString) {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProposalPage() {
    const [isHydrated, setIsHydrated] = useState(false);
    const [step, setStep] = useState('select'); // 'select', 'editor', 'preview', 'send', 'sent'
    const [selectedType, setSelectedType] = useState(null);
    const [showFormPanel, setShowFormPanel] = useState(false);

    // Campaign and donor state
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [campaignDonors, setCampaignDonors] = useState([]);
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [selectedContact, setSelectedContact] = useState(null);
    const [donorContacts, setDonorContacts] = useState([]);

    // Form state
    const [formData, setFormData] = useState({
        projectName: '',
        amount: '',
        summary: '',
        goals: '',
        timeline: '12 months',
        includeBudget: true,
    });

    // Document state
    const [document, setDocument] = useState({
        title: '',
        subtitle: '',
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        content: '',
        outcomes: [],
    });

    // Email state for sending
    const [emailData, setEmailData] = useState({
        recipient: '',
        subject: '',
        body: '',
    });

    // Recent documents (stored in localStorage)
    const [recentDocs, setRecentDocs] = useState([]);

    // UI state
    const [isGenerating, setIsGenerating] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [aiChatInput, setAiChatInput] = useState('');
    const [proposalStrength, setProposalStrength] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    const [lastSaved, setLastSaved] = useState(null);
    const [showSuggestion, setShowSuggestion] = useState(false);
    const [donorSearch, setDonorSearch] = useState('');

    // AI Suggestions
    const [suggestions, setSuggestions] = useState([]);
    
    // Track if content update is from AI (external) vs user typing
    const isExternalUpdate = useRef(false);
    const pendingContent = useRef(null);

    // Helper to convert markdown content to HTML for the editor
    const formatContentAsHTML = useCallback((content) => {
        if (!content) return '<p></p>';
        
        // Configure marked for safe rendering
        marked.setOptions({
            breaks: true,  // Convert \n to <br>
            gfm: true,     // GitHub Flavored Markdown
        });
        
        // Convert markdown to HTML
        const html = marked.parse(content);
        
        console.log('📝 [Proposal] Converted markdown to HTML, length:', html.length);
        return html;
    }, []);

    // TipTap Editor with proper configuration
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Placeholder.configure({ placeholder: 'Start writing your proposal...' }),
        ],
        content: '<p></p>',
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            // Only update document state if this is a user edit, not external
            if (!isExternalUpdate.current) {
                const text = editor.getText();
                setDocument(prev => ({ ...prev, content: text }));
                const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
                setWordCount(words);
            }
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px]',
                style: 'line-height: 1.8; color: #1e293b; font-size: 1rem; padding: 16px;',
            },
        },
    });

    // Handle external content updates (from AI generation)
    useEffect(() => {
        if (pendingContent.current && editor) {
            console.log('📝 [Proposal] Applying pending content to editor...');
            isExternalUpdate.current = true;
            const htmlContent = formatContentAsHTML(pendingContent.current);
            editor.commands.setContent(htmlContent);
            pendingContent.current = null;
            // Reset flag after a tick to allow future user edits
            setTimeout(() => {
                isExternalUpdate.current = false;
                console.log('✅ [Proposal] Editor content applied');
            }, 100);
        }
    }, [editor, formatContentAsHTML]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    // Load campaigns and recent docs on mount
    useEffect(() => {
        const allCampaigns = getCampaigns();
        setCampaigns(allCampaigns);
        
        // Load recent docs from localStorage
        const saved = localStorage.getItem('recentProposals');
        if (saved) {
            setRecentDocs(JSON.parse(saved));
        }
        
        // Check for pre-selected donor from pipeline page
        const proposalDonor = sessionStorage.getItem('proposalDonor');
        if (proposalDonor) {
            try {
                const donorData = JSON.parse(proposalDonor);
                // Find the matching donor in campaign donors or mock foundations
                const allFoundations = MOCK_FOUNDATIONS.map(f => ({
                    foundation: f,
                    contacts: getContactsForFoundation(f.id),
                }));
                const matchedDonor = allFoundations.find(d => d.foundation?.id === donorData.foundationId);
                if (matchedDonor) {
                    setSelectedDonor(matchedDonor);
                    // Auto-select Full Proposal type
                    const proposalType = documentTypes.find(t => t.id === 'proposal');
                    if (proposalType) {
                        setSelectedType(proposalType);
                        setShowFormPanel(true);
                    }
                }
                // Clear the sessionStorage after using it
                sessionStorage.removeItem('proposalDonor');
            } catch (e) {
                console.error('Error parsing proposalDonor:', e);
            }
        }
        
        setIsHydrated(true);
    }, []);

    // Load donors when campaign changes
    useEffect(() => {
        if (selectedCampaign) {
            const donors = getCampaignDonorsWithDetails(selectedCampaign.id);
            setCampaignDonors(donors.filter(d => !d.isRejected && d.foundation));
        } else {
            // Show all foundations if no campaign selected
            setCampaignDonors(MOCK_FOUNDATIONS.map(f => ({
                foundation: f,
                contacts: getContactsForFoundation(f.id),
            })));
        }
    }, [selectedCampaign]);

    // Load contacts when donor changes
    useEffect(() => {
        if (selectedDonor?.foundation) {
            const contacts = getContactsForFoundation(selectedDonor.foundation.id);
            setDonorContacts(contacts);
            if (contacts.length > 0) {
                setSelectedContact(contacts[0]);
            }
        } else {
            setDonorContacts([]);
            setSelectedContact(null);
        }
    }, [selectedDonor]);

    // Update word count when document content changes
    useEffect(() => {
        if (document.content) {
            const words = document.content.trim().split(/\s+/).filter(w => w.length > 0).length;
            setWordCount(words);
            // Calculate proposal strength based on content
            let strength = 0;
            if (words > 100) strength += 20;
            if (words > 300) strength += 20;
            if (document.outcomes.length >= 3) strength += 20;
            if (formData.amount) strength += 15;
            if (selectedDonor) strength += 15;
            if (formData.goals) strength += 10;
            setProposalStrength(Math.min(100, strength));
        }
    }, [document.content, document.outcomes, formData, selectedDonor]);

    if (!isHydrated) {
        return <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#64748b' }}>Loading...</div>;
    }

    const handleSelectType = (type) => {
        setSelectedType(type);
        setShowFormPanel(true);
    };

    // Filter donors based on search
    const filteredDonors = campaignDonors.filter(d => {
        if (!donorSearch.trim()) return true;
        const search = donorSearch.toLowerCase();
        return d.foundation?.name?.toLowerCase().includes(search) ||
            d.foundation?.focus_areas?.toLowerCase().includes(search);
    });

    // Generate AI draft based on donor context
    const handleGenerateDraft = async () => {
        if (!selectedDonor) {
            showToast('Please select a donor/foundation', 'error');
            return;
        }
        if (!formData.projectName.trim()) {
            showToast('Please enter a project name', 'error');
            return;
        }

        setIsGenerating(true);
        
        const foundation = selectedDonor.foundation;
        const contact = selectedContact;
        const focusAreas = foundation.focus_areas?.split(',').map(f => f.trim()) || [];
        
        // Get organization data from localStorage
        let orgData = {};
        try {
            const stored = localStorage.getItem('organizationSettings');
            if (stored) orgData = JSON.parse(stored);
        } catch (e) {}
        
        try {
            console.log('🚀 [Proposal] Calling AI API to generate proposal...');
            // Call AI API to generate proposal
            const result = await aiContentAPI.generateProposal({
                type: selectedType?.id || 'proposal',
                donorName: foundation.name,
                donorFocusAreas: foundation.focus_areas,
                projectName: formData.projectName,
                amount: formData.amount,
                summary: formData.summary,
                goals: formData.goals,
                timeline: formData.timeline,
                organizationName: orgData.name || '[Your Organization]',
                organizationMission: orgData.mission || '',
            });
            
            console.log('📥 [Proposal] AI API response:', { success: result.success, hasContent: !!result.content, contentLength: result.content?.length });
            
            if (result.success && result.content) {
                console.log('📝 [Proposal] Setting document state with content:', result.content.substring(0, 200));
                
                // Set pending content for editor update
                pendingContent.current = result.content;
                
                setDocument({
                    title: result.title || formData.projectName,
                    subtitle: result.subtitle || `${selectedType?.name || 'Proposal'} for ${foundation.name}`,
                    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    content: result.content,
                    outcomes: result.outcomes || [],
                });
                
                // Trigger editor update
                if (editor) {
                    console.log('📝 [Proposal] Directly updating editor...');
                    isExternalUpdate.current = true;
                    const htmlContent = formatContentAsHTML(result.content);
                    editor.commands.setContent(htmlContent);
                    setTimeout(() => {
                        isExternalUpdate.current = false;
                    }, 100);
                }
                
                // Set up email data
                setEmailData({
                    recipient: contact?.email || `grants@${foundation.name.toLowerCase().replace(/\s+/g, '')}.org`,
                    subject: `${selectedType?.name || 'Proposal'}: ${formData.projectName}`,
                    body: `Dear ${contact?.name || 'Grant Committee'},\n\nPlease find attached our ${selectedType?.name || 'proposal'} for "${formData.projectName}".\n\nWe look forward to your consideration.\n\nBest regards,\n${orgData.name || '[Your Name]'}`,
                });
                
                // Get AI suggestions
                try {
                    const suggestionsResult = await aiContentAPI.getSuggestions(result.content, {
                        name: foundation.name,
                        focusAreas: foundation.focus_areas,
                        fundingRange: foundation.funding_range,
                    });
                    if (suggestionsResult.success && suggestionsResult.suggestions?.length > 0) {
                        setSuggestions(suggestionsResult.suggestions);
                        setShowSuggestion(true);
                    }
                } catch (e) {
                    console.error('Suggestions error:', e);
                }
                
                setStep('editor');
                setShowFormPanel(false);
                showToast('Draft generated successfully!');
            } else {
                throw new Error('No content generated');
            }
        } catch (error) {
            console.error('❌ [Proposal] AI generation error:', error);
            // Fallback to basic template
            const generatedContent = `Dear ${contact?.name || 'Grant Committee'},\n\nWe are writing regarding ${formData.projectName}.\n\n${formData.summary || 'Please find our proposal enclosed.'}\n\nSincerely,\n${orgData.name || '[Your Organization]'}`;
            
            // Set pending content for editor
            pendingContent.current = generatedContent;
            
            setDocument({
                title: formData.projectName,
                subtitle: `${selectedType?.name || 'Proposal'} for ${foundation.name}`,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                content: generatedContent,
                outcomes: [],
            });
            
            // Directly update editor
            if (editor) {
                isExternalUpdate.current = true;
                editor.commands.setContent(formatContentAsHTML(generatedContent));
                setTimeout(() => { isExternalUpdate.current = false; }, 100);
            }
            
            setStep('editor');
            setShowFormPanel(false);
            showToast('Draft generated (fallback mode)');
        }
        
        setIsGenerating(false);
    };
    
    // Legacy fallback function (kept for reference but not used)
    const handleGenerateDraftLegacy = () => {
        const foundation = selectedDonor?.foundation;
        const contact = selectedContact;
        setTimeout(() => {
            const amount = formData.amount || foundation.funding_range?.replace(/[^0-9-]/g, '').split('-')[0] + ',000';
            const focusAreas = foundation.focus_areas?.split(',').map(f => f.trim()) || [];
            const insights = foundation.ai_insights || {};
            
            let generatedContent = '';
            let generatedOutcomes = [];
            
            if (selectedType?.id === 'loi') {
                generatedContent = `Dear ${contact?.name || 'Grant Committee'},

We are writing to introduce our organization and express our interest in partnering with ${foundation.name} to advance our shared commitment to ${focusAreas[0] || 'community development'}.

${formData.summary || `Our proposed initiative, "${formData.projectName}", aims to create meaningful and measurable impact in our community. This project directly aligns with ${foundation.name}'s focus on ${focusAreas.slice(0, 2).join(' and ')}.`}

${insights.summary ? `We have carefully reviewed your foundation's priorities and believe our approach aligns well with your mission. ${insights.summary}` : ''}

We respectfully request the opportunity to submit a full proposal for a grant of ${formData.amount ? '$' + Number(formData.amount).toLocaleString() : foundation.funding_range || '$50,000'}. We believe this partnership would enable us to:

${formData.goals || `• Expand our reach to underserved communities
• Implement evidence-based interventions
• Create sustainable, long-term impact`}

Thank you for considering this inquiry. We look forward to the possibility of discussing this opportunity further.

Sincerely,
[Your Organization]`;
                generatedOutcomes = [
                    'Initial partnership discussion with foundation',
                    'Full proposal submission if LOI approved',
                    'Program implementation timeline: ' + formData.timeline,
                ];
            } else if (selectedType?.id === 'proposal') {
                generatedContent = `EXECUTIVE SUMMARY

${formData.projectName} is a comprehensive initiative designed to address critical needs in ${focusAreas[0] || 'our community'}. We are seeking a grant of ${formData.amount ? '$' + Number(formData.amount).toLocaleString() : foundation.funding_range || '$50,000'} from ${foundation.name} to implement this ${formData.timeline} program.

STATEMENT OF NEED

${formData.summary || `Our community faces significant challenges that require immediate attention. Through extensive research and community engagement, we have identified key areas where targeted intervention can create lasting positive change.`}

${foundation.ai_insights?.keyOpportunities ? `This proposal directly addresses opportunities identified in your foundation's priorities:\n• ${foundation.ai_insights.keyOpportunities.slice(0, 3).join('\n• ')}` : ''}

PROJECT DESCRIPTION

${formData.goals || `Our approach combines evidence-based practices with innovative solutions tailored to our community's unique needs. The program will be implemented in phases over ${formData.timeline}, with clear milestones and measurable outcomes at each stage.`}

ORGANIZATIONAL CAPACITY

Our organization has a proven track record of delivering results. We maintain strong financial controls, transparent reporting practices, and a dedicated team committed to our mission.

BUDGET OVERVIEW

Total Request: ${formData.amount ? '$' + Number(formData.amount).toLocaleString() : foundation.funding_range || '$50,000'}
Project Duration: ${formData.timeline}

${formData.includeBudget ? `Proposed Budget Allocation:
• Personnel & Staffing: 45%
• Program Activities: 30%
• Materials & Equipment: 15%
• Administrative & Overhead: 10%` : ''}

EVALUATION PLAN

We will measure success through:
• Quantitative metrics tracking participation and outcomes
• Qualitative feedback from beneficiaries and stakeholders
• Regular progress reports to ${foundation.name}

CONCLUSION

We believe this partnership with ${foundation.name} will enable transformative impact in our community. We are committed to transparency, accountability, and excellence in program delivery.`;
                generatedOutcomes = [
                    `Serve ${Math.floor(Math.random() * 500 + 200)} direct beneficiaries in Year 1`,
                    `Achieve ${Math.floor(Math.random() * 20 + 80)}% program completion rate`,
                    `Establish ${Math.floor(Math.random() * 5 + 3)} community partnerships`,
                    `Create sustainable infrastructure for continued impact`,
                ];
            } else if (selectedType?.id === 'thankyou') {
                generatedContent = `Dear ${contact?.name || 'Friends at ' + foundation.name},

On behalf of our entire organization and the communities we serve, I want to express our heartfelt gratitude for ${foundation.name}'s generous support of our ${formData.projectName || 'programs'}.

Your investment has made a tangible difference in the lives of those we serve. ${formData.summary || 'Thanks to your support, we have been able to expand our reach, deepen our impact, and continue our mission of creating positive change.'}

We are honored to count ${foundation.name} among our valued partners and look forward to sharing updates on the impact of your contribution.

With sincere appreciation,
[Your Name]
[Your Organization]`;
                generatedOutcomes = [
                    'Express gratitude for support',
                    'Highlight impact of contribution',
                    'Strengthen donor relationship',
                ];
            } else {
                // Default/Cover letter
                generatedContent = `Dear ${contact?.name || 'Grant Committee'},

Please find enclosed our ${selectedType?.name || 'proposal'} for ${formData.projectName || 'our initiative'}.

${formData.summary || `This submission represents our commitment to advancing ${focusAreas[0] || 'positive community outcomes'} through strategic partnership with ${foundation.name}.`}

We have carefully reviewed ${foundation.name}'s priorities and believe our work aligns closely with your foundation's mission. ${insights.approachStrategy || ''}

We welcome the opportunity to discuss this proposal at your convenience.

Respectfully submitted,
[Your Organization]`;
                generatedOutcomes = [
                    'Formal introduction to proposal',
                    'Highlight alignment with foundation priorities',
                    'Request for consideration',
                ];
            }

            setDocument({
                title: formData.projectName,
                subtitle: `${selectedType?.name || 'Proposal'} for ${foundation.name}`,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                content: generatedContent,
                outcomes: generatedOutcomes,
            });

            // Set up email data
            setEmailData({
                recipient: contact?.email || `grants@${foundation.name.toLowerCase().replace(/\s+/g, '')}.org`,
                subject: `${selectedType?.name || 'Proposal'}: ${formData.projectName}`,
                body: `Dear ${contact?.name || 'Grant Committee'},

Please find attached our ${selectedType?.name || 'proposal'} for "${formData.projectName}".

We believe this initiative aligns well with ${foundation.name}'s commitment to ${focusAreas[0] || 'community impact'}.

We look forward to your consideration.

Best regards,
[Your Name]`,
            });

            // Generate initial suggestion
            setSuggestions([{
                id: 1,
                type: 'enhancement',
                text: `Consider adding specific data about ${foundation.name}'s previous grants in ${focusAreas[0] || 'this area'} to strengthen alignment.`,
            }]);
            setShowSuggestion(true);

            setIsGenerating(false);
            setStep('editor');
            setShowFormPanel(false);
            showToast('Draft generated successfully!');
        }, 2000);
    }; // End of legacy function

    const handleSaveDraft = () => {
        setLastSaved('just now');
        // Save to recent docs in localStorage
        const newDoc = {
            id: Date.now(),
            name: document.title || formData.projectName || 'Untitled',
            donor: selectedDonor?.foundation?.name || 'Unknown',
            type: selectedType?.name || 'Full Proposal',
            typeId: selectedType?.id || 'proposal',
            lastEdited: 'Just now',
            status: 'Draft',
            content: document.content,
            formData: formData,
            donorId: selectedDonor?.foundation?.id,
            outcomes: document.outcomes || [],
            savedAt: new Date().toISOString(),
        };
        const updatedDocs = [newDoc, ...recentDocs.filter(d => d.id !== newDoc.id).slice(0, 9)];
        setRecentDocs(updatedDocs);
        localStorage.setItem('recentProposals', JSON.stringify(updatedDocs));
        showToast('Draft saved!');
    };

    const handleApplySuggestion = (suggestion) => {
        if (suggestion.type === 'enhancement') {
            setDocument(prev => ({
                ...prev,
                content: prev.content + '\n\n' + suggestion.text,
            }));
        }
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        setShowSuggestion(suggestions.length > 1);
        setProposalStrength(prev => Math.min(100, prev + 5));
        showToast('Suggestion applied!');
    };

    const handleRewriteStyle = (style) => {
        setIsGenerating(true);
        setTimeout(() => {
            let newContent = document.content;
            if (style === 'Formal') {
                newContent = document.content
                    .replace(/We are writing/g, 'We respectfully submit this correspondence')
                    .replace(/want to/g, 'wish to')
                    .replace(/really/g, 'significantly');
            } else if (style === 'Persuasive') {
                newContent = document.content + `\n\nThis strategic investment will yield transformative results that align perfectly with ${selectedDonor?.foundation?.name || 'your foundation'}'s mission. The potential for lasting community impact makes this an exceptional opportunity for meaningful partnership.`;
            } else if (style === 'Concise') {
                // Keep first paragraph and key sections
                const paragraphs = document.content.split('\n\n');
                newContent = paragraphs.slice(0, Math.ceil(paragraphs.length / 2)).join('\n\n');
            } else if (style === 'Expand') {
                newContent = document.content + `\n\nFurthermore, our organization has a proven track record of delivering measurable outcomes. Over the past five years, we have successfully implemented similar programs reaching over 10,000 beneficiaries with a 95% satisfaction rate. Our team brings decades of combined expertise in program design, implementation, and evaluation.`;
            }
            setDocument(prev => ({ ...prev, content: newContent }));
            setIsGenerating(false);
            showToast(`Content rewritten in ${style} style!`);
        }, 1000);
    };

    const handleAiChat = () => {
        if (!aiChatInput.trim()) return;
        setIsGenerating(true);
        const query = aiChatInput.toLowerCase();
        setTimeout(() => {
            let addition = '';
            if (query.includes('budget')) {
                addition = `\n\nDETAILED BUDGET BREAKDOWN\n\nPersonnel (45% - $${Math.round((formData.amount || 50000) * 0.45).toLocaleString()})\n• Program Director (0.5 FTE)\n• Program Coordinators (2.0 FTE)\n• Administrative Support (0.25 FTE)\n\nProgram Activities (30% - $${Math.round((formData.amount || 50000) * 0.30).toLocaleString()})\n• Direct services and materials\n• Community events and outreach\n• Participant support\n\nEquipment & Supplies (15% - $${Math.round((formData.amount || 50000) * 0.15).toLocaleString()})\n• Technology and equipment\n• Office supplies\n• Program materials\n\nAdministrative (10% - $${Math.round((formData.amount || 50000) * 0.10).toLocaleString()})\n• Overhead and indirect costs`;
            } else if (query.includes('timeline') || query.includes('schedule')) {
                addition = `\n\nPROJECT TIMELINE\n\nMonths 1-3: Planning & Setup\n• Hire and train staff\n• Establish partnerships\n• Develop program materials\n\nMonths 4-9: Implementation\n• Launch core programming\n• Recruit participants\n• Deliver services\n\nMonths 10-12: Evaluation & Reporting\n• Collect outcome data\n• Analyze results\n• Submit final report to ${selectedDonor?.foundation?.name || 'funder'}`;
            } else if (query.includes('outcome') || query.includes('impact')) {
                addition = `\n\nEXPECTED OUTCOMES & IMPACT\n\n• Serve 500+ direct beneficiaries\n• Achieve 85%+ program completion rate\n• 90% participant satisfaction\n• Measurable improvement in target metrics\n• Sustainable community infrastructure`;
            } else {
                addition = `\n\n${aiChatInput}`;
            }
            setDocument(prev => ({
                ...prev,
                content: prev.content + addition,
            }));
            setAiChatInput('');
            setIsGenerating(false);
            showToast('AI response added!');
        }, 1500);
    };

    const handlePreview = () => {
        setStep('preview');
    };

    const handleSendProposal = () => {
        setStep('send');
    };

    const handleConfirmSend = async () => {
        setIsGenerating(true);
        
        try {
            // Get email settings
            const emailSettingsStr = localStorage.getItem('emailSettings');
            const emailSettings = emailSettingsStr ? JSON.parse(emailSettingsStr) : { provider: 'gmail' };
            const googleAuth = getStoredGoogleTokens();
            
            const recipientEmail = emailData.recipient || selectedContact?.email;
            
            if (!recipientEmail) {
                showToast('No recipient email address', 'error');
                setIsGenerating(false);
                return;
            }
            
            console.log('📧 [Proposal] Sending email via:', emailSettings.provider);
            console.log('📧 [Proposal] To:', recipientEmail);
            
            // Prepare email content
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                    ${emailData.body?.replace(/\n/g, '<br>') || ''}
                    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
                    <p style="color: #64748b; font-size: 14px;">
                        <strong>Attachment:</strong> ${document.title || 'Proposal'}.pdf
                    </p>
                </div>
            `;
            
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
                console.log('✅ [Proposal] Email sent successfully via', result.provider);
                setStep('sent');
                
                // Save sent document to recent docs
                const sentDoc = {
                    id: Date.now(),
                    name: document.title || formData.projectName || 'Untitled',
                    donor: selectedDonor?.foundation?.name || 'Unknown',
                    type: selectedType?.name || 'Full Proposal',
                    typeId: selectedType?.id || 'proposal',
                    lastEdited: 'Just now',
                    status: 'Sent',
                    content: document.content,
                    formData: formData,
                    donorId: selectedDonor?.foundation?.id,
                    outcomes: document.outcomes || [],
                    savedAt: new Date().toISOString(),
                    sentTo: recipientEmail,
                };
                const updatedDocs = [sentDoc, ...recentDocs.filter(d => d.name !== sentDoc.name || d.donorId !== sentDoc.donorId).slice(0, 9)];
                setRecentDocs(updatedDocs);
                localStorage.setItem('recentProposals', JSON.stringify(updatedDocs));
            } else {
                console.error('❌ [Proposal] Email failed:', result.error);
                showToast(result.error || 'Failed to send email', 'error');
            }
        } catch (error) {
            console.error('❌ [Proposal] Email error:', error);
            showToast('Failed to send email. Check your email settings.', 'error');
        }
        
        setIsGenerating(false);
    };

    const handleEnhanceEmail = () => {
        setIsGenerating(true);
        const contact = selectedContact;
        const foundation = selectedDonor?.foundation;
        setTimeout(() => {
            setEmailData(prev => ({
                ...prev,
                body: `Dear ${contact?.name || 'Grant Committee'},

I hope this message finds you well. ${foundation ? `Having researched ${foundation.name}'s remarkable commitment to ${foundation.focus_areas?.split(',')[0]?.trim() || 'community impact'}, I am confident that our program aligns seamlessly with your strategic priorities.` : ''}

Please find attached our ${selectedType?.name || 'proposal'} for "${formData.projectName}". The enclosed document outlines a comprehensive approach that we believe represents an exceptional opportunity for meaningful partnership.

I would welcome the opportunity to discuss this initiative further at your earliest convenience.

With warm regards,
[Your Name]`,
            }));
            setIsGenerating(false);
            showToast('Email enhanced with AI!');
        }, 1200);
    };

    const handleDownloadPDF = () => {
        // Create a printable version and trigger print dialog
        const printContent = `
            <html>
            <head>
                <title>${document.title}</title>
                <style>
                    body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 40px; line-height: 1.6; }
                    h1 { color: #1B365D; font-size: 24px; margin-bottom: 8px; }
                    h2 { color: #1B365D; font-size: 18px; margin-top: 24px; }
                    .subtitle { color: #64748b; margin-bottom: 4px; }
                    .date { color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
                    .content { white-space: pre-wrap; }
                    ul { padding-left: 20px; }
                    li { margin-bottom: 8px; }
                </style>
            </head>
            <body>
                <h1>${document.title}</h1>
                <p class="subtitle">${document.subtitle}</p>
                <p class="date">${document.date}</p>
                <div class="content">${document.content}</div>
                ${document.outcomes.length > 0 ? `
                <h2>Key Outcomes</h2>
                <ul>
                    ${document.outcomes.map(o => `<li>${o}</li>`).join('')}
                </ul>
                ` : ''}
            </body>
            </html>
        `;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        showToast('PDF download initiated!');
    };

    const handleOpenDocument = (doc) => {
        // Restore saved document
        if (doc.content) {
            setDocument({
                title: doc.name,
                subtitle: `${doc.type} • ${doc.donor}`,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                content: doc.content,
                outcomes: doc.outcomes || [],
            });
            if (doc.formData) {
                setFormData(doc.formData);
            }
            if (doc.donorId) {
                const donor = campaignDonors.find(d => d.foundation?.id === doc.donorId);
                if (donor) setSelectedDonor(donor);
            }
            // Restore document type
            if (doc.typeId) {
                const docType = documentTypes.find(t => t.id === doc.typeId);
                if (docType) setSelectedType(docType);
            }
            // Update TipTap editor content
            if (editor) {
                editor.commands.setContent(formatContentAsHTML(doc.content));
            }
        }
        setStep('editor');
    };

    const handleNewDocument = () => {
        setSelectedType(null);
        setSelectedDonor(null);
        setSelectedContact(null);
        setFormData({
            projectName: '',
            amount: '',
            summary: '',
            goals: '',
            timeline: '12 months',
            includeBudget: true,
        });
        setDocument({
            title: '',
            subtitle: '',
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            content: '',
            outcomes: [],
        });
        setShowFormPanel(false);
        setStep('select');
    };

    // Template Selection Screen
    if (step === 'select') {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
                {/* Main Content */}
                <div style={{ flex: 1, padding: '32px', maxWidth: showFormPanel ? 'calc(100% - 400px)' : '100%' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1B365D', margin: '0 0 8px' }}>Proposal Writer AI</h1>
                            <p style={{ color: '#64748b', margin: 0 }}>Select a document type, choose your donor, and let AI generate a personalized draft.</p>
                        </div>
                        <button 
                            onClick={handleNewDocument}
                            style={{ padding: '12px 20px', background: '#1B365D', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                        >
                            + New Document
                        </button>
                    </div>

                    {/* Create New Document */}
                    <div style={{ marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>✨</span> Create New Document
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            {documentTypes.map(type => (
                                <div
                                    key={type.id}
                                    onClick={() => handleSelectType(type)}
                                    style={{
                                        padding: '24px',
                                        background: 'white',
                                        borderRadius: '12px',
                                        border: selectedType?.id === type.id ? '2px solid #C9A227' : '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: selectedType?.id === type.id ? '#FEF3C7' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '16px' }}>
                                        {type.icon}
                                    </div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 8px' }}>{type.name}</h3>
                                    <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{type.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Documents */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Recent Documents</h2>
                            {recentDocs.length > 0 && (
                                <button style={{ background: 'none', border: 'none', color: '#C9A227', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>View All</button>
                            )}
                        </div>
                        {recentDocs.length === 0 ? (
                            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '48px', textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📄</div>
                                <p style={{ color: '#64748b', margin: 0 }}>No recent documents. Select a template above to create your first proposal.</p>
                            </div>
                        ) : (
                            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Name</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Donor</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentDocs.map(doc => (
                                            <tr key={doc.id} style={{ borderTop: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => handleOpenDocument(doc)}>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: doc.type?.includes('Proposal') ? '#DBEAFE' : doc.type?.includes('Report') ? '#FEF3C7' : '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {doc.type?.includes('Proposal') ? '📄' : doc.type?.includes('Report') ? '📈' : doc.type?.includes('Thank') ? '💛' : '✉️'}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{doc.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{doc.savedAt ? formatTimeAgo(doc.savedAt) : doc.lastEdited}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '0.875rem', color: '#64748b' }}>{doc.donor}</td>
                                                <td style={{ padding: '16px', fontSize: '0.875rem', color: '#64748b' }}>{doc.type}</td>
                                                <td style={{ padding: '16px' }}>
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        background: doc.status === 'Draft' ? '#f1f5f9' : doc.status === 'Sent' ? '#D1FAE5' : '#FEF3C7',
                                                        color: doc.status === 'Draft' ? '#64748b' : doc.status === 'Sent' ? '#059669' : '#B45309',
                                                    }}>{doc.status}</span>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenDocument(doc); }}
                                                        style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
                                                    >
                                                        {doc.status === 'Sent' ? '👁️' : '✏️'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Generate Form Panel - Side Navigation */}
                {showFormPanel && selectedType && (
                    <div style={{ width: '420px', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Panel Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '1.25rem' }}>{selectedType.icon}</span>
                                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', margin: 0 }}>{selectedType.name}</h2>
                                    </div>
                                    <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Configure your document and let AI generate a draft</p>
                                </div>
                                <button onClick={() => { setShowFormPanel(false); setSelectedType(null); setSelectedDonor(null); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', color: 'white', fontSize: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                            </div>
                        </div>

                        {/* Scrollable Form Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            {/* Step 1: Select Campaign (Optional) */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>1</div>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Campaign <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                                </div>
                                <select
                                    value={selectedCampaign?.id || ''}
                                    onChange={(e) => {
                                        const campaign = campaigns.find(c => c.id === e.target.value);
                                        setSelectedCampaign(campaign || null);
                                        setSelectedDonor(null);
                                    }}
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', background: 'white', cursor: 'pointer' }}
                                >
                                    <option value="">All Foundations</option>
                                    {campaigns.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Step 2: Select Donor/Foundation - Dropdown */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: selectedDonor ? '#C9A227' : '#f1f5f9', color: selectedDonor ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>2</div>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Select Foundation *</label>
                                </div>
                                <select
                                    value={selectedDonor?.foundation?.id || ''}
                                    onChange={(e) => {
                                        const donor = campaignDonors.find(d => d.foundation?.id === e.target.value);
                                        setSelectedDonor(donor || null);
                                    }}
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px 14px', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '8px', 
                                        fontSize: '0.875rem', 
                                        background: 'white', 
                                        cursor: 'pointer',
                                        color: selectedDonor ? '#1e293b' : '#94a3b8',
                                    }}
                                >
                                    <option value="">Select a foundation...</option>
                                    {campaignDonors.map(donor => (
                                        <option key={donor.foundation?.id} value={donor.foundation?.id}>
                                            {donor.foundation?.name} {donor.foundation?.funding_range ? `• ${donor.foundation?.funding_range}` : ''} {donor.foundation?.alignment_score ? `• ${donor.foundation?.alignment_score}% match` : ''}
                                        </option>
                                    ))}
                                </select>
                                {selectedDonor && (
                                    <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#1B365D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 600, flexShrink: 0 }}>
                                            {selectedDonor.foundation?.name?.split(' ').slice(0, 2).map(w => w[0]).join('')}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{selectedDonor.foundation?.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {selectedDonor.foundation?.city}, {selectedDonor.foundation?.state} {selectedDonor.foundation?.focus_areas && `• ${Array.isArray(selectedDonor.foundation.focus_areas) ? selectedDonor.foundation.focus_areas.slice(0, 2).join(', ') : selectedDonor.foundation.focus_areas}`}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Step 3: Select Contact */}
                            {selectedDonor && donorContacts.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: selectedContact ? '#C9A227' : '#f1f5f9', color: selectedContact ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>3</div>
                                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Address To</label>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {donorContacts.map(contact => (
                                            <button
                                                key={contact.id}
                                                onClick={() => setSelectedContact(contact)}
                                                style={{
                                                    padding: '8px 12px',
                                                    border: selectedContact?.id === contact.id ? '2px solid #C9A227' : '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    background: selectedContact?.id === contact.id ? '#FFFBEB' : 'white',
                                                    fontSize: '0.8125rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                }}
                                            >
                                                <span style={{ fontWeight: 500, color: '#1e293b' }}>{contact.name}</span>
                                                <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{contact.role}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Project Details */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: formData.projectName ? '#C9A227' : '#f1f5f9', color: formData.projectName ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>{donorContacts.length > 0 ? '4' : '3'}</div>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Project Details *</label>
                                </div>
                                
                                <input
                                    type="text"
                                    placeholder="Project/Initiative Name"
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '12px', boxSizing: 'border-box' }}
                                />

                                {/* Amount & Timeline - Only show for LOI and Full Proposal */}
                                {(selectedType?.id === 'loi' || selectedType?.id === 'proposal') && (
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                                <span style={{ padding: '12px', background: '#f8fafc', color: '#64748b', borderRight: '1px solid #e2e8f0' }}>$</span>
                                                <input
                                                    type="text"
                                                    placeholder="Requested Amount"
                                                    value={formData.amount}
                                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value.replace(/[^0-9]/g, '') })}
                                                    style={{ flex: 1, padding: '12px', border: 'none', fontSize: '0.875rem', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                        <select
                                            value={formData.timeline}
                                            onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                                            style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', background: 'white' }}
                                        >
                                            <option value="6 months">6 months</option>
                                            <option value="12 months">12 months</option>
                                            <option value="18 months">18 months</option>
                                            <option value="24 months">24 months</option>
                                        </select>
                                    </div>
                                )}
                                
                                {/* Timeline only for other document types */}
                                {selectedType?.id !== 'loi' && selectedType?.id !== 'proposal' && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <select
                                            value={formData.timeline}
                                            onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                                            style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', background: 'white' }}
                                        >
                                            <option value="">Select reporting period</option>
                                            <option value="Q1 2024">Q1 2024</option>
                                            <option value="Q2 2024">Q2 2024</option>
                                            <option value="Q3 2024">Q3 2024</option>
                                            <option value="Q4 2024">Q4 2024</option>
                                            <option value="FY 2024">FY 2024</option>
                                        </select>
                                    </div>
                                )}

                                <textarea
                                    placeholder="Brief project summary - describe your goals, target population, and expected impact..."
                                    value={formData.summary}
                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                                />
                            </div>

                            {/* AI Context from Donor */}
                            {selectedDonor?.foundation?.ai_insights && (
                                <div style={{ padding: '16px', background: '#FFFBEB', borderRadius: '12px', border: '1px solid #FCD34D', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <span>✨</span>
                                        <span style={{ fontWeight: 600, color: '#92400E', fontSize: '0.875rem' }}>AI Insights</span>
                                    </div>
                                    <p style={{ fontSize: '0.8125rem', color: '#78350F', margin: 0, lineHeight: 1.5 }}>
                                        {selectedDonor.foundation.ai_insights.summary}
                                    </p>
                                    {selectedDonor.foundation.ai_insights.approachStrategy && (
                                        <p style={{ fontSize: '0.75rem', color: '#92400E', margin: '8px 0 0', fontStyle: 'italic' }}>
                                            Tip: {selectedDonor.foundation.ai_insights.approachStrategy}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Include Budget Toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid #e2e8f0' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Include Budget Breakdown</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>AI will generate a detailed budget</div>
                                </div>
                                <button
                                    onClick={() => setFormData({ ...formData, includeBudget: !formData.includeBudget })}
                                    style={{
                                        width: '44px',
                                        height: '24px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: formData.includeBudget ? '#C9A227' : '#e2e8f0',
                                        cursor: 'pointer',
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: 'white',
                                        position: 'absolute',
                                        top: '3px',
                                        left: formData.includeBudget ? '23px' : '3px',
                                        transition: 'left 0.2s',
                                    }} />
                                </button>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <button
                                onClick={handleGenerateDraft}
                                disabled={isGenerating || !selectedDonor || !formData.projectName}
                                style={{ 
                                    width: '100%', 
                                    padding: '14px', 
                                    background: (isGenerating || !selectedDonor || !formData.projectName) ? '#94a3b8' : 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)', 
                                    border: 'none', 
                                    borderRadius: '10px', 
                                    color: 'white', 
                                    fontSize: '1rem', 
                                    fontWeight: 600, 
                                    cursor: (isGenerating || !selectedDonor || !formData.projectName) ? 'not-allowed' : 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '8px',
                                    boxShadow: (isGenerating || !selectedDonor || !formData.projectName) ? 'none' : '0 4px 14px rgba(201, 162, 39, 0.3)',
                                }}
                            >
                                {isGenerating ? (
                                    <>⏳ Generating Draft...</>
                                ) : (
                                    <>✨ Generate AI Draft</>
                                )}
                            </button>
                            {(!selectedDonor || !formData.projectName) && (
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', margin: '8px 0 0' }}>
                                    {!selectedDonor ? 'Select a foundation to continue' : 'Enter a project name to continue'}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast.show && (
                    <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', background: toast.type === 'error' ? '#FEE2E2' : '#DCFCE7', color: toast.type === 'error' ? '#DC2626' : '#166534', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 500, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', zIndex: 1001, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {toast.type === 'error' ? '⚠️' : '✓'} {toast.message}
                    </div>
                )}
            </div>
        );
    }

    // Editor Screen
    if (step === 'editor') {
        return (
            <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
                {/* Document Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Header Toolbar */}
                    <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button onClick={() => setStep('select')} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b', padding: '4px' }}>←</button>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>{selectedDonor?.foundation?.name || 'Grant'}</span>
                                    <span style={{ padding: '3px 10px', background: '#1B365D', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600, color: 'white', letterSpacing: '0.02em' }}>DRAFT</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{selectedType?.name || 'Full Proposal'} • Last saved {lastSaved || '2 mins ago'}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* User Avatar with AI indicator */}
                            <div style={{ position: 'relative' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#C9A227', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 600 }}>
                                    SJ
                                </div>
                                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '16px', height: '16px', borderRadius: '50%', background: '#1B365D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700, border: '2px solid white' }}>
                                    AI
                                </div>
                            </div>
                            <button onClick={handlePreview} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem', color: '#1e293b', cursor: 'pointer' }}>Preview</button>
                            <button onClick={handleSaveDraft} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#1B365D', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Save Draft</button>
                        </div>
                    </div>

                    {/* Formatting Toolbar - Connected to TipTap */}
                    <div style={{ padding: '10px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select 
                            onChange={(e) => {
                                if (!editor) return;
                                const value = e.target.value;
                                if (value === 'p') editor.chain().focus().setParagraph().run();
                                else if (value === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
                                else if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                                else if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
                            }}
                            style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#1e293b', background: 'white', cursor: 'pointer', minWidth: '120px' }}
                        >
                            <option value="p">Normal Text</option>
                            <option value="h1">Heading 1</option>
                            <option value="h2">Heading 2</option>
                            <option value="h3">Heading 3</option>
                        </select>
                        <div style={{ height: '24px', width: '1px', background: '#e2e8f0', margin: '0 8px' }} />
                        <button 
                            onClick={() => editor?.chain().focus().toggleBold().run()}
                            style={{ width: '36px', height: '36px', border: 'none', background: editor?.isActive('bold') ? '#f1f5f9' : 'none', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', color: '#374151', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >B</button>
                        <button 
                            onClick={() => editor?.chain().focus().toggleItalic().run()}
                            style={{ width: '36px', height: '36px', border: 'none', background: editor?.isActive('italic') ? '#f1f5f9' : 'none', fontStyle: 'italic', cursor: 'pointer', fontSize: '1rem', color: '#374151', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >I</button>
                        <button 
                            onClick={() => editor?.chain().focus().toggleUnderline().run()}
                            style={{ width: '36px', height: '36px', border: 'none', background: editor?.isActive('underline') ? '#f1f5f9' : 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '1rem', color: '#374151', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >U</button>
                        <div style={{ height: '24px', width: '1px', background: '#e2e8f0', margin: '0 8px' }} />
                        <button 
                            onClick={() => editor?.chain().focus().toggleBulletList().run()}
                            style={{ width: '36px', height: '36px', border: 'none', background: editor?.isActive('bulletList') ? '#f1f5f9' : 'none', cursor: 'pointer', fontSize: '1rem', color: '#374151', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >•≡</button>
                        <button 
                            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                            style={{ width: '36px', height: '36px', border: 'none', background: editor?.isActive('orderedList') ? '#f1f5f9' : 'none', cursor: 'pointer', fontSize: '1rem', color: '#374151', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >1≡</button>
                        <div style={{ height: '24px', width: '1px', background: '#e2e8f0', margin: '0 8px' }} />
                        <button 
                            onClick={() => {
                                const url = window.prompt('Enter URL:');
                                if (url) editor?.chain().focus().setLink({ href: url }).run();
                            }}
                            style={{ width: '36px', height: '36px', border: 'none', background: editor?.isActive('link') ? '#FEF3C7' : 'none', cursor: 'pointer', fontSize: '0.875rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >🔗</button>
                        <button style={{ width: '36px', height: '36px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#374151', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖼</button>
                        <div style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: '#94a3b8' }}>{wordCount.toLocaleString()} words</div>
                    </div>

                    {/* Document Content Area - TipTap Editor */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 60px', background: '#f8fafc' }}>
                        <div style={{ maxWidth: '680px', margin: '0 auto', background: 'white', padding: '48px 56px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            {/* Document Title - Editable */}
                            <input
                                type="text"
                                value={formData.projectName || document.title || ''}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, projectName: e.target.value }));
                                    setDocument(prev => ({ ...prev, title: e.target.value }));
                                }}
                                placeholder="Enter project title..."
                                style={{ 
                                    fontSize: '1.75rem', 
                                    fontWeight: 700, 
                                    color: '#1B365D', 
                                    margin: '0 0 8px', 
                                    border: 'none', 
                                    outline: 'none', 
                                    width: '100%', 
                                    background: 'transparent',
                                    lineHeight: 1.3,
                                }}
                            />
                            <p style={{ color: '#64748b', margin: '0 0 4px', fontSize: '0.9375rem' }}>{document.subtitle}</p>
                            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 32px' }}>{document.date}</p>

                            {/* TipTap Rich Text Editor */}
                            <div style={{ 
                                border: '1px solid transparent',
                                borderRadius: '8px',
                                minHeight: '400px',
                                transition: 'border-color 0.2s',
                            }}>
                                <style jsx global>{`
                                    .ProseMirror {
                                        outline: none;
                                        min-height: 400px;
                                    }
                                    .ProseMirror p {
                                        margin: 0 0 1em;
                                        line-height: 1.8;
                                        color: #475569;
                                    }
                                    .ProseMirror h1 {
                                        font-size: 1.5rem;
                                        font-weight: 700;
                                        color: #1e293b;
                                        margin: 1.5em 0 0.5em;
                                    }
                                    .ProseMirror h2 {
                                        font-size: 1.25rem;
                                        font-weight: 700;
                                        color: #1e293b;
                                        margin: 1.5em 0 0.5em;
                                    }
                                    .ProseMirror h3 {
                                        font-size: 1.125rem;
                                        font-weight: 600;
                                        color: #1e293b;
                                        margin: 1.25em 0 0.5em;
                                    }
                                    .ProseMirror ul, .ProseMirror ol {
                                        padding-left: 1.5em;
                                        margin: 0 0 1em;
                                    }
                                    .ProseMirror li {
                                        margin-bottom: 0.5em;
                                        line-height: 1.8;
                                        color: #475569;
                                    }
                                    .ProseMirror strong {
                                        font-weight: 600;
                                        color: #1e293b;
                                    }
                                    .ProseMirror a {
                                        color: #C9A227;
                                        text-decoration: underline;
                                    }
                                    .ProseMirror p.is-editor-empty:first-child::before {
                                        content: attr(data-placeholder);
                                        float: left;
                                        color: #94a3b8;
                                        pointer-events: none;
                                        height: 0;
                                    }
                                `}</style>
                                {editor && <EditorContent editor={editor} />}
                            </div>

                            {/* Project Goals & Outcomes */}
                            {document.outcomes.length > 0 && (
                                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                                    <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>Project Goals & Outcomes</h2>
                                    <ul style={{ lineHeight: 1.8, color: '#475569', paddingLeft: '24px', margin: 0 }}>
                                        {document.outcomes.map((outcome, i) => (
                                            <li key={i} style={{ marginBottom: '12px' }}>
                                                <strong style={{ color: '#1e293b' }}>Outcome {i + 1}:</strong> {outcome}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Progress Bar */}
                    <div style={{ padding: '16px 24px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Step 1: Draft */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#22C55E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>✓</div>
                                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Draft</span>
                            </div>
                            <div style={{ width: '48px', height: '3px', background: '#22C55E', borderRadius: '2px' }} />
                            {/* Step 2: Review */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#C9A227', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>2</div>
                                <span style={{ fontSize: '0.8125rem', color: '#1e293b', fontWeight: 600 }}>Review</span>
                            </div>
                            <div style={{ width: '48px', height: '3px', background: '#e2e8f0', borderRadius: '2px' }} />
                            {/* Step 3: Send */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>3</div>
                                <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Send</span>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#22C55E' }}>Ready for Review</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>All required fields completed</div>
                            </div>
                            <button onClick={() => showToast('Feedback link copied!')} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem', color: '#1e293b', cursor: 'pointer', fontWeight: 500 }}>Share for Feedback</button>
                            <button onClick={handleSendProposal} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#C9A227', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Send Proposal <span style={{ fontSize: '1rem' }}>➤</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Assistant Panel */}
                <div style={{ width: '340px', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.125rem' }}>✨</span>
                                <span style={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>AI Assistant</span>
                            </div>
                            <span style={{ padding: '3px 10px', background: '#1B365D', color: 'white', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.03em' }}>BETA</span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Real-time suggestions enabled</div>
                    </div>

                    <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
                        {/* Tone Improvement Suggestion Card */}
                        {showSuggestion && (
                            <div style={{ background: '#FFFBEB', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #FDE68A' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <div style={{ width: '8px', height: '8px', background: '#F59E0B', transform: 'rotate(45deg)' }} />
                                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tone Improvement</span>
                                </div>
                                
                                {/* Original Text */}
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '0.625rem', fontWeight: 600, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Original Text</div>
                                    <div style={{ background: '#FEF3C7', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8125rem', color: '#78350F', lineHeight: 1.5, textDecoration: 'line-through', textDecorationColor: '#D97706' }}>
                                        "This is really bad for the community because it stops kids from going to school and adults from working."
                                    </div>
                                </div>

                                {/* Suggestion */}
                                <div style={{ marginBottom: '14px' }}>
                                    <div style={{ fontSize: '0.625rem', fontWeight: 600, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Suggestion (More Formal)</div>
                                    <div style={{ fontSize: '0.8125rem', color: '#1e293b', lineHeight: 1.6 }}>
                                        "This lack of access significantly hinders community development, preventing children from attending school and restricting economic productivity for adults."
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleApplySuggestion({ text: 'This lack of access significantly hinders community development, preventing children from attending school and restricting economic productivity for adults.' })} style={{ flex: 1, padding: '10px', background: '#C9A227', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <span>✓</span> Apply
                                    </button>
                                    <button onClick={() => setShowSuggestion(false)} style={{ width: '40px', padding: '10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', cursor: 'pointer', color: '#64748b' }}>×</button>
                                </div>
                            </div>
                        )}

                        {/* Rewrite Selection */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Rewrite Selection</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                <button onClick={() => handleRewriteStyle('Formal')} disabled={isGenerating} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.8125rem', color: '#374151', cursor: isGenerating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}>
                                    <span style={{ fontSize: '1rem' }}>🎩</span> Formal
                                </button>
                                <button onClick={() => handleRewriteStyle('Persuasive')} disabled={isGenerating} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.8125rem', color: '#374151', cursor: isGenerating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}>
                                    <span style={{ fontSize: '1rem' }}>😊</span> Persuasive
                                </button>
                                <button onClick={() => handleRewriteStyle('Concise')} disabled={isGenerating} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.8125rem', color: '#374151', cursor: isGenerating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}>
                                    <span style={{ fontSize: '1rem' }}>✂️</span> Concise
                                </button>
                                <button onClick={() => handleRewriteStyle('Expand')} disabled={isGenerating} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.8125rem', color: '#374151', cursor: isGenerating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}>
                                    <span style={{ fontSize: '1rem' }}>↔️</span> Expand
                                </button>
                            </div>
                        </div>

                        {/* Proposal Strength Card */}
                        <div style={{ background: '#1B365D', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>Proposal Strength</span>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#C9A227' }}>{proposalStrength}/100</span>
                            </div>
                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                                <div style={{ width: `${proposalStrength}%`, height: '100%', background: 'linear-gradient(90deg, #22C55E, #C9A227)', borderRadius: '3px', transition: 'width 0.3s' }} />
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
                                Strong narrative. Consider adding 2 more data points to the "Impact" section to improve score.
                            </p>
                        </div>

                        {/* Loading Indicator */}
                        {isGenerating && (
                            <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '8px', animation: 'pulse 1.5s infinite' }}>✨</div>
                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>AI is processing...</div>
                            </div>
                        )}
                    </div>

                    {/* AI Chat Input */}
                    <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                placeholder="Ask AI to write a paragraph..." 
                                value={aiChatInput}
                                onChange={(e) => setAiChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAiChat()}
                                style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', background: 'white' }} 
                            />
                            <button onClick={handleAiChat} disabled={isGenerating || !aiChatInput.trim()} style={{ width: '44px', height: '44px', background: aiChatInput.trim() ? '#C9A227' : '#e2e8f0', border: 'none', borderRadius: '10px', color: 'white', cursor: aiChatInput.trim() ? 'pointer' : 'default', fontSize: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
                        </div>
                    </div>
                </div>

                {/* Toast */}
                {toast.show && (
                    <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', background: toast.type === 'error' ? '#FEE2E2' : '#DCFCE7', color: toast.type === 'error' ? '#DC2626' : '#166534', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 500, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', zIndex: 1001 }}>
                        {toast.type === 'error' ? '⚠️' : '✓'} {toast.message}
                    </div>
                )}
            </div>
        );
    }

    // Preview Screen
    if (step === 'preview') {
        const foundation = selectedDonor?.foundation;
        
        return (
            <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
                {/* Document Preview */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Toolbar */}
                    <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button onClick={() => setStep('editor')} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer' }}>← Back to Editor</button>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handleDownloadPDF} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>⬇</span> Download PDF
                            </button>
                            <button onClick={() => setStep('send')} style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#1B365D', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                                Send Proposal →
                            </button>
                        </div>
                    </div>

                    {/* Document Preview */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 80px', background: '#e2e8f0' }}>
                        <div style={{ maxWidth: '700px', margin: '0 auto', background: 'white', padding: '48px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: '32px', paddingBottom: '24px', borderBottom: '2px solid #1B365D' }}>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B365D', margin: '0 0 8px' }}>{document.title || 'Untitled Proposal'}</h1>
                                <p style={{ fontSize: '0.9375rem', color: '#64748b', margin: 0 }}>{document.subtitle}</p>
                                <p style={{ fontSize: '0.8125rem', color: '#94a3b8', margin: '8px 0 0' }}>{document.date}</p>
                            </div>
                            
                            {/* Content */}
                            <div 
                                style={{ 
                                    fontSize: '1rem', 
                                    lineHeight: 1.8, 
                                    color: '#1e293b',
                                }}
                                dangerouslySetInnerHTML={{ __html: formatContentAsHTML(document.content) }}
                            />
                            
                            {/* Footer */}
                            {foundation && (
                                <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                                        Prepared for {foundation.name}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Send Preview Screen
    if (step === 'send') {
        const foundation = selectedDonor?.foundation;
        const pdfFileName = `${(document.title || 'Proposal').replace(/\s+/g, '_')}_${(foundation?.name || 'Draft').replace(/\s+/g, '_')}.pdf`;
        
        return (
            <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
                {/* Document Preview */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Toolbar */}
                    <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button onClick={() => setStep('editor')} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer' }}>←</button>
                            <div>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{document.title || 'Untitled'}</span>
                                <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#D1FAE5', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 600, color: '#059669' }}>FINAL REVIEW</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleDownloadPDF} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>⬇</span> Download PDF
                            </button>
                            <button onClick={() => showToast('Share link copied!')} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>↗ Share Preview</button>
                        </div>
                    </div>

                    {/* Document Preview */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '40px 80px' }}>
                        <div style={{ maxWidth: '700px', margin: '0 auto', background: 'white', padding: '48px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <div style={{ textAlign: 'right', marginBottom: '40px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#C9A227', marginLeft: 'auto', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                                    PF
                                </div>
                                <div style={{ fontWeight: 600 }}>Your Organization</div>
                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Address Line 1</div>
                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>City, State ZIP</div>
                            </div>

                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B365D', margin: '0 0 8px' }}>{document.title}</h1>
                            <p style={{ color: '#64748b', margin: '0 0 4px' }}>{document.subtitle}</p>
                            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 32px' }}>{document.date}</p>

                            <div style={{ lineHeight: 1.8, color: '#475569', whiteSpace: 'pre-wrap' }}>{document.content}</div>

                            {document.outcomes.length > 0 && (
                                <>
                                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 12px' }}>Key Outcomes</h2>
                                    <ul style={{ lineHeight: 1.7, color: '#475569', paddingLeft: '20px' }}>
                                        {document.outcomes.map((outcome, i) => (
                                            <li key={i} style={{ marginBottom: '8px' }}>{outcome}</li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Send Panel */}
                <div style={{ width: '380px', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #1B365D 0%, #2a4a7a 100%)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#C9A227' }}>▶</span> Ready to Send
                        </h2>
                        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Finalize details and send to {foundation?.name || 'recipient'}</p>
                    </div>

                    <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                        {/* Recipient */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Recipient</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#1B365D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 600 }}>
                                    {selectedContact?.name?.split(' ').map(n => n[0]).join('') || '?'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' }}>{selectedContact?.name || 'Grant Committee'}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emailData.recipient}</div>
                                </div>
                                <span style={{ color: '#22C55E' }}>✓</span>
                            </div>
                        </div>

                        {/* Subject */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Subject Line</label>
                            <input
                                type="text"
                                value={emailData.subject}
                                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Message Body */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Message</label>
                                <button onClick={handleEnhanceEmail} disabled={isGenerating} style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: '#C9A227', cursor: 'pointer', fontWeight: 500 }}>{isGenerating ? '⏳ Enhancing...' : '✨ Enhance with AI'}</button>
                            </div>
                            <textarea
                                value={emailData.body}
                                onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', minHeight: '140px', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6, fontFamily: 'inherit' }}
                            />
                        </div>

                        {/* Attachment */}
                        <div style={{ padding: '12px 14px', background: '#DBEAFE', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>📄</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pdfFileName}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{wordCount > 0 ? `~${Math.ceil(wordCount / 250)} pages` : 'Document'} • PDF attached</div>
                            </div>
                            <span style={{ color: '#22C55E' }}>✓</span>
                        </div>
                    </div>

                    {/* Send Button */}
                    <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <button
                            onClick={handleConfirmSend}
                            disabled={isGenerating}
                            style={{ width: '100%', padding: '14px', background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: isGenerating ? 'wait' : 'pointer', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isGenerating ? 'none' : '0 4px 14px rgba(201, 162, 39, 0.3)' }}
                        >
                            {isGenerating ? '⏳ Sending...' : '▶ Send Now'}
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#22C55E' }}>
                                <span>✓</span> Document ready ({wordCount} words)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#22C55E' }}>
                                <span>✓</span> Recipient verified
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: proposalStrength >= 70 ? '#22C55E' : '#F59E0B' }}>
                                <span>{proposalStrength >= 70 ? '✓' : '⚠'}</span> Proposal strength: {proposalStrength}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toast */}
                {toast.show && (
                    <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '14px 20px', background: toast.type === 'error' ? '#FEE2E2' : '#DCFCE7', color: toast.type === 'error' ? '#DC2626' : '#166534', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 500, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', zIndex: 1001 }}>
                        {toast.type === 'error' ? '⚠️' : '✓'} {toast.message}
                    </div>
                )}
            </div>
        );
    }

    // Proposal Sent Screen
    if (step === 'sent') {
        const foundation = selectedDonor?.foundation;
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 7);
        const followUpDateStr = followUpDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
                {/* Header */}
                <div style={{ padding: '12px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={handleNewDocument} style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer' }}>←</button>
                        <div>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{document.title || 'Untitled'}</span>
                            <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#22C55E', borderRadius: '4px', fontSize: '0.625rem', fontWeight: 600, color: 'white' }}>SENT</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        {foundation?.name} • {selectedType?.name || 'Proposal'}
                    </div>
                    <button onClick={() => setStep('editor')} style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.875rem', cursor: 'pointer' }}>View Document</button>
                </div>

                {/* Success Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 32px' }}>
                    {/* Success Icon */}
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(180deg, #C9A227, #A78B1F)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 8px 32px rgba(201, 162, 39, 0.3)' }}>
                        <span style={{ fontSize: '2rem', color: 'white' }}>✓</span>
                    </div>

                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1B365D', margin: '0 0 12px' }}>
                        {selectedType?.id === 'thankyou' ? 'Thank You Sent!' : 'Proposal Sent!'}
                    </h1>
                    <p style={{ fontSize: '1rem', color: '#64748b', margin: 0, textAlign: 'center', maxWidth: '500px' }}>
                        Your {selectedType?.name?.toLowerCase() || 'proposal'} has been successfully delivered to{' '}
                        <strong style={{ color: '#1B365D' }}>{foundation?.name || 'the recipient'}</strong>.<br />
                        We'll notify you as soon as they engage with your document.
                    </p>

                    {/* Cards Row */}
                    <div style={{ display: 'flex', gap: '24px', marginTop: '48px', maxWidth: '900px', width: '100%' }}>
                        {/* What's Next Card */}
                        <div style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>✨</span> What's Next?
                            </h3>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 20px' }}>AI-recommended actions based on your {selectedType?.name?.toLowerCase() || 'document'}.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <input type="checkbox" style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#C9A227' }} />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>Schedule a follow-up with {selectedContact?.name?.split(' ')[0] || foundation?.name}</span>
                                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#EF4444', padding: '2px 6px', background: '#FEE2E2', borderRadius: '4px' }}>HIGH PRIORITY</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Recommended in 7 days ({followUpDateStr})</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <input type="checkbox" style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#C9A227' }} />
                                    <div>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                            {selectedType?.id === 'loi' ? 'Prepare Full Proposal' : 'Draft Impact Report Outline'}
                                        </span>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {selectedType?.id === 'loi' 
                                                ? 'Be ready if your LOI is accepted' 
                                                : 'Use the metrics defined in your proposal'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <input type="checkbox" style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#C9A227' }} />
                                    <div>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>Log activity in Pipeline</span>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Keep your team updated on outreach progress</div>
                                    </div>
                                </div>
                            </div>

                            <button style={{ marginTop: '20px', background: 'none', border: 'none', color: '#C9A227', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>View All Suggestions →</button>
                        </div>

                        {/* Tracking Card */}
                        <div style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>📊</span> Tracking
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
                                    <span style={{ fontSize: '0.75rem', color: '#22C55E', fontWeight: 500 }}>Live</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                                {[
                                    { icon: '✉️', label: 'OPENED', value: '--' },
                                    { icon: '🖱️', label: 'CLICKED', value: '--' },
                                    { icon: '⬇️', label: 'DOWNLOADED', value: '--' },
                                ].map((stat, i) => (
                                    <div key={i} style={{ textAlign: 'center' }}>
                                        <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '1.25rem' }}>{stat.icon}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{stat.value}</div>
                                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{stat.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Sent Successfully</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '16px' }}>
                                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2e8f0' }} />
                                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Waiting for activity...</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
                        <button
                            onClick={handleNewDocument}
                            style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #C9A227 0%, #A78B1F 100%)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(201, 162, 39, 0.3)' }}
                        >
                            <span>✨</span> Create Another Document
                        </button>
                        <button
                            onClick={handleNewDocument}
                            style={{ padding: '12px 24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <span>🏠</span> Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
