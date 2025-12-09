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
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Switch,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
    Tooltip,
    LinearProgress
} from '@mui/material';
import {
    Schedule as ScheduleIcon,
    TrendingUp as OptimizeIcon,
    Delete as CleanupIcon,
    Refresh as RefreshIcon,
    Add as AddIcon,
    Edit as EditIcon,
    PlayArrow as ExecuteIcon,
    PlayArrow,
    Pause as PauseIcon,
    ExpandMore as ExpandMoreIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Info as InfoIcon,
    Assessment as AssessmentIcon,
    AutoDelete as AutoDeleteIcon,
    Speed as SpeedIcon
} from '@mui/icons-material';
import { AnimatedCounter } from './AnimatedCounter';
import { AwsSetupDialog } from './AwsSetupDialog';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Interfaces
interface ScheduledAction {
    id: string;
    resource_id: string;
    schedule_name: string;
    schedule_type: 'shutdown' | 'startup' | 'resize' | 'terminate';
    cron_expression: string;
    timezone: string;
    is_active: boolean;
    resource_type: string;
    service_name: string;
    region: string;
    created_at: string;
    next_execution?: string;
}

interface RightsizingRecommendation {
    id: string;
    resource_id: string;
    current_instance_type: string;
    recommended_instance_type: string;
    confidence_score: number;
    potential_savings: number;
    performance_impact: 'low' | 'medium' | 'high';
    service_name: string;
    region: string;
    account_id: string;
    analysis_data: any;
    created_at: string;
    status: 'pending' | 'applied' | 'rejected';
}

interface OrphanedResource {
    id: string;
    resource_id: string;
    resource_type: string;
    service_name: string;
    region: string;
    orphan_type: 'unused' | 'unattached' | 'idle' | 'misconfigured';
    last_activity: string;
    potential_savings: number;
    cleanup_risk_level: 'low' | 'medium' | 'high';
    cleanup_status: 'detected' | 'scheduled' | 'cleaned';
    detection_metadata: any;
    detected_at: string;
}

