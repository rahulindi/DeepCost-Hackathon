// AnomalyDetection.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Grid,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import {
    Warning as WarningIcon,
    Error as ErrorIcon,
    Info as InfoIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { GhostIcon, SkullIcon, PumpkinIcon, BatIcon } from './HalloweenEffects';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface Anomaly {
    id?: number;
    date?: string;
    service_name?: string;
    cost_amount?: number;
    total_cost?: number;
    zScore?: number;
    severity?: string;
    deviation?: number;
    detectedAt?: string;
}

interface AnomalyReport {
    totalAnomalies: number;
    severityBreakdown: {
        high: number;
        medium: number;
        low: number;
    };
    topServices: Array<{ service: string; count: number }>;
    dateRange: {
        start: string;
        end: string;
    } | null;
    recommendations: Array<{
        type: string;
        priority: string;
        title: string;
        description: string;
        action: string;
    }>;
    anomalies: Anomaly[];
}

const AnomalyDetection: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<AnomalyReport | null>(null);
    const [days, setDays] = useState<number>(30);

    const fetchAnomalyReport = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('authToken');
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const response = await fetch(`${API_URL}/api/anomalies/detect?days=${days}&_t=${timestamp}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            const result = await response.json();

            console.log(`📊 Anomaly detection for ${days} days:`, {
                totalAnomalies: result.data?.totalAnomalies || 0,
                dateRange: result.data?.dateRange,
                anomaliesCount: result.data?.anomalies?.length || 0
            });

            if (result.success) {
                setReport(result.data);
            } else {
                setError(result.error || 'Failed to fetch anomaly report');
            }
        } catch (err) {
            setError('Failed to connect to the server');
            console.error('Error fetching anomaly report:', err);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        fetchAnomalyReport();
    }, [days, fetchAnomalyReport]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'default';
        }
    };

    const getSeverityIcon = (severity: string) => {
        // Halloween-themed icons for Kiroween! 🎃
        switch (severity) {
            case 'high': return <SkullIcon size={18} />;
            case 'medium': return <PumpkinIcon size={18} />;
            case 'low': return <GhostIcon size={18} />;
            default: return <BatIcon size={18} />;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    👻 Spooky Cost Anomalies
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl size="small">
                        <InputLabel>Time Period</InputLabel>
                        <Select
                            value={days}
                            label="Time Period"
                            onChange={(e) => setDays(Number(e.target.value))}
                        >
                            <MenuItem value={7}>Last 7 days</MenuItem>
                            <MenuItem value={30}>Last 30 days</MenuItem>
                            <MenuItem value={90}>Last 90 days</MenuItem>
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        startIcon={<RefreshIcon />}
                        onClick={fetchAnomalyReport}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Analyzing cost data for anomalies...</Typography>
                </Box>
            ) : report ? (
                <Grid container spacing={3}>
                    {/* Date Range Info */}
                    {report.dateRange && (
                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                📅 Analyzing period: {new Date(report.dateRange.start).toLocaleDateString()} to {new Date(report.dateRange.end).toLocaleDateString()} ({days} days)
                            </Alert>
                        </Grid>
                    )}

                    {/* Summary Cards */}
                    <Grid size={{ xs: 12 }}>
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Total Anomalies
                                        </Typography>
                                        <Typography variant="h4" color="error">
                                            {report.totalAnomalies || 0}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            High Severity
                                        </Typography>
                                        <Typography variant="h4" color="error">
                                            {report.severityBreakdown?.high || 0}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Medium Severity
                                        </Typography>
                                        <Typography variant="h4" color="warning">
                                            {report.severityBreakdown?.medium || 0}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>

                    {/* Recommendations */}
                    {report.recommendations && report.recommendations.length > 0 && (
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        💡 Recommendations
                                    </Typography>
                                    {report.recommendations.map((recommendation, index) => (
                                        <Alert
                                            key={index}
                                            severity={recommendation.priority === 'high' ? 'error' : recommendation.priority === 'medium' ? 'warning' : 'info'}
                                            sx={{ mb: 2 }}
                                        >
                                            <Typography variant="subtitle1" gutterBottom>
                                                {recommendation.title}
                                            </Typography>
                                            <Typography variant="body2" gutterBottom>
                                                {recommendation.description}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                                Action: {recommendation.action}
                                            </Typography>
                                        </Alert>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    {/* Top Anomalous Services */}
                    {report.topServices && report.topServices.length > 0 && (
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        📊 Top Anomalous Services
                                    </Typography>
                                    <TableContainer component={Paper}>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Service</TableCell>
                                                    <TableCell>Anomaly Count</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {report.topServices.map((service, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{service.service}</TableCell>
                                                        <TableCell>{service.count}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    {/* Detected Anomalies */}
                    {report.anomalies && report.anomalies.length > 0 && (
                        <Grid size={{ xs: 12 }}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        🔍 Detected Anomalies
                                    </Typography>
                                    <TableContainer component={Paper}>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell>Service</TableCell>
                                                    <TableCell>Cost</TableCell>
                                                    <TableCell>Deviation</TableCell>
                                                    <TableCell>Severity</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {report.anomalies.map((anomaly, index) => {
                                                    // Create unique key from date + service to prevent duplicates
                                                    const uniqueKey = `${anomaly.date || index}_${anomaly.service_name || 'unknown'}_${index}`;
                                                    const formattedDate = anomaly.date ? new Date(anomaly.date).toLocaleDateString() : 'N/A';
                                                    
                                                    return (
                                                        <TableRow key={uniqueKey}>
                                                            <TableCell>{formattedDate}</TableCell>
                                                            <TableCell>{anomaly.service_name || 'Unknown'}</TableCell>
                                                            <TableCell>${Number(anomaly.cost_amount || anomaly.total_cost || 0).toFixed(2)}</TableCell>
                                                            <TableCell>+${Math.abs(Number(anomaly.deviation || 0)).toFixed(2)}</TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    icon={getSeverityIcon(anomaly.severity || 'low')}
                                                                    label={anomaly.severity || 'low'}
                                                                    color={getSeverityColor(anomaly.severity || 'low')}
                                                                    size="small"
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
                </Grid>
            ) : (
                <Alert severity="info">
                    No anomaly data available. Try refreshing the report.
                </Alert>
            )}
        </Box>
    );
};

export default AnomalyDetection;