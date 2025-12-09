import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    CircularProgress,
    Alert,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    AttachMoney as MoneyIcon,
    Schedule as ScheduleIcon,
    Assessment as AssessmentIcon,
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    Info as InfoIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { AnimatedCounter } from './AnimatedCounter';
import { useTheme } from '@mui/material/styles';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface RIRecommendation {
    service: string;
    instanceType: string;
    term: string;
    paymentOption: string;
    estimatedMonthlySavings: number;
    priority: 'high' | 'medium' | 'low';
    reasoning: string;
    utilizationThreshold?: number;
}

interface RISavings {
    monthly: number;
    annual: number;
    threeYear: number;
    recommendations: number;
    highPriorityCount: number;
}

interface RIAnalysis {
    utilization: any;
    coverage: any;
    recommendations: RIRecommendation[];
    savings: RISavings;
    analysisDate: string;
    realData?: boolean;
}

const ReservedInstanceDashboard: React.FC = () => {
    const [riData, setRiData] = useState<RIAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
    
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';

    const fetchRIAnalysis = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/ri/analysis`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            
            if (result.success) {
                setRiData(result.data);
                setLastAnalysis(new Date().toISOString());
                console.log('✅ RI analysis loaded:', result.data);
            } else {
                if (result.requiresAwsSetup) {
                    setError('AWS credentials not configured. Please set up your AWS connection first.');
                } else {
                    setError(result.error || 'Failed to analyze Reserved Instances');
                }
            }
        } catch (err: any) {
            console.error('❌ RI analysis error:', err);
            setError('Network error - please check your connection');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Auto-load RI analysis on component mount
        fetchRIAnalysis();
    }, []);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'default';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'high': return <WarningIcon />;
            case 'medium': return <InfoIcon />;
            case 'low': return <CheckCircleIcon />;
            default: return <InfoIcon />;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Box textAlign="center">
                    <CircularProgress size={60} />
                    <Typography variant="h6" sx={{ mt: 2 }}>
                        Analyzing Reserved Instance Opportunities...
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        This may take a few moments
                    </Typography>
                </Box>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert 
                severity="error" 
                action={
                    <Button 
                        color="inherit" 
                        size="small" 
                        onClick={fetchRIAnalysis}
                        disabled={loading}
                    >
                        Retry
                    </Button>
                }
            >
                <Typography variant="subtitle2">Reserved Instance Analysis Error</Typography>
                <Typography variant="body2">{error}</Typography>
            </Alert>
        );
    }

    if (!riData) {
        return (
            <Card>
                <CardContent>
                    <Box textAlign="center" py={4}>
                        <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            Reserved Instance Analysis
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                            Discover potential cost savings through Reserved Instance recommendations
                        </Typography>
                        <Button 
                            variant="contained" 
                            onClick={fetchRIAnalysis}
                            startIcon={<AssessmentIcon />}
                            sx={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            }}
                        >
                            Analyze Reserved Instances
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" sx={{
                        fontWeight: 700,
                        background: isDarkMode
                            ? 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        mb: 1
                    }}>
                        💎 Reserved Instance Optimizer
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchRIAnalysis}
                        disabled={loading}
                        sx={{
                            borderColor: 'primary.main',
                            '&:hover': {
                                borderColor: 'primary.dark',
                                backgroundColor: 'rgba(102, 126, 234, 0.04)'
                            }
                        }}
                    >
                        Refresh Analysis
                    </Button>
                </Box>
                <Typography variant="body1" color="textSecondary">
                    AI-powered Reserved Instance recommendations for maximum cost savings
                </Typography>
                {lastAnalysis && (
                    <Typography variant="caption" color="textSecondary">
                        Last analysis: {new Date(lastAnalysis).toLocaleString()}
                    </Typography>
                )}
            </Box>

            {/* Savings Summary Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
                <Box>
                    <Card sx={{
                        background: isDarkMode
                            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(21, 128, 61, 0.2) 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        height: '140px'
                    }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <MoneyIcon sx={{ fontSize: 28 }} />
                                <TrendingDownIcon sx={{ fontSize: 20 }} />
                            </Box>
                            <AnimatedCounter
                                value={riData.savings.monthly}
                                prefix="$"
                                decimals={0}
                                variant="h4"
                                sx={{ mb: 1, fontWeight: 700 }}
                            />
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Monthly Savings
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box>
                    <Card sx={{
                        background: isDarkMode
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)'
                            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        height: '140px'
                    }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <ScheduleIcon sx={{ fontSize: 28 }} />
                                <Chip label="1 YEAR" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                            </Box>
                            <AnimatedCounter
                                value={riData.savings.annual}
                                prefix="$"
                                decimals={0}
                                variant="h4"
                                sx={{ mb: 1, fontWeight: 700 }}
                            />
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Annual Savings
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box>
                    <Card sx={{
                        background: isDarkMode
                            ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)'
                            : 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                        color: 'white',
                        height: '140px'
                    }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <TrendingUpIcon sx={{ fontSize: 28 }} />
                                <Chip label="3 YEAR" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                            </Box>
                            <AnimatedCounter
                                value={riData.savings.threeYear}
                                prefix="$"
                                decimals={0}
                                variant="h4"
                                sx={{ mb: 1, fontWeight: 700 }}
                            />
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                3-Year Savings
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                <Box>
                    <Card sx={{
                        background: isDarkMode
                            ? 'linear-gradient(135deg, rgba(245, 101, 101, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%)'
                            : 'linear-gradient(135deg, #f56565 0%, #ef4444 100%)',
                        color: 'white',
                        height: '140px'
                    }}>
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                <AssessmentIcon sx={{ fontSize: 28 }} />
                                <Chip 
                                    label={`${riData.savings.highPriorityCount} HIGH`} 
                                    size="small" 
                                    sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} 
                                />
                            </Box>
                            <AnimatedCounter
                                value={riData.recommendations.length}
                                decimals={0}
                                variant="h4"
                                sx={{ mb: 1, fontWeight: 700 }}
                            />
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Recommendations
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Box>

            {/* Recommendations Table */}
            {riData.recommendations.length > 0 ? (
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6">
                                💡 Reserved Instance Recommendations
                            </Typography>
                            <Button
                                variant="text"
                                onClick={() => setDetailsOpen(true)}
                                endIcon={<InfoIcon />}
                            >
                                View Details
                            </Button>
                        </Box>
                        
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Service</TableCell>
                                        <TableCell>Instance Type</TableCell>
                                        <TableCell>Term</TableCell>
                                        <TableCell>Payment</TableCell>
                                        <TableCell align="right">Monthly Savings</TableCell>
                                        <TableCell align="center">Priority</TableCell>
                                        <TableCell>Reasoning</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {riData.recommendations.map((recommendation, index) => (
                                        <TableRow key={index} hover>
                                            <TableCell>
                                                <Typography variant="subtitle2">
                                                    {recommendation.service}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <code>{recommendation.instanceType}</code>
                                            </TableCell>
                                            <TableCell>{recommendation.term}</TableCell>
                                            <TableCell>{recommendation.paymentOption}</TableCell>
                                            <TableCell align="right">
                                                <Typography 
                                                    variant="subtitle2" 
                                                    color="success.main"
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    {formatCurrency(recommendation.estimatedMonthlySavings)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    icon={getPriorityIcon(recommendation.priority)}
                                                    label={recommendation.priority.toUpperCase()}
                                                    color={getPriorityColor(recommendation.priority) as any}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={recommendation.reasoning} arrow>
                                                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                                        {recommendation.reasoning}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            ) : (
                <Alert severity="info">
                    <Typography variant="subtitle2">No Reserved Instance Recommendations</Typography>
                    <Typography variant="body2">
                        Your current usage patterns don't show significant opportunities for Reserved Instance savings.
                        This analysis will be more accurate with more historical data.
                    </Typography>
                </Alert>
            )}

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Reserved Instance Analysis Details
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Analysis Summary</Typography>
                        <Typography variant="body2" paragraph>
                            This analysis examined your AWS usage patterns over the last 30 days to identify
                            Reserved Instance opportunities. Recommendations are based on consistent usage
                            patterns and potential cost savings.
                        </Typography>
                    </Box>
                    
                    {riData.realData && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            <Typography variant="body2">
                                This analysis used real AWS Cost Explorer data. API cost: $0.01
                            </Typography>
                        </Alert>
                    )}
                    
                    <Typography variant="subtitle2">Implementation Tips:</Typography>
                    <ul>
                        <li>Start with high-priority recommendations for maximum impact</li>
                        <li>Consider 1-year terms for flexibility vs. savings balance</li>
                        <li>Partial Upfront payment often provides the best value</li>
                        <li>Monitor utilization after purchase to ensure optimal usage</li>
                    </ul>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReservedInstanceDashboard;
