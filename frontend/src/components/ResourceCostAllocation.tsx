// Resource Cost Allocation Dashboard Component
import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Grid,
    Box,
    Chip,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Tooltip as MuiTooltip,
    Checkbox
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
            id={`resource-tabpanel-${index}`}
            aria-labelledby={`resource-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const ResourceCostAllocation: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [allocationSummary, setAllocationSummary] = useState<any>(null);
    const [tagCompliance, setTagCompliance] = useState<any>(null);
    const [costBreakdown, setCostBreakdown] = useState<any[]>([]);
    const [topCostCenters, setTopCostCenters] = useState<any[]>([]);
    const [chargebackReports, setChargebackReports] = useState<any[]>([]);
    const [allocationRules, setAllocationRules] = useState<any[]>([]);
    
    // Selection states for chargeback reports
    const [selectedReports, setSelectedReports] = useState<Set<number>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    
    // Selection states for cost breakdown
    const [selectedBreakdowns, setSelectedBreakdowns] = useState<Set<string>>(new Set());
    const [selectAllBreakdowns, setSelectAllBreakdowns] = useState(false);

    // Dialog states
    const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);

    // Form states
    const [newRule, setNewRule] = useState({
        rule_name: '',
        rule_type: 'service_based',
        condition_json: {},
        allocation_target: {},
        priority: 100,
        services: '',
        regions: '',
        tags: '',
        cost_center: '',
        department: '',
        project: '',
        environment: '',
        team: '',
        business_unit: ''
    });

    const [newReport, setNewReport] = useState({
        period: 'monthly',
        report_date: new Date().toISOString().split('T')[0]
    });

    // Fetch allocation rules
    const fetchAllocationRules = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/resource-costs/allocation-rules`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAllocationRules(data.data);
            }
        } catch (error) {
            console.error('Error fetching allocation rules:', error);
        }
    };

    // Create allocation rule
    const createAllocationRule = async () => {
        try {
            const token = localStorage.getItem('authToken');

            // Prepare rule data based on type
            let conditionJson = {};
            let allocationTarget = {};

            if (newRule.rule_type === 'service_based') {
                conditionJson = {
                    services: newRule.services?.split(',').map((s: string) => s.trim()) || []
                };
            } else if (newRule.rule_type === 'region_based') {
                conditionJson = {
                    regions: newRule.regions?.split(',').map((s: string) => s.trim()) || []
                };
            } else if (newRule.rule_type === 'tag_based') {
                // Parse tags string into key-value pairs
                const tags: Record<string, string> = {};
                if (newRule.tags) {
                    newRule.tags.split(',').forEach(tag => {
                        const [key, value] = tag.split('=').map(s => s.trim());
                        if (key && value) {
                            tags[key] = value;
                        }
                    });
                }
                conditionJson = { tags };
            }

            allocationTarget = {
                cost_center: newRule.cost_center || null,
                department: newRule.department || null,
                project: newRule.project || null,
                environment: newRule.environment || null,
                team: newRule.team || null,
                business_unit: newRule.business_unit || null
            };

            const ruleData = {
                rule_name: newRule.rule_name,
                rule_type: newRule.rule_type,
                condition_json: conditionJson,
                allocation_target: allocationTarget,
                priority: newRule.priority
            };

            const response = await fetch(`${API_URL}/api/resource-costs/allocation-rules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(ruleData)
            });

            if (response.ok) {
                setRuleDialogOpen(false);
                setNewRule({
                    rule_name: '',
                    rule_type: 'service_based',
                    condition_json: {},
                    allocation_target: {},
                    priority: 100,
                    services: '',
                    regions: '',
                    tags: '',
                    cost_center: '',
                    department: '',
                    project: '',
                    environment: '',
                    team: '',
                    business_unit: ''
                });
                await fetchAllocationRules();
                alert('Allocation rule created successfully!');
            } else {
                const error = await response.json();
                alert('Error creating rule: ' + error.error);
            }
        } catch (error) {
            console.error('Error creating allocation rule:', error);
            alert('Error creating allocation rule');
        }
    };

    // Generate chargeback report
    const generateChargebackReport = async () => {
        try {
            const token = localStorage.getItem('authToken');

            console.log('🔍 Generating chargeback report with data:', newReport);

            const response = await fetch(`${API_URL}/api/resource-costs/chargeback-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newReport)
            });

            console.log('🔍 Chargeback report response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('🔍 Chargeback report result:', result);
                setReportDialogOpen(false);
                await fetchChargebackReports();
                alert('Chargeback report generated successfully!');
            } else {
                const errorText = await response.text();
                console.error('❌ Error generating report - status:', response.status, 'text:', errorText);
                try {
                    const error = JSON.parse(errorText);
                    alert('Error generating report: ' + error.error);
                } catch (parseError) {
                    alert('Error generating report: ' + errorText);
                }
            }
        } catch (error) {
            console.error('❌ Error generating chargeback report:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            alert('Error generating chargeback report: ' + errorMessage);
        }
    };

    const loadAllData = async () => {
        setLoading(true);
        setError(null);

        try {
            await Promise.all([
                fetchAllocationSummary(),
                fetchTagCompliance(),
                fetchCostBreakdown(),
                fetchTopCostCenters(),
                fetchChargebackReports(),
                fetchAllocationRules()
            ]);
        } catch (error) {
            setError('Failed to load resource cost allocation data');
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllocationSummary = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/resource-costs/allocation-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAllocationSummary(data.data);
            }
        } catch (error) {
            console.error('Error fetching allocation summary:', error);
        }
    };

    const fetchTagCompliance = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/resource-costs/tag-compliance`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTagCompliance(data.data);
            }
        } catch (error) {
            console.error('Error fetching tag compliance:', error);
        }
    };

    const fetchCostBreakdown = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/resource-costs/cost-breakdown`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setCostBreakdown(data.data);
                // Clear selections when data is refreshed
                setSelectedBreakdowns(new Set());
                setSelectAllBreakdowns(false);
            }
        } catch (error) {
            console.error('Error fetching cost breakdown:', error);
        }
    };

    // Generate unique key for breakdown row
    const getBreakdownKey = (row: any) => {
        return `${row.cost_center}|${row.department}|${row.project}|${row.environment}`;
    };

    // Handle select all for cost breakdown
    const handleSelectAllBreakdowns = (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        setSelectAllBreakdowns(checked);
        if (checked) {
            const allKeys = new Set(costBreakdown.map(row => getBreakdownKey(row)));
            setSelectedBreakdowns(allKeys);
        } else {
            setSelectedBreakdowns(new Set());
        }
    };

    // Handle individual breakdown selection
    const handleSelectBreakdown = (rowKey: string) => {
        const newSelected = new Set(selectedBreakdowns);
        if (newSelected.has(rowKey)) {
            newSelected.delete(rowKey);
        } else {
            newSelected.add(rowKey);
        }
        setSelectedBreakdowns(newSelected);
        setSelectAllBreakdowns(newSelected.size === costBreakdown.length && costBreakdown.length > 0);
    };

    // Delete selected cost breakdown records
    const deleteSelectedBreakdowns = async () => {
        if (selectedBreakdowns.size === 0) {
            alert('Please select at least one cost breakdown to delete');
            return;
        }

        const confirmDelete = window.confirm(
            `Are you sure you want to delete ${selectedBreakdowns.size} cost breakdown group(s)?\n\n` +
            `This will delete ALL underlying cost records for the selected allocations. This action cannot be undone.`
        );

        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem('authToken');
            
            // Convert selected keys back to breakdown criteria
            const breakdownCriteria = Array.from(selectedBreakdowns).map(key => {
                const [cost_center, department, project, environment] = key.split('|');
                return { cost_center, department, project, environment };
            });

            const response = await fetch(`${API_URL}/api/resource-costs/cost-breakdown/bulk-delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ breakdownCriteria })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Successfully deleted ${result.deletedCount} cost record(s) from ${selectedBreakdowns.size} breakdown group(s)`);
                await loadAllData(); // Refresh all data
            } else {
                const error = await response.json();
                alert('Error deleting cost breakdowns: ' + error.error);
            }
        } catch (error) {
            console.error('Error deleting cost breakdowns:', error);
            alert('Error deleting cost breakdowns');
        }
    };

    // Download selected cost breakdowns
    const downloadSelectedBreakdowns = async () => {
        if (selectedBreakdowns.size === 0) {
            alert('Please select at least one cost breakdown to download');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            
            // Convert selected keys back to breakdown criteria
            const breakdownCriteria = Array.from(selectedBreakdowns).map(key => {
                const [cost_center, department, project, environment] = key.split('|');
                return { cost_center, department, project, environment };
            });

            const response = await fetch(`${API_URL}/api/resource-costs/cost-breakdown/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ breakdownCriteria })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cost-breakdown-${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const error = await response.json();
                alert('Error downloading cost breakdowns: ' + error.error);
            }
        } catch (error) {
            console.error('Error downloading cost breakdowns:', error);
            alert('Error downloading cost breakdowns');
        }
    };

    const fetchTopCostCenters = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/resource-costs/top-cost-centers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTopCostCenters(data.data);
            }
        } catch (error) {
            console.error('Error fetching top cost centers:', error);
        }
    };

    const fetchChargebackReports = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/resource-costs/chargeback-reports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setChargebackReports(data.data);
                // Clear selections when reports are refreshed
                setSelectedReports(new Set());
                setSelectAll(false);
            }
        } catch (error) {
            console.error('Error fetching chargeback reports:', error);
        }
    };

    // Handle select all checkbox
    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        setSelectAll(checked);
        if (checked) {
            const allIds = new Set(chargebackReports.map(report => report.id));
            setSelectedReports(allIds);
        } else {
            setSelectedReports(new Set());
        }
    };

    // Handle individual checkbox
    const handleSelectReport = (reportId: number) => {
        const newSelected = new Set(selectedReports);
        if (newSelected.has(reportId)) {
            newSelected.delete(reportId);
        } else {
            newSelected.add(reportId);
        }
        setSelectedReports(newSelected);
        setSelectAll(newSelected.size === chargebackReports.length && chargebackReports.length > 0);
    };

    // Delete selected reports
    const deleteSelectedReports = async () => {
        if (selectedReports.size === 0) {
            alert('Please select at least one report to delete');
            return;
        }

        const confirmDelete = window.confirm(
            `Are you sure you want to delete ${selectedReports.size} report(s)? This action cannot be undone.`
        );

        if (!confirmDelete) return;

        try {
            const token = localStorage.getItem('authToken');
            const reportIds = Array.from(selectedReports);

            const response = await fetch(`${API_URL}/api/resource-costs/chargeback-reports/bulk-delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reportIds })
            });

            if (response.ok) {
                alert(`Successfully deleted ${selectedReports.size} report(s)`);
                await fetchChargebackReports();
            } else {
                const error = await response.json();
                alert('Error deleting reports: ' + error.error);
            }
        } catch (error) {
            console.error('Error deleting reports:', error);
            alert('Error deleting reports');
        }
    };

    // Download selected reports
    const downloadSelectedReports = async () => {
        if (selectedReports.size === 0) {
            alert('Please select at least one report to download');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const reportIds = Array.from(selectedReports);

            const response = await fetch(`${API_URL}/api/resource-costs/chargeback-reports/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reportIds })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `chargeback-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const error = await response.json();
                alert('Error downloading reports: ' + error.error);
            }
        } catch (error) {
            console.error('Error downloading reports:', error);
            alert('Error downloading reports');
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    // Summary Cards Component
    const SummaryCards = () => (
        <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                            Total Cost Centers
                        </Typography>
                        <Typography variant="h4">
                            {topCostCenters.length}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Active cost centers
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                            Tag Compliance
                        </Typography>
                        <Typography variant="h4">
                            {tagCompliance?.summary?.compliancePercentage || 0}%
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={tagCompliance?.summary?.compliancePercentage || 0}
                            sx={{ mt: 1 }}
                        />
                    </CardContent>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                            Allocated Resources
                        </Typography>
                        <Typography variant="h4">
                            {allocationSummary?.allocationPercentages?.assigned?.toFixed(1) || 0}%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Resources with cost center
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                            Total Allocated Cost
                        </Typography>
                        <Typography variant="h4">
                            ${allocationSummary?.totalCost?.toFixed(2) || '0.00'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            This month
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );

    // Tag Compliance Overview
    const TagComplianceOverview = () => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Tag Compliance Overview
                </Typography>

                {tagCompliance?.summary ? (
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="textSecondary">
                                    Compliant Resources: {tagCompliance.summary.compliantResources}/{tagCompliance.summary.totalResources}
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={tagCompliance.summary.compliancePercentage}
                                    sx={{ mt: 1 }}
                                />
                            </Box>

                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                Most Missing Tags:
                            </Typography>
                            {tagCompliance.topMissingTags?.map((tag: any, index: number) => (
                                <Chip
                                    key={index}
                                    label={`${tag.tag} (${tag.count})`}
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                    color="warning"
                                />
                            ))}
                        </Grid>
                    </Grid>
                ) : (
                    <Alert severity="info">No tag compliance data available</Alert>
                )}
            </CardContent>
        </Card>
    );

    // Cost Center Breakdown Chart
    const CostCenterChart = () => {
        const chartData = topCostCenters.map(center => ({
            name: center.cost_center,
            cost: parseFloat(center.total_cost),
            resources: center.resource_count
        }));

        const chartConfig = {
            labels: chartData.map(item => item.name),
            datasets: [
                {
                    label: 'Cost ($)',
                    data: chartData.map(item => item.cost),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                },
            ],
        };

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top' as const,
                },
                title: {
                    display: false,
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value: any) {
                            return '$' + value.toFixed(2);
                        }
                    }
                },
            },
        };

        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Top Cost Centers
                    </Typography>

                    {chartData.length > 0 ? (
                        <Box sx={{ height: 300 }}>
                            <Bar data={chartConfig} options={chartOptions} />
                        </Box>
                    ) : (
                        <Alert severity="info">No cost center data available</Alert>
                    )}
                </CardContent>
            </Card>
        );
    };

    // Cost Breakdown Table
    const CostBreakdownTable = () => (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                        Cost Breakdown by Allocation
                    </Typography>
                    {selectedBreakdowns.size > 0 && (
                        <Box display="flex" gap={1}>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<DownloadIcon />}
                                onClick={downloadSelectedBreakdowns}
                                size="small"
                            >
                                Download ({selectedBreakdowns.size})
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={deleteSelectedBreakdowns}
                                size="small"
                            >
                                Delete ({selectedBreakdowns.size})
                            </Button>
                        </Box>
                    )}
                </Box>

                {costBreakdown.length > 0 ? (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectAllBreakdowns}
                                            onChange={handleSelectAllBreakdowns}
                                            indeterminate={selectedBreakdowns.size > 0 && selectedBreakdowns.size < costBreakdown.length}
                                        />
                                    </TableCell>
                                    <TableCell>Cost Center</TableCell>
                                    <TableCell>Department</TableCell>
                                    <TableCell>Project</TableCell>
                                    <TableCell>Environment</TableCell>
                                    <TableCell align="right">Total Cost</TableCell>
                                    <TableCell align="right">Resources</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {costBreakdown.slice(0, 10).map((row, index) => {
                                    const rowKey = getBreakdownKey(row);
                                    return (
                                        <TableRow 
                                            key={index}
                                            hover
                                            selected={selectedBreakdowns.has(rowKey)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={selectedBreakdowns.has(rowKey)}
                                                    onChange={() => handleSelectBreakdown(rowKey)}
                                                />
                                            </TableCell>
                                            <TableCell>{row.cost_center || 'Unassigned'}</TableCell>
                                            <TableCell>{row.department || 'Unassigned'}</TableCell>
                                            <TableCell>{row.project || 'Unassigned'}</TableCell>
                                            <TableCell>{row.environment || 'Unknown'}</TableCell>
                                            <TableCell align="right">${parseFloat(row.total_cost).toFixed(2)}</TableCell>
                                            <TableCell align="right">{row.record_count}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Alert severity="info">No cost breakdown data available</Alert>
                )}
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
                <Typography variant="h6" sx={{ ml: 2 }}>
                    Loading resource cost allocation data...
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                {error}
                <Button onClick={loadAllData} sx={{ ml: 2 }}>
                    Retry
                </Button>
            </Alert>
        );
    }

    return (
        <>
            <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            Resource Cost Allocation
                        </Typography>
                        <Typography variant="body1" color="textSecondary">
                            Monitor and manage cost allocation across departments, projects, and cost centers
                        </Typography>
                    </Box>
                    <MuiTooltip title="Refresh data from AWS">
                        <IconButton 
                            onClick={loadAllData} 
                            disabled={loading}
                            color="primary"
                            size="large"
                        >
                            <RefreshIcon />
                        </IconButton>
                    </MuiTooltip>
                </Box>

                <SummaryCards />

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={tabValue} onChange={handleTabChange}>
                        <Tab label="Overview" />
                        <Tab label="Tag Compliance" />
                        <Tab label="Cost Centers" />
                        <Tab label="Allocation Rules" />
                        <Tab label="Chargeback Reports" />
                    </Tabs>
                </Box>

                {/* Allocation Rule Creation Dialog */}
                <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Create Cost Allocation Rule</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Rule Name"
                                    value={newRule.rule_name}
                                    onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                                    variant="outlined"
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Rule Type</InputLabel>
                                    <Select
                                        value={newRule.rule_type}
                                        onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value as string })}
                                        label="Rule Type"
                                    >
                                        <MenuItem value="service_based">Service Based</MenuItem>
                                        <MenuItem value="region_based">Region Based</MenuItem>
                                        <MenuItem value="tag_based">Tag Based</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {newRule.rule_type === 'service_based' && (
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label="Services (comma separated)"
                                        placeholder="ec2,s3,rds"
                                        onChange={(e) => setNewRule({ ...newRule, services: e.target.value })}
                                        variant="outlined"
                                    />
                                </Grid>
                            )}

                            {newRule.rule_type === 'region_based' && (
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label="Regions (comma separated)"
                                        placeholder="us-east-1,us-west-2"
                                        onChange={(e) => setNewRule({ ...newRule, regions: e.target.value })}
                                        variant="outlined"
                                    />
                                </Grid>
                            )}

                            {newRule.rule_type === 'tag_based' && (
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        fullWidth
                                        label="Tags (key=value pairs, comma separated)"
                                        placeholder="Environment=Production,Team=Engineering"
                                        onChange={(e) => setNewRule({ ...newRule, tags: e.target.value })}
                                        variant="outlined"
                                    />
                                </Grid>
                            )}

                            <Grid size={{ xs: 12 }}>
                                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Allocation Target</Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Cost Center"
                                    onChange={(e) => setNewRule({ ...newRule, cost_center: e.target.value })}
                                    variant="outlined"
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Department"
                                    onChange={(e) => setNewRule({ ...newRule, department: e.target.value })}
                                    variant="outlined"
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Project"
                                    onChange={(e) => setNewRule({ ...newRule, project: e.target.value })}
                                    variant="outlined"
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Environment"
                                    onChange={(e) => setNewRule({ ...newRule, environment: e.target.value })}
                                    variant="outlined"
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Team"
                                    onChange={(e) => setNewRule({ ...newRule, team: e.target.value })}
                                    variant="outlined"
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Business Unit"
                                    onChange={(e) => setNewRule({ ...newRule, business_unit: e.target.value })}
                                    variant="outlined"
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Priority"
                                    value={newRule.priority}
                                    onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 100 })}
                                    variant="outlined"
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
                        <Button onClick={createAllocationRule} variant="contained" color="primary">
                            Create Rule
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Chargeback Report Generation Dialog */}
                <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Generate Chargeback Report</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid size={{ xs: 12 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Report Period</InputLabel>
                                    <Select
                                        value={newReport.period}
                                        onChange={(e) => setNewReport({ ...newReport, period: e.target.value as string })}
                                        label="Report Period"
                                    >
                                        <MenuItem value="daily">Daily</MenuItem>
                                        <MenuItem value="weekly">Weekly</MenuItem>
                                        <MenuItem value="monthly">Monthly</MenuItem>
                                        <MenuItem value="quarterly">Quarterly</MenuItem>
                                        <MenuItem value="yearly">Yearly</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Report Date"
                                    type="date"
                                    value={newReport.report_date}
                                    onChange={(e) => setNewReport({ ...newReport, report_date: e.target.value })}
                                    variant="outlined"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setReportDialogOpen(false)}>Cancel</Button>
                        <Button onClick={generateChargebackReport} variant="contained" color="primary">
                            Generate Report
                        </Button>
                    </DialogActions>
                </Dialog>

                <TabPanel value={tabValue} index={0}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TagComplianceOverview />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <CostCenterChart />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                            <CostBreakdownTable />
                        </Grid>
                    </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <TagComplianceOverview />
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <CostCenterChart />
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">
                                    Cost Allocation Rules
                                </Typography>
                                <Button
                                    variant="contained"
                                    onClick={() => setRuleDialogOpen(true)}
                                >
                                    Create Rule
                                </Button>
                            </Box>

                            {allocationRules.length > 0 ? (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Rule Name</TableCell>
                                                <TableCell>Type</TableCell>
                                                <TableCell>Priority</TableCell>
                                                <TableCell>Cost Center</TableCell>
                                                <TableCell>Department</TableCell>
                                                <TableCell>Status</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {allocationRules.map((rule, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{rule.rule_name}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={rule.rule_type.replace('_', ' ')}
                                                            size="small"
                                                            color="primary"
                                                        />
                                                    </TableCell>
                                                    <TableCell>{rule.priority}</TableCell>
                                                    <TableCell>{rule.allocation_target?.cost_center || 'N/A'}</TableCell>
                                                    <TableCell>{rule.allocation_target?.department || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={rule.is_active ? 'Active' : 'Inactive'}
                                                            size="small"
                                                            color={rule.is_active ? 'success' : 'default'}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Alert severity="info">
                                    No allocation rules created yet. Create your first rule to automatically assign costs to departments and projects.
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </TabPanel>

                <TabPanel value={tabValue} index={4}>
                    <Card>
                        <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6">
                                    Chargeback Reports
                                </Typography>
                                <Box display="flex" gap={1}>
                                    {selectedReports.size > 0 && (
                                        <>
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                startIcon={<DownloadIcon />}
                                                onClick={downloadSelectedReports}
                                            >
                                                Download ({selectedReports.size})
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                startIcon={<DeleteIcon />}
                                                onClick={deleteSelectedReports}
                                            >
                                                Delete ({selectedReports.size})
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        variant="contained"
                                        onClick={() => setReportDialogOpen(true)}
                                    >
                                        Generate Report
                                    </Button>
                                </Box>
                            </Box>

                            {chargebackReports.length > 0 ? (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={selectAll}
                                                        onChange={handleSelectAll}
                                                        indeterminate={selectedReports.size > 0 && selectedReports.size < chargebackReports.length}
                                                    />
                                                </TableCell>
                                                <TableCell>Report Date</TableCell>
                                                <TableCell>Period</TableCell>
                                                <TableCell>Cost Center</TableCell>
                                                <TableCell>Department</TableCell>
                                                <TableCell align="right">Total Cost</TableCell>
                                                <TableCell>Created</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {chargebackReports.map((report) => (
                                                <TableRow 
                                                    key={report.id}
                                                    hover
                                                    selected={selectedReports.has(report.id)}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            checked={selectedReports.has(report.id)}
                                                            onChange={() => handleSelectReport(report.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>{new Date(report.report_date).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={report.report_period}
                                                            size="small"
                                                            color="secondary"
                                                        />
                                                    </TableCell>
                                                    <TableCell>{report.cost_center || 'All'}</TableCell>
                                                    <TableCell>{report.department || 'All'}</TableCell>
                                                    <TableCell align="right">
                                                        ${parseFloat(report.total_cost).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Alert severity="info">
                                    No chargeback reports generated yet. Generate your first report to see cost breakdowns by department.
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </TabPanel>
            </Box>

        </>
    );
};

export default ResourceCostAllocation;