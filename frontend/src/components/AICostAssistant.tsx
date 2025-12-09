// Create new file: /Users/rahulindi/aws-cost-tracker/frontend/src/components/AICostAssistant.tsx
import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    TextField,
    IconButton,
    Chip,
    Paper,
    Fade,
    Avatar
} from '@mui/material';
import {
    Send as SendIcon,
    SmartToy as SmartToyIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    suggestions?: string[];
}

export const AICostAssistant: React.FC<{ analytics: any }> = ({ analytics }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "👋 Hi! I'm your AI Cost Optimization Assistant. I can help you reduce AWS costs, identify savings opportunities, and optimize your spending. What would you like to know?",
            isUser: false,
            timestamp: new Date(),
            suggestions: [
                "Analyze my current costs",
                "Find optimization opportunities",
                "Recommend Reserved Instances",
                "Check for unused resources"
            ]
        }
    ]);
    const [inputText, setInputText] = useState('');
    const { palette } = useTheme();

    const generateAIResponse = (userMessage: string): string => {
        const msg = userMessage.toLowerCase();

        if (msg.includes('cost') || msg.includes('spending')) {
            const totalCost = analytics?.totalCost || 0;
            if (totalCost > 100) {
                return `💰 I see you're spending $${totalCost.toFixed(2)}/month. Here are key optimizations:

🔸 **Reserved Instances**: Save up to 30% on consistent workloads
🔸 **Right-sizing**: Reduce instance sizes for over-provisioned resources  
🔸 **Spot Instances**: Use for fault-tolerant workloads (up to 90% savings)
🔸 **Storage Optimization**: Move infrequent data to cheaper storage classes

Would you like me to analyze specific services?`;
            } else {
                return `✅ Great job! Your monthly cost of $${totalCost.toFixed(2)} is well-optimized. Consider setting up billing alerts for budget monitoring.`;
            }
        }

        if (msg.includes('optimize') || msg.includes('save')) {
            return `🚀 **Top Cost Optimization Strategies:**

1. **Schedule Automation**: Auto-stop dev/test instances during off-hours
2. **Data Lifecycle**: Implement S3 Intelligent Tiering
3. **Load Balancing**: Optimize traffic distribution
4. **Monitoring**: Set up CloudWatch for unused resources

Potential savings: **$${((analytics?.totalCost || 50) * 0.25).toFixed(2)}/month**`;
        }

        if (msg.includes('reserved') || msg.includes('instance')) {
            return `📊 **Reserved Instance Analysis:**

Based on your usage patterns:
- **EC2**: Consider 1-year Standard RIs for consistent workloads
- **RDS**: Reserve database instances running 24/7
- **ElastiCache**: Great candidate for Reserved Capacity

**Estimated savings**: 20-30% on compute costs 💰`;
        }

        return `🤖 I understand you're asking about "${userMessage}". Here's what I recommend:

• Monitor your top 3 cost drivers regularly
• Set up budget alerts at 80% and 100% thresholds  
• Review and optimize monthly
• Consider AWS Cost Explorer for detailed analysis

Any specific service you'd like me to focus on?`;
    };

    const handleSendMessage = () => {
        if (!inputText.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            isUser: true,
            timestamp: new Date()
        };

        const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: generateAIResponse(inputText),
            isUser: false,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage, aiResponse]);
        setInputText('');
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInputText(suggestion);
    };

    return (
        <Card sx={{
            height: '500px',
            display: 'flex',
            flexDirection: 'column',
            background: palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.8) 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            backdropFilter: 'blur(20px)',
            border: palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        }}>
            <CardContent sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                p: 0,
            }}>
                {/* Header */}
                <Box sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    background: palette.mode === 'dark'
                        ? 'rgba(139, 92, 246, 0.1)'
                        : 'rgba(102, 126, 234, 0.05)',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{
                            bgcolor: 'primary.main',
                            width: 32,
                            height: 32,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}>
                            <SmartToyIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            AI Cost Assistant
                        </Typography>
                        <Chip
                            label="BETA"
                            size="small"
                            color="secondary"
                            sx={{ ml: 'auto', fontSize: '0.7rem' }}
                        />
                    </Box>
                </Box>

                {/* Messages */}
                <Box sx={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}>
                    {messages.map((message, index) => (
                        <Fade in key={message.id} timeout={300 * (index + 1)}>
                            <Box sx={{
                                display: 'flex',
                                justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                            }}>
                                <Paper sx={{
                                    p: 2,
                                    maxWidth: '80%',
                                    backgroundColor: message.isUser
                                        ? 'primary.main'
                                        : palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'grey.100',
                                    color: message.isUser ? 'white' : 'text.primary',
                                    borderRadius: message.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                }}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                        {message.text}
                                    </Typography>
                                    {message.suggestions && (
                                        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {message.suggestions.map((suggestion, idx) => (
                                                <Chip
                                                    key={idx}
                                                    label={suggestion}
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '&:hover': { backgroundColor: 'action.hover' }
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </Paper>
                            </Box>
                        </Fade>
                    ))}
                </Box>

                {/* Input */}
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            placeholder="Ask about cost optimization..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                }
                            }}
                        />
                        <IconButton
                            onClick={handleSendMessage}
                            disabled={!inputText.trim()}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #5a67d8 0%, #667eea 100%)',
                                }
                            }}
                        >
                            <SendIcon />
                        </IconButton>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default AICostAssistant;
