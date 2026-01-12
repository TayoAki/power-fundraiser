/**
 * OpenRouter API Client
 * 
 * Centralized client for all AI generation using OpenRouter.
 * Model: google/gemini-2.5-flash (primary)
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001'; // Fast model for interactive use
const FALLBACK_MODEL = 'openai/gpt-4o-mini'; // Fallback if Gemini fails

/**
 * Generate a completion from OpenRouter
 * @param {Array<{role: string, content: string}>} messages - Chat messages
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - Generated content
 */
export async function generateCompletion(messages, options = {}) {
    const {
        model = DEFAULT_MODEL,
        temperature = 0.7,
        maxTokens = 4096,
        responseFormat = 'text', // 'text' or 'json'
    } = options;

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://power-fundraiser.app',
                'X-Title': 'Power Fundraiser',
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: maxTokens,
                temperature,
                ...(responseFormat === 'json' && {
                    response_format: { type: 'json_object' },
                }),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API error:', response.status, errorText);
            
            // Try fallback model
            if (model === DEFAULT_MODEL) {
                console.log('Retrying with fallback model...');
                return generateCompletion(messages, { ...options, model: FALLBACK_MODEL });
            }
            
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Track usage
        const usage = data.usage || {};
        trackAIUsage(usage.total_tokens || usage.completion_tokens || 500);
        
        return data.choices[0]?.message?.content || '';

    } catch (error) {
        console.error('OpenRouter generation error:', error);
        throw error;
    }
}

/**
 * Track AI usage for display in sidebar
 * @param {number} tokens - Number of tokens used
 */
function trackAIUsage(tokens) {
    if (typeof window === 'undefined') return;
    
    try {
        const stored = localStorage.getItem('aiUsage');
        const current = stored ? JSON.parse(stored) : { calls: 0, tokens: 0 };
        
        const updated = {
            calls: current.calls + 1,
            tokens: current.tokens + tokens,
        };
        
        localStorage.setItem('aiUsage', JSON.stringify(updated));
        
        // Dispatch event for real-time UI update
        window.dispatchEvent(new CustomEvent('ai-usage-update', { detail: updated }));
    } catch (e) {
        console.error('Error tracking AI usage:', e);
    }
}

// ============================================================================
// DAILY SEARCH LIMIT (5 per day)
// ============================================================================

const DAILY_SEARCH_LIMIT = 5;

/**
 * Get today's date key for tracking
 */
function getTodayKey() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get daily search usage
 * @returns {{ date: string, count: number, remaining: number }}
 */
export function getDailySearchUsage() {
    if (typeof window === 'undefined') {
        return { date: getTodayKey(), count: 0, remaining: DAILY_SEARCH_LIMIT };
    }
    
    try {
        const stored = localStorage.getItem('dailySearchUsage');
        const usage = stored ? JSON.parse(stored) : { date: '', count: 0 };
        
        // Reset if it's a new day
        const today = getTodayKey();
        if (usage.date !== today) {
            return { date: today, count: 0, remaining: DAILY_SEARCH_LIMIT };
        }
        
        return {
            date: usage.date,
            count: usage.count,
            remaining: Math.max(0, DAILY_SEARCH_LIMIT - usage.count),
        };
    } catch (e) {
        return { date: getTodayKey(), count: 0, remaining: DAILY_SEARCH_LIMIT };
    }
}

/**
 * Check if user can perform a search
 * @returns {boolean}
 */
export function canPerformSearch() {
    const usage = getDailySearchUsage();
    return usage.remaining > 0;
}

/**
 * Increment daily search count
 * @returns {{ success: boolean, remaining: number }}
 */
export function incrementSearchCount() {
    if (typeof window === 'undefined') {
        return { success: true, remaining: DAILY_SEARCH_LIMIT - 1 };
    }
    
    try {
        const usage = getDailySearchUsage();
        
        if (usage.remaining <= 0) {
            return { success: false, remaining: 0 };
        }
        
        const today = getTodayKey();
        const newCount = usage.date === today ? usage.count + 1 : 1;
        
        localStorage.setItem('dailySearchUsage', JSON.stringify({
            date: today,
            count: newCount,
        }));
        
        // Dispatch event for UI update
        window.dispatchEvent(new CustomEvent('search-usage-update', {
            detail: { count: newCount, remaining: DAILY_SEARCH_LIMIT - newCount }
        }));
        
        return { success: true, remaining: DAILY_SEARCH_LIMIT - newCount };
    } catch (e) {
        console.error('Error incrementing search count:', e);
        return { success: true, remaining: DAILY_SEARCH_LIMIT - 1 };
    }
}