interface LifecycleStatus {
    scheduledActions: number;
    pendingRightsizing: number;
    orphanedResources: number;
    automationStatus: string;
    lastUpdate: string;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`lifecycle-tabpanel-${index}`}
            aria-labelledby={`lifecycle-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const ResourceLifecycleManagement: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [status, setStatus] = useState<LifecycleStatus | null>(null);
    const [scheduledActions, setScheduledActions] = useState<ScheduledAction[]>([]);
    const [rightsizingRecommendations, setRightsizingRecommendations] = useState<RightsizingRecommendation[]>([]);
    const [orphanedResources, setOrphanedResources] = useState<OrphanedResource[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasAwsCredentials, setHasAwsCredentials] = useState<boolean | null>(null);
    const [awsSetupDialogOpen, setAwsSetupDialogOpen] = useState(false);
    
    // Dialog states
    const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<ScheduledAction | null>(null);
    const [scheduleFormData, setScheduleFormData] = useState({
        resourceId: '',
        action: 'shutdown' as 'shutdown' | 'startup' | 'resize' | 'terminate',
        cronExpression: '',
        timezone: 'UTC',
        name: ''
    });

    // API helper
    const apiCall = async (endpoint: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/api/lifecycle${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            }
        });
        return response.json();
    };

    // Load all data
    const loadData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const [statusRes, schedulesRes, rightsizingRes, orphansRes] = await Promise.all([
                apiCall('/status'),
                apiCall('/schedule'),
                apiCall('/rightsize/recommendations'),
                apiCall('/orphans')
            ]);

            if (statusRes.success) setStatus(statusRes.data);
            if (schedulesRes.success) setScheduledActions(schedulesRes.data);
            if (rightsizingRes.success) setRightsizingRecommendations(rightsizingRes.data);
            if (orphansRes.success) setOrphanedResources(orphansRes.data);
        } catch (err: any) {
            console.error('Error loading lifecycle data:', err);
            setError('Failed to load resource lifecycle data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        checkAwsCredentials();
        
        // Auto-refresh data every 5 minutes to sync with AWS state
        const refreshInterval = setInterval(() => {
            console.log('🔄 Auto-refreshing lifecycle data...');
            loadData();
        }, 5 * 60 * 1000); // 5 minutes
        
        return () => clearInterval(refreshInterval);
    }, []);

    // Check if user has AWS credentials
    const checkAwsCredentials = async () => {
        try {
            console.log('🔍 Checking AWS credentials...');
            const result = await apiCall('/credentials/check');
            console.log('Credentials check result:', result);
            
            if (result.success !== undefined) {
                setHasAwsCredentials(result.hasCredentials);
                console.log(`AWS credentials status: ${result.hasCredentials ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗'}`);
            }
        } catch (err) {
            console.error('Error checking AWS credentials:', err);
            setHasAwsCredentials(false);
        }
    };

    // Schedule new action or update existing
    const handleScheduleSubmit = async () => {
        try {
            if (editingSchedule) {
                // Update existing schedule
                const result = await apiCall(`/schedule/${editingSchedule.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        action: scheduleFormData.action,
                        schedule: {
                            name: scheduleFormData.name,
                            cronExpression: scheduleFormData.cronExpression,
                            timezone: scheduleFormData.timezone
                        }
                    })
                });

                if (result.success) {
                    setScheduleDialogOpen(false);
                    setEditingSchedule(null);
                    loadData();
                } else {
                    setError(result.error);
                }
            } else {
                // Create new schedule
                const result = await apiCall('/schedule', {
                    method: 'POST',
                    body: JSON.stringify({
                        resourceId: scheduleFormData.resourceId,
                        action: scheduleFormData.action,
                        schedule: {
                            name: scheduleFormData.name,
                            cronExpression: scheduleFormData.cronExpression,
                            timezone: scheduleFormData.timezone
                        }
                    })
                });

                if (result.success) {
                    setScheduleDialogOpen(false);
                    loadData();
                } else {
                    // Check if it's a credentials error
                    if (result.errorCode === 'NO_AWS_CREDENTIALS') {
                        setError(result.error + ' Click the "Configure AWS" button to set up your credentials.');
                        setHasAwsCredentials(false);
                        setAwsSetupDialogOpen(true);
                    } else {
                        setError(result.error);
                    }
                }
            }
        } catch (err) {
            setError('Failed to schedule action');
        }
    };

    // Toggle pause/resume schedule
    const handleToggleSchedule = async (scheduleId: string) => {
        try {
            const result = await apiCall(`/schedule/${scheduleId}/toggle`, {
                method: 'PATCH'
            });

            if (result.success) {
                loadData();
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Failed to toggle schedule');
        }
    };

    // Open edit dialog
    const handleEditSchedule = (schedule: ScheduledAction) => {
        setEditingSchedule(schedule);
        setScheduleFormData({
            resourceId: schedule.resource_id,
            action: schedule.schedule_type,
            cronExpression: schedule.cron_expression,
            timezone: schedule.timezone,
            name: schedule.schedule_name
        });
        setScheduleDialogOpen(true);
    };

    // Delete schedule
    const handleDeleteSchedule = async (scheduleId: string) => {
        if (!window.confirm('Are you sure you want to delete this scheduled action? This cannot be undone.')) {
            return;
        }

        try {
            const result = await apiCall(`/schedule/${scheduleId}`, {
                method: 'DELETE'
            });

            if (result.success) {
                loadData();
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Failed to delete schedule');
        }
    };

    // Reset form when dialog closes
    const handleCloseDialog = () => {
        setScheduleDialogOpen(false);
        setEditingSchedule(null);
        setScheduleFormData({
            resourceId: '',
            action: 'shutdown',
            cronExpression: '',
            timezone: 'UTC',
            name: ''
        });
    };

    // Apply rightsizing recommendation
    const handleApplyRightsizing = async (recommendationId: string) => {
        try {
            const result = await apiCall(`/rightsize/apply/${recommendationId}`, {
                method: 'POST'
            });

            if (result.success) {
                loadData(); // Refresh data
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Failed to apply rightsizing recommendation');
        }
    };

    // Scan AWS for orphaned resources
    const handleScanOrphans = async () => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('🔍 Scanning AWS for orphaned resources...');
            const result = await apiCall('/orphans/detect', {
                method: 'POST',
                body: JSON.stringify({
                    accountId: 'default' // Will use user's AWS account
                })
            });

            if (result.success) {
                console.log('✅ Scan complete, refreshing data...');
                await loadData(); // Refresh to show new orphans
            } else {
                setError(result.error || 'Failed to scan for orphans');
            }
        } catch (err) {
            console.error('Error scanning for orphans:', err);
            setError('Failed to scan AWS for orphaned resources');
        } finally {
            setLoading(false);
        }
    };

    // Cleanup orphaned resource
    const handleCleanupOrphan = async (resourceId: string, force = false) => {
        try {
            const result = await apiCall(`/orphans/${resourceId}?force=${force}`, {
                method: 'DELETE'
            });

            if (result.success) {
                loadData(); // Refresh data
            } else {
                setError(result.message || result.error);
            }
        } catch (err) {
            setError('Failed to cleanup orphaned resource');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getPriorityColor = (impact: string) => {
        switch (impact) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'default';
        }
    };

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'default';
        }
    };

    if (loading && !status) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Box textAlign="center">
                    <CircularProgress size={60} />
                    <Typography variant="h6" sx={{ mt: 2 }}>
                        Loading Resource Lifecycle Management...
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Page Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <RefreshIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h4">🔄 Resource Lifecycle Management</Typography>
                {loading && <CircularProgress size={20} />}
                <Box sx={{ ml: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
                    {hasAwsCredentials === true && (
                        <Chip 
                            label="AWS Connected" 
                            color="success" 
                            size="small"
                            icon={<CheckCircleIcon />}
                        />
                    )}
                    {hasAwsCredentials === false && (
                        <Chip 
                            label="AWS Not Configured" 
                            color="error" 
                            size="small"
                            icon={<WarningIcon />}
                            onClick={() => setAwsSetupDialogOpen(true)}
                        />
                    )}
                    {status && (
                        <>
                            <Chip label={`${status.scheduledActions} scheduled`} color="primary" variant="outlined" />
                            <Chip label={`${status.pendingRightsizing} recommendations`} color="warning" variant="outlined" />
                            <Chip label={`${status.orphanedResources} orphaned`} color="error" variant="outlined" />
                        </>
                    )}
                </Box>
            </Box>
            
            {/* Header with Status Cards */}
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(280px, 1fr))" gap={2} mb={3}>
                <Card>
                    <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography color="textSecondary" gutterBottom>
                                    Scheduled Actions
                                </Typography>
                                <Typography variant="h4" component="div">
                                    <AnimatedCounter value={status?.scheduledActions || 0} />
                                </Typography>
                            </Box>
                            <ScheduleIcon color="primary" sx={{ fontSize: 40 }} />
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography color="textSecondary" gutterBottom>
                                    Rightsizing Opportunities
                                </Typography>
                                <Typography variant="h4" component="div">
                                    <AnimatedCounter value={status?.pendingRightsizing || 0} />
                                </Typography>
                            </Box>
                            <OptimizeIcon color="warning" sx={{ fontSize: 40 }} />
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography color="textSecondary" gutterBottom>
                                    Orphaned Resources
                                </Typography>
                                <Typography variant="h4" component="div">
                                    <AnimatedCounter value={status?.orphanedResources || 0} />
                                </Typography>
                            </Box>
                            <CleanupIcon color="error" sx={{ fontSize: 40 }} />
                        </Box>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box>
                                <Typography color="textSecondary" gutterBottom>
                                    Automation Status
                                </Typography>
                                <Chip 
                                    label={status?.automationStatus || 'Unknown'}
                                    color={status?.automationStatus === 'active' ? 'success' : 'default'}
                                    variant="outlined"
                                />
                            </Box>
                            <AssessmentIcon color="info" sx={{ fontSize: 40 }} />
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* AWS Credentials Status */}
            {hasAwsCredentials === false && (
                <Alert 
                    severity="warning" 
                    sx={{ mb: 2 }}
                    action={
                        <Button 
                            color="inherit" 
                            size="small"
                            onClick={() => setAwsSetupDialogOpen(true)}
                        >
                            Configure AWS
                        </Button>
                    }
                >
                    AWS credentials not configured. You need to set up your AWS credentials to schedule resource actions.
                </Alert>
            )}
            {hasAwsCredentials === true && (
                <Alert 
                    severity="success" 
                    sx={{ mb: 2 }}
                    onClose={() => setHasAwsCredentials(null)}
                >
                    ✓ AWS credentials configured and ready
                </Alert>
            )}

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Main Tabs */}
            <Card>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                        value={tabValue} 
                        onChange={(_, newValue) => setTabValue(newValue)}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <Tab 
                            label="Scheduled Actions" 
                            icon={<ScheduleIcon />} 
                            iconPosition="start"
                        />
                        <Tab 
                            label="Rightsizing" 
                            icon={<SpeedIcon />} 
                            iconPosition="start"
                        />
                        <Tab 
                            label="Orphan Cleanup" 
                            icon={<AutoDeleteIcon />} 
                            iconPosition="start"
                        />
                    </Tabs>
                </Box>

                {/* Scheduled Actions Tab */}
                <TabPanel value={tabValue} index={0}>
                    <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                        <Typography variant="h6">Resource Scheduling</Typography>
                        <Box>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={loadData}
                                sx={{ mr: 1 }}
                            >
                                Refresh
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => {
                                    if (hasAwsCredentials === false) {
                                        setError('Please configure your AWS credentials before scheduling actions.');
                                        setAwsSetupDialogOpen(true);
                                        return;
                                    }
                                    setEditingSchedule(null);
                                    setScheduleFormData({
                                        resourceId: '',
                                        action: 'shutdown',
                                        cronExpression: '',
                                        timezone: 'UTC',
                                        name: ''
                                    });
                                    setScheduleDialogOpen(true);
                                }}
                                disabled={hasAwsCredentials === false}
                            >
                                Schedule Action
                            </Button>
                        </Box>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Resource</TableCell>
                                    <TableCell>Action</TableCell>
                                    <TableCell>Schedule</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Service</TableCell>
                                    <TableCell>Region</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {scheduledActions.map((action) => (
                                    <TableRow key={action.id}>
                                        <TableCell>{action.resource_id}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={action.schedule_type}
                                                size="small"
                                                color={action.schedule_type === 'terminate' ? 'error' : 'primary'}
                                            />
                                        </TableCell>
                                        <TableCell>{action.cron_expression}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={action.is_active ? 'Active' : 'Inactive'}
                                                size="small"
                                                color={action.is_active ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>{action.service_name}</TableCell>
                                        <TableCell>{action.region}</TableCell>
                                        <TableCell>
                                            <Tooltip title="Edit Schedule">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleEditSchedule(action)}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={action.is_active ? "Pause" : "Resume"}>
                                                <IconButton 
                                                    size="small" 
                                                    color={action.is_active ? "warning" : "success"}
                                                    onClick={() => handleToggleSchedule(action.id)}
                                                >
                                                    {action.is_active ? <PauseIcon /> : <PlayArrow />}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Schedule">
                                                <IconButton 
                                                    size="small" 
                                                    color="error"
                                                    onClick={() => handleDeleteSchedule(action.id)}
                                                >
                                                    <CleanupIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>

                {/* Rightsizing Tab */}
                <TabPanel value={tabValue} index={1}>
                    <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                        <Typography variant="h6">Rightsizing Recommendations</Typography>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={loadData}
                        >
                            Refresh
                        </Button>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Resource</TableCell>
                                    <TableCell>Current Type</TableCell>
                                    <TableCell>Recommended</TableCell>
                                    <TableCell>Savings</TableCell>
                                    <TableCell>Confidence</TableCell>
                                    <TableCell>Impact</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rightsizingRecommendations.map((rec) => (
                                    <TableRow key={rec.id}>
                                        <TableCell>{rec.resource_id}</TableCell>
                                        <TableCell>{rec.current_instance_type}</TableCell>
                                        <TableCell>{rec.recommended_instance_type}</TableCell>
                                        <TableCell>{formatCurrency(rec.potential_savings)}</TableCell>
                                        <TableCell>
                                            <Box display="flex" alignItems="center">
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={rec.confidence_score} 
                                                    sx={{ width: 60, mr: 1 }}
                                                />
                                                {rec.confidence_score}%
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={rec.performance_impact}
                                                size="small"
                                                color={getPriorityColor(rec.performance_impact)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => handleApplyRightsizing(rec.id)}
                                                disabled={rec.status !== 'pending'}
                                            >
                                                Apply
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>

                {/* Orphaned Resources Tab */}
                <TabPanel value={tabValue} index={2}>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            Click "Scan AWS" to sync with your AWS account and detect orphaned resources. 
                            Resources deleted from AWS Console will be automatically removed from this list after scanning.
                        </Typography>
                    </Alert>
                    
                    <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                        <Typography variant="h6">Orphaned Resources</Typography>
                        <Box>
                            <Button
                                variant="contained"
                                startIcon={<RefreshIcon />}
                                onClick={handleScanOrphans}
                                sx={{ mr: 1 }}
                                disabled={loading}
                            >
                                Scan AWS
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={loadData}
                                disabled={loading}
                            >
                                Refresh
                            </Button>
                        </Box>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Resource</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Service</TableCell>
                                    <TableCell>Orphan Type</TableCell>
                                    <TableCell>Last Activity</TableCell>
                                    <TableCell>Potential Savings</TableCell>
                                    <TableCell>Risk Level</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {orphanedResources.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            <Box py={4}>
                                                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                                                <Typography variant="h6" color="textSecondary">
                                                    No orphaned resources detected
                                                </Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    Click "Scan AWS" to check for orphaned resources in your AWS account
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orphanedResources.map((orphan) => (
                                        <TableRow key={orphan.id}>
                                            <TableCell>{orphan.resource_id}</TableCell>
                                            <TableCell>{orphan.resource_type}</TableCell>
                                            <TableCell>{orphan.service_name}</TableCell>
                                            <TableCell>
                                                <Chip label={orphan.orphan_type} size="small" />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(orphan.last_activity).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>{formatCurrency(orphan.potential_savings)}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={orphan.cleanup_risk_level}
                                                    size="small"
                                                    color={getRiskColor(orphan.cleanup_risk_level)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="error"
                                                    onClick={() => handleCleanupOrphan(orphan.resource_id)}
                                                    disabled={orphan.cleanup_status !== 'detected'}
                                                >
                                                    Cleanup
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>
            </Card>

            {/* Schedule Action Dialog */}
            <Dialog 
                open={scheduleDialogOpen} 
                onClose={handleCloseDialog}
                maxWidth="sm" 
                fullWidth
            >
                <DialogTitle>
                    {editingSchedule ? 'Edit Scheduled Action' : 'Schedule Resource Action'}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} pt={1}>
                        <TextField
                            label="Resource ID"
                            value={scheduleFormData.resourceId}
                            onChange={(e) => setScheduleFormData(prev => ({
                                ...prev, 
                                resourceId: e.target.value
                            }))}
                            disabled={!!editingSchedule}
                            fullWidth
                        />
                        
                        <FormControl fullWidth>
                            <InputLabel>Action</InputLabel>
                            <Select
                                value={scheduleFormData.action}
                                onChange={(e) => setScheduleFormData(prev => ({
                                    ...prev, 
                                    action: e.target.value as any
                                }))}
                            >
                                <MenuItem value="shutdown">Shutdown</MenuItem>
                                <MenuItem value="startup">Startup</MenuItem>
                                <MenuItem value="resize">Resize</MenuItem>
                                <MenuItem value="terminate">Terminate</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Schedule Name"
                            value={scheduleFormData.name}
                            onChange={(e) => setScheduleFormData(prev => ({
                                ...prev, 
                                name: e.target.value
                            }))}
                            fullWidth
                        />

                        <TextField
                            label="Cron Expression"
                            value={scheduleFormData.cronExpression}
                            onChange={(e) => setScheduleFormData(prev => ({
                                ...prev, 
                                cronExpression: e.target.value
                            }))}
                            placeholder="0 18 * * 1-5"
                            helperText="Example: '0 18 * * 1-5' = 6 PM on weekdays"
                            fullWidth
                        />

                        <TextField
                            label="Timezone"
                            value={scheduleFormData.timezone}
                            onChange={(e) => setScheduleFormData(prev => ({
                                ...prev, 
                                timezone: e.target.value
                            }))}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleScheduleSubmit} 
                        variant="contained"
                        disabled={!scheduleFormData.resourceId || !scheduleFormData.cronExpression}
                    >
                        {editingSchedule ? 'Update' : 'Schedule'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* AWS Setup Dialog */}
            <AwsSetupDialog 
                open={awsSetupDialogOpen}
                onClose={() => {
                    setAwsSetupDialogOpen(false);
                    checkAwsCredentials(); // Recheck after closing
                }}
                onSuccess={() => {
                    setAwsSetupDialogOpen(false);
                    setHasAwsCredentials(true);
                    setError(null);
                    checkAwsCredentials(); // Recheck after successful setup
                }}
            />
        </Box>
    );
};

export default ResourceLifecycleManagement;
