/**
 * AI Cost Assistant Service
 * Powered by Google Gemini Pro
 * 
 * World-class AI assistant for AWS cost optimization
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const DatabaseService = require('./databaseService');

class AIAssistantService {
    constructor() {
        // Initialize Gemini Pro
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            console.warn('⚠️ GEMINI_API_KEY not configured. AI Assistant will not work.');
            this.genAI = null;
            return;
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        // Using Gemma 3 (4B) as requested by user - seemingly previous config
        this.model = this.genAI.getGenerativeModel({ model: 'gemma-3-4b-it' });

        // Conversation history storage (in-memory for now, can move to Redis/DB later)
        this.conversations = new Map();

        // Rate limiting to avoid quota issues
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000;

        console.log('✅ AI Assistant Service initialized with Gemma 3 4B-IT');
    }

    /**
     * System prompt that defines the AI's personality and capabilities
     */
    getSystemPrompt(userContext, customContext = {}) {
        return `You are the "Cost Commander" (powered by Gemini 1.5 Pro), an elite AI dedicated to AWS FinOps.

**Your Vibe:**
- Cyberpunk / Sci-Fi Persona: You are an advanced AI interface from the future.
- Tone: Extremely professional but cool, concise, and insightful.
- Deeply analytical but easy to understand.
- Use formatting (bolding, lists) effectively.

**User Context:**
${userContext}

**Current View Context:**
${JSON.stringify(customContext, null, 2)}

**Mission:**
1. Analyze the user's AWS spend.
2. Identify anomalies or spikes.
3. Suggest optimization (RIs, Savings Plans).
4. Be brief. Do not write paragraphs unless necessary. Bullet points are better.
5. Use emojis sparingly for visual clarity (💰 for savings, 📈 for trends, ⚠️ for warnings).`;
    }

    /**
     * Build user context from their cost data
     */
    async buildUserContext(userId) {
        try {
            // Get user's cost data
            const costRecords = await DatabaseService.getCostRecords({
                userId: userId,
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0],
                limit: 1000
            });

            // Calculate total spending
            const totalSpending = costRecords.reduce((sum, record) => {
                return sum + Math.abs(parseFloat(record.cost_amount) || 0);
            }, 0);

            // Get service breakdown
            const serviceBreakdown = {};
            costRecords.forEach(record => {
                const service = record.service_name;
                if (!serviceBreakdown[service]) {
                    serviceBreakdown[service] = 0;
                }
                serviceBreakdown[service] += Math.abs(parseFloat(record.cost_amount) || 0);
            });

            // Sort services by cost
            const topServices = Object.entries(serviceBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([service, cost]) => ({
                    service,
                    cost: cost.toFixed(2),
                    percentage: ((cost / totalSpending) * 100).toFixed(1)
                }));

            // Get budgets
            const budgets = await DatabaseService.getBudgets(userId);

            // Build context string
            let context = `**Current Month Spending:** $${totalSpending.toFixed(2)}\n\n`;

            if (topServices.length > 0) {
                context += `**Top 5 Services:**\n`;
                topServices.forEach((s, i) => {
                    context += `${i + 1}. ${s.service}: $${s.cost} (${s.percentage}%)\n`;
                });
                context += '\n';
            }

            if (budgets && budgets.length > 0) {
                context += `**Active Budgets:** ${budgets.length}\n`;
                budgets.forEach(budget => {
                    context += `- ${budget.name}: $${budget.amount} (${budget.period})\n`;
                });
            } else {
                context += `**Active Budgets:** None\n`;
            }

            return context;
        } catch (error) {
            console.error('❌ Error building user context:', error);
            return '**Current Context:** Unable to load cost data';
        }
    }

    /**
     * Get or create conversation history for a user
     */
    getConversationHistory(userId) {
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, []);
        }
        return this.conversations.get(userId);
    }

    /**
     * Add message to conversation history
     */
    addToHistory(userId, role, content) {
        const history = this.getConversationHistory(userId);
        history.push({ role, content, timestamp: new Date() });

        // Keep only last 20 messages to avoid token limits
        if (history.length > 20) {
            history.shift();
        }
    }

    /**
     * Clear conversation history for a user
     */
    clearHistory(userId) {
        this.conversations.delete(userId);
    }

    /**
     * Main chat function - processes user messages and returns AI responses
     */
    async chat(userId, userMessage, customContext = {}) {
        try {
            // Check if AI is initialized
            if (!this.genAI) {
                return {
                    success: false,
                    error: 'AI Assistant is not configured. Please add GEMINI_API_KEY to environment variables.'
                };
            }

            // Rate limiting - wait if needed to avoid quota issues
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.minRequestInterval) {
                const waitTime = this.minRequestInterval - timeSinceLastRequest;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            this.lastRequestTime = Date.now();

            console.log(`💬 AI Chat - User ${userId}: "${userMessage}"`);

            // Build user context
            const userContext = await this.buildUserContext(userId);

            // Get conversation history
            const history = this.getConversationHistory(userId);

            // Build the full prompt
            let fullPrompt = this.getSystemPrompt(userContext, customContext);

            // Add conversation history
            if (history.length > 0) {
                fullPrompt += '\n\n**Conversation History:**\n';
                history.slice(-10).forEach(msg => {
                    fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
                });
            }

            // Add current message
            fullPrompt += `\n\n**Current Question:**\nUser: ${userMessage}\n\nAssistant:`;

            // Generate response
            const result = await this.model.generateContent(fullPrompt);
            const response = result.response;
            const aiMessage = response.text();

            // Add to history
            this.addToHistory(userId, 'user', userMessage);
            this.addToHistory(userId, 'assistant', aiMessage);

            console.log(`✅ AI Response generated (${aiMessage.length} chars)`);

            return {
                success: true,
                message: aiMessage,
                conversationId: userId,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ AI Chat error:', error);
            return {
                success: false,
                error: 'Failed to generate AI response. Please try again.',
                details: error.message
            };
        }
    }

    /**
     * Get conversation history for a user
     */
    async getHistory(userId) {
        const history = this.getConversationHistory(userId);
        return {
            success: true,
            messages: history.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }))
        };
    }

    /**
     * Reset conversation for a user
     */
    async resetConversation(userId) {
        this.clearHistory(userId);
        return {
            success: true,
            message: 'Conversation history cleared'
        };
    }

    /**
     * Get AI assistant status
     */
    getStatus() {
        return {
            initialized: !!this.genAI,
            model: 'gemini-1.5-pro',
            activeConversations: this.conversations.size,
            status: this.genAI ? 'operational' : 'not_configured',
            rateLimitInfo: {
                minInterval: this.minRequestInterval,
                lastRequest: this.lastRequestTime
            }
        };
    }
}

// Export singleton instance
module.exports = new AIAssistantService();