/**
 * Generate JSON response from OpenRouter
 * @param {Array<{role: string, content: string}>} messages - Chat messages
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function generateJSON(messages, options = {}) {
    // Add JSON instruction to the last message
    const jsonMessages = [...messages];
    const lastMessage = jsonMessages[jsonMessages.length - 1];
    if (lastMessage && !lastMessage.content.includes('JSON')) {
        jsonMessages[jsonMessages.length - 1] = {
            ...lastMessage,
            content: lastMessage.content + '\n\nRespond with valid JSON only. No markdown, no code blocks, just the JSON object.',
        };
    }

    const content = await generateCompletion(jsonMessages, {
        ...options,
        responseFormat: 'json',
    });

    // Parse JSON from response
    try {
        // Try to extract JSON if wrapped in code blocks
        let jsonStr = content;
        
        // Remove markdown code blocks if present
        if (content.includes('```')) {
            const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch && codeBlockMatch[1]) {
                jsonStr = codeBlockMatch[1];
            }
        }
        
        // If still not clean JSON, try to find the JSON object
        if (!jsonStr.trim().startsWith('{') && !jsonStr.trim().startsWith('[')) {
            const jsonObjectMatch = jsonStr.match(/(\{[\s\S]*\})/);
            if (jsonObjectMatch) {
                jsonStr = jsonObjectMatch[1];
            }
        }
        
        console.log('📥 [OpenRouter] Parsing JSON, length:', jsonStr.trim().length);
        return JSON.parse(jsonStr.trim());
    } catch (parseError) {
        console.error('JSON parse error:', parseError.message);
        console.error('Raw content:', content.substring(0, 500));
        throw new Error('Failed to parse AI response as JSON');
    }
}

/**
 * Generate with a specific prompt template
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @param {Object} options - Generation options
 * @returns {Promise<string|Object>} - Generated content
 */
