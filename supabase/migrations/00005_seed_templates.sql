-- Migration: 00005_seed_templates
-- Description: Seed data for system email templates

-- ============================================================================
-- SYSTEM EMAIL TEMPLATES
-- ============================================================================

INSERT INTO email_templates (
    id,
    organization_id,
    title,
    subject,
    body,
    template_type,
    tags,
    match_score,
    is_ai_generated,
    is_system_template
) VALUES 
(
    uuid_generate_v4(),
    NULL,
    'Impact-First Approach',
    'Continuing our conversation from the Gala',
    E'Dear {firstName},\n\nIt was wonderful meeting you at the Annual Philanthropy Gala last week. Our conversation about {orgFocus} really resonated with me, and I wanted to follow up on some of the ideas we discussed.\n\nAs you may know, our organization has been working on initiatives that align perfectly with {orgName}''s mission. In the past year alone, we''ve:\n\n• Reached over 15,000 beneficiaries across 12 communities\n• Achieved a 94% program success rate\n• Maintained administrative costs below 8%\n\nI believe there''s a meaningful opportunity for collaboration that could amplify both our impact. Would you be open to a brief call next week to explore this further?\n\nLooking forward to hearing from you.\n\nWarm regards,\n{senderName}',
    'introduction',
    ARRAY['Metrics Heavy', 'Warm Tone'],
    94,
    true,
    true
),
(
    uuid_generate_v4(),
    NULL,
    'Formal Board Introduction',
    'Strategic Partnership Proposal for Q4 Review',
    E'Dear {firstName},\n\nI am writing to you regarding the upcoming quarterly board review and the strategic opportunities that lie ahead for organizations like ours.\n\n{orgName} has consistently demonstrated exceptional leadership in the philanthropic space, and your recent initiatives in {orgFocus} have not gone unnoticed by our team.\n\nWe believe that a formal partnership between our organizations could:\n\n1. Expand program reach by an estimated 40%\n2. Create shared infrastructure efficiencies\n3. Position both organizations as leaders in collaborative philanthropy\n\nI would be honored to present a formal proposal to your board at your earliest convenience. Please let me know if you would be available for a preliminary discussion.\n\nRespectfully,\n{senderName}\n{senderTitle}',
    'introduction',
    ARRAY['Formal', 'Prestige'],
    78,
    true,
    true
),
(
    uuid_generate_v4(),
    NULL,
    'Mutual Connection Referral',
    'Introduction via {referrerName} - Grant Opportunities',
    E'Dear {firstName},\n\n{referrerName} suggested I reach out to you regarding the grants committee and our shared history of supporting community initiatives.\n\n{referrerName} mentioned that {orgName} is currently exploring new partnerships for the upcoming fiscal year, and thought there might be a great alignment with our organization''s work.\n\nA bit about us:\nWe''ve been operating in the {orgFocus} space for over a decade, with a proven track record of delivering measurable outcomes. {referrerName} thought you might be particularly interested in our approach to community engagement.\n\nWould you have 20 minutes for a brief introductory call? I''d love to learn more about {orgName}''s priorities and share how we might support your goals.\n\nBest regards,\n{senderName}',
    'introduction',
    ARRAY['Referral', 'Network'],
    65,
    true,
    true
),
(
    uuid_generate_v4(),
    NULL,
    'Letter of Inquiry Template',
    'Letter of Inquiry: {projectName}',
    E'Dear {firstName},\n\nOn behalf of {ourOrgName}, I am pleased to submit this Letter of Inquiry regarding our {projectName} initiative.\n\n**About Our Organization**\n{ourOrgName} is a [501(c)(3) nonprofit] dedicated to {ourMission}. Since our founding in [year], we have [key accomplishments].\n\n**The Challenge**\n[Describe the problem you''re addressing and its impact on the community]\n\n**Our Solution**\n{projectName} will [describe your approach and methodology]. Through this initiative, we aim to:\n• [Outcome 1]\n• [Outcome 2]\n• [Outcome 3]\n\n**Funding Request**\nWe respectfully request a grant of ${askAmount} to support [specific use of funds]. This investment will enable us to [expected impact].\n\n**Budget Overview**\n• Program Costs: $XX,XXX\n• Personnel: $XX,XXX\n• Operations: $XX,XXX\n\nWe would welcome the opportunity to discuss this initiative further. Thank you for your consideration.\n\nSincerely,\n{senderName}\n{senderTitle}',
    'loi',
    ARRAY['Formal', 'Complete'],
    90,
    true,
    true
),
(
    uuid_generate_v4(),
    NULL,
    'Thank You - Post Meeting',
    'Thank you for your time today',
    E'Dear {firstName},\n\nThank you so much for taking the time to meet with me today. I truly enjoyed learning more about {orgName}''s priorities and your vision for {orgFocus}.\n\nI was particularly struck by your insights on [specific topic discussed]. It''s clear that {orgName} is committed to creating meaningful, lasting impact.\n\nAs discussed, I will:\n• [Follow-up action 1]\n• [Follow-up action 2]\n• [Follow-up action 3]\n\nI look forward to continuing our conversation and exploring how we might work together.\n\nWith gratitude,\n{senderName}',
    'thank_you',
    ARRAY['Post-Meeting', 'Warm'],
    85,
    true,
    true
),
(
    uuid_generate_v4(),
    NULL,
    'Thank You - Post Funding',
    'Heartfelt Thanks from {ourOrgName}',
    E'Dear {firstName},\n\nOn behalf of the entire team at {ourOrgName}, I want to express our deepest gratitude for {orgName}''s generous grant of ${grantAmount}.\n\nYour investment in our mission will directly impact [number] individuals in our community. Thanks to your support, we will be able to:\n\n• [Specific outcome 1]\n• [Specific outcome 2]\n• [Specific outcome 3]\n\nWe are honored to have {orgName} as a partner in this work. Your belief in our mission inspires us to continue striving for excellence.\n\nWe look forward to sharing our progress with you and demonstrating the impact of your investment. Please don''t hesitate to reach out if you''d like to visit our programs or meet the beneficiaries whose lives you are helping to transform.\n\nWith deep appreciation,\n{senderName}\n{senderTitle}\n{ourOrgName}',
    'thank_you',
    ARRAY['Stewardship', 'Gratitude'],
    92,
    true,
    true
),
(
    uuid_generate_v4(),
    NULL,
    'Progress Report Template',
    'Q{quarter} Progress Report: {projectName}',
    E'Dear {firstName},\n\nI am pleased to share our Q{quarter} progress report on the {projectName} initiative, generously supported by {orgName}.\n\n**Executive Summary**\n[Brief overview of progress and key achievements]\n\n**Key Metrics**\n• Beneficiaries Served: {beneficiaryCount}\n• Program Completion Rate: {completionRate}%\n• Satisfaction Score: {satisfactionScore}/5\n\n**Highlights This Quarter**\n1. [Major achievement 1]\n2. [Major achievement 2]\n3. [Major achievement 3]\n\n**Success Story**\n[Share a compelling story of impact]\n\n**Challenges & Learnings**\n[Honest assessment of any challenges and how you''re addressing them]\n\n**Looking Ahead**\nIn the coming quarter, we plan to:\n• [Next step 1]\n• [Next step 2]\n• [Next step 3]\n\n**Financial Update**\n• Budget Utilized: ${utilized} of ${total}\n• Remaining Funds: ${remaining}\n\nThank you for your continued partnership. We would be happy to schedule a call to discuss this report in more detail.\n\nWarm regards,\n{senderName}',
    'progress_report',
    ARRAY['Metrics', 'Comprehensive'],
    88,
    true,
    true
),
(
    uuid_generate_v4(),
    NULL,
    'Follow-Up After No Response',
    'Following up: Partnership Opportunity',
    E'Dear {firstName},\n\nI hope this message finds you well. I wanted to follow up on my previous email regarding a potential partnership between our organizations.\n\nI understand how busy this time of year can be, so I''ll keep this brief. I believe there''s a strong alignment between {orgName}''s mission and our work in {orgFocus}, and I''d love the opportunity to explore this further.\n\nWould you have 15 minutes for a brief call? I''m happy to work around your schedule.\n\nAlternatively, if this isn''t the right time or if there''s someone else I should be speaking with, please let me know.\n\nThank you for your consideration.\n\nBest regards,\n{senderName}',
    'follow_up',
    ARRAY['Persistent', 'Respectful'],
    75,
    true,
    true
);

-- ============================================================================
-- GRANT VIEW ACCESS TO AUTHENTICATED USERS
-- ============================================================================

GRANT SELECT ON campaign_donors_detailed TO authenticated;
GRANT SELECT ON pipeline_overview TO authenticated;
GRANT SELECT ON contact_activity_summary TO authenticated;
GRANT SELECT ON network_connections TO authenticated;
GRANT SELECT ON recent_activities TO authenticated;
GRANT SELECT ON documents_overview TO authenticated;
GRANT SELECT ON tasks_dashboard TO authenticated;