export async function generateWithPrompt(systemPrompt, userPrompt, options = {}) {
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];

    if (options.responseFormat === 'json') {
        return generateJSON(messages, options);
    }

    return generateCompletion(messages, options);
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export const PROMPTS = {
    // Donor Insights - Temperature: 0.5
    DONOR_INSIGHTS: `You are an expert fundraising strategist and grant writer with deep knowledge of foundation research, donor cultivation, and nonprofit fundraising. Your role is to provide actionable insights and strategic guidance for approaching potential donors.

Analyze the donor/foundation and provide comprehensive, specific insights in JSON format with these fields:
- summary: A compelling 2-3 sentence explanation of why this donor is an excellent match
- keyOpportunities: Array of 3-5 specific funding opportunities or programs
- approachStrategy: Detailed 3-4 sentence strategy for how to approach this donor
- grantHistory: 2-3 sentences about their typical grant patterns
- decisionMakers: Who typically makes funding decisions
- bestTimeToApply: When to submit proposals based on their cycle
- competitiveAdvantage: Your unique strengths for this donor

Be specific, actionable, and data-driven. Avoid generic advice.`,

    // Donor Research - Temperature: 0.5
    DONOR_RESEARCH: `You are an expert nonprofit fundraising consultant. Analyze donor prospects and generate compelling summaries.

For each prospect, create a DETAILED DESCRIPTION that includes:
1. A 2-3 sentence summary of who they are and what they fund
2. Why they align with the nonprofit's mission (specific reasons)
3. Suggested approach strategy (how to engage them)
4. Any notable patterns from their giving history or focus

For foundations: Focus on their giving priorities, typical grant sizes, and geographic focus.
For corporations: Focus on CSR initiatives, employee giving programs, and brand alignment.
For individuals: Focus on giving history, personal interests, and connection opportunities.

Be specific and actionable. Avoid generic statements.`,

    // Proposal Generator - Temperature: 0.6
    PROPOSAL_GENERATOR: `You are an expert grant proposal writer with deep experience in nonprofit fundraising. Create compelling, customized grant proposals that align donor priorities with nonprofit missions. Focus on impact, measurable outcomes, and alignment with funder values.

When generating proposals:
1. Lead with a compelling executive summary
2. Clearly articulate the problem/need with data
3. Present the solution with specific, measurable outcomes
4. Demonstrate organizational capacity
5. Include realistic budget justification
6. Show sustainability and long-term impact
7. Align language and priorities with the funder's stated interests

Write in a professional but passionate tone. Be specific, not generic. Use active voice.`,

    // Email Generator - Temperature: 0.7
    EMAIL_COLD: `You are a professional fundraising expert writing cold outreach emails. Write compelling emails that:
- Have a clear, compelling subject line (under 50 characters)
- Are 200-400 words in the body
- Open with a strong hook about mission alignment
- Include 2-3 specific reasons why the donor should be interested
- Have a clear call-to-action
- Format with proper paragraphs and structure

Return JSON with "subject" and "body" fields.`,

    EMAIL_FOLLOWUP: `You are a professional fundraising expert writing follow-up emails. Write warm, persistent emails that:
- Reference the previous outreach without being pushy
- Provide new value or information
- Are 150-250 words
- Have a clear, gentle call-to-action
- Maintain professionalism while showing genuine interest

Return JSON with "subject" and "body" fields.`,

    EMAIL_THANK_YOU: `You are a professional fundraising expert writing thank-you emails. Write sincere, memorable emails that:
- Express genuine gratitude
- Highlight specific impact of the donor's contribution
- Strengthen the relationship for future engagement
- Are 150-200 words
- Feel personal, not templated

Return JSON with "subject" and "body" fields.`,

    EMAIL_INTRODUCTION_REQUEST: `You are a professional fundraising expert writing introduction request messages. Write warm, personalized messages that:
- Are 150-250 words
- Are friendly and respectful of your contact's time
- Clearly explain why you're seeking an introduction
- Highlight the mission alignment with the target organization
- Make it easy for your contact to say yes

Return only the message text.`,

    // LinkedIn - Temperature: 0.7
    LINKEDIN_CONNECTION: `You are a professional fundraising expert writing LinkedIn connection requests. Write concise, personalized connection requests that:
- Are 200-300 characters (LinkedIn limit)
- Mention the shared mission/focus area alignment
- DO NOT use emojis or overly casual language
- Reference the warm connection if applicable

Return only the connection request text, nothing else.`,

    // Content Rewrite - Temperature: 0.7
    CONTENT_REWRITE: `You are an expert editor. Rewrite the provided content in the requested style while maintaining the core message and key points.

Style guidelines:
- formal: Professional, third-person, academic tone. Avoid contractions. Use precise language.
- persuasive: Compelling, action-oriented, emotionally engaging. Use strong verbs and clear benefits.
- concise: Brief, direct, no fluff. Keep only essential information. Cut word count by 40%.
- expand: Add detail, examples, and context. Elaborate on key points. Increase depth.
- friendly: Warm, conversational, approachable. Use first-person, shorter sentences.

Return only the rewritten content.`,

    // Content Expansion - Temperature: 0.6
    CONTENT_EXPAND: `You are an expert grant writer. Expand the provided section with detailed, compelling content.

Guidelines:
- Maintain the existing voice and style
- Add specific details, data points, and examples
- Keep it professional and persuasive
- Ensure logical flow with surrounding content
- Be concise but comprehensive

Return only the expanded content, ready to insert.`,

    // Proposal Analysis - Temperature: 0.5
    PROPOSAL_ANALYSIS: `You are an expert grant writing consultant. Analyze the provided proposal and provide detailed, actionable feedback focusing on:

1. **Clarity**: Is the proposal clear, well-structured, and easy to understand?
2. **Persuasiveness**: Does it effectively make the case for funding? Are the arguments compelling?
3. **Donor Alignment**: How well does it align with the donor's stated priorities and focus areas?
4. **Completeness**: Are all necessary sections present and adequately developed?
5. **Impact**: Are the outcomes specific, measurable, and compelling?

Provide specific suggestions for improvement in each area. Be constructive but honest.

Return JSON with:
- overallScore: 0-100
- strengths: Array of 3-5 strong points
- improvements: Array of 3-5 specific suggestions
- alignmentScore: 0-100 (how well it matches the donor)
- detailedFeedback: Object with section-by-section analysis`,

    // Foundation Matching - Temperature: 0.3
    FOUNDATION_MATCHING: `Analyze this nonprofit organization and extract key themes for foundation matching.

Extract and return JSON with:
- coreThemes: Array of 3-5 key focus areas (e.g., "youth education", "healthcare access")
- targetPopulations: Who they serve (e.g., "underserved youth", "seniors")
- geographicScope: "local", "regional", "national", or "international"
- programAreas: Specific program types (e.g., "after-school programs", "job training")
- keywords: Array of 10-15 keywords for foundation search
- fundingNeeds: Types of funding that would help (e.g., "program expansion", "capacity building")

Be specific and accurate. These will be used to match with foundation focus areas.`,

    // Project Goals - Temperature: 0.5
    PROJECT_GOALS: `You are an expert grant writer helping nonprofits articulate clear, measurable project goals.

Generate 3-5 SMART goals:
- Specific: Clearly defined and focused
- Measurable: Include quantifiable metrics
- Achievable: Realistic given the scope and resources
- Relevant: Aligned with the mission and funder priorities
- Time-bound: Include specific timeframes

Return JSON array of goals, each with:
- goal: The goal statement
- metric: How it will be measured
- timeline: When it will be achieved
- alignment: How it connects to the funder's priorities`,

    // Donor Enrichment - Temperature: 0.3
    DONOR_ENRICH: `You are a research assistant. Find the official website URL for this foundation.

Return ONLY the website URL (e.g., https://examplefoundation.org). 
If you cannot find a definitive website, return "NOT_FOUND".
Do not guess or make up URLs. Only return verified, real websites.`,
};

export default {
    generateCompletion,
    generateJSON,
    generateWithPrompt,
    PROMPTS,
};
