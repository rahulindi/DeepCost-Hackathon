import { AnimatedCounter } from './components/AnimatedCounter';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  Button,
  Box,
  Paper,
  CircularProgress,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
  Menu,
  Tabs,
  Tab
} from '@mui/material';
import {
  CloudQueue as CloudIcon,
  AttachMoney as MoneyIcon,
  Assessment as ChartIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  AccountCircle as AccountIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  AccountBalance as ResourceIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Security as SecurityIcon,
  ShowChart as ShowChartIcon,
  GetApp as GetAppIcon,
  Webhook as WebhookIcon,
  Storage as StorageIcon,
  AutoFixHigh as AutoFixHighIcon,
  BugReport as BugReportIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import axios from 'axios';
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { AuthProvider, useAuth } from './components/AuthContext';
import { AuthDialog } from './components/AuthDialog';
import { AwsSetupDialog } from './components/AwsSetupDialog';
import EmailVerificationPage from './components/EmailVerificationPage';
import ResourceCostAllocation from './components/ResourceCostAllocation';
import AnomalyDetection from './components/AnomalyDetection';
import { HalloweenBadge, FloatingDecorations, SpookyCloudIcon, SpookyButton } from './components/HalloweenEffects';
import ReservedInstanceDashboard from './components/ReservedInstanceDashboard';
import ComplianceGovernance from './components/ComplianceGovernance';
import TrendAnalysis from './components/TrendAnalysis';
import BusinessForecasting from './components/BusinessForecasting';
import ResourceLifecycleManagement from './components/ResourceLifecycleManagement';
import ExportManager from './components/ExportManager';
import WebhookManager from './components/WebhookManager';
import DataLakeManager from './components/DataLakeManager';
import { NavigationSidebar } from './components/NavigationSidebar';
import { WorldClassDashboard } from './components/WorldClassDashboard';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import ErrorHandler from './utils/errorHandler';
import AIAssistantDebug from './components/AIAssistantDebug';
// CostCommander removed

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler);

function AppContent() {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const [awsConnectionStatus, setAwsConnectionStatus] = useState('Not Connected');
  const [costData, setCostData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [multiAccounts, setMultiAccounts] = useState<any>([]);
  // Removed: alerts, forecast, showAlertForm - features available in dedicated tabs
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showAwsSetupDialog, setShowAwsSetupDialog] = useState(false);
  const [showAwsStatusDialog, setShowAwsStatusDialog] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'resource-allocation' | 'anomalies' | 'reserved-instances' | 'compliance-governance' | 'trends' | 'business-forecast' | 'lifecycle-management' | 'export-manager' | 'webhook-manager' | 'data-lake-manager'>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showBudgetAlertDialog, setShowBudgetAlertDialog] = useState(false);
  const [budgetAlertForm, setBudgetAlertForm] = useState({
    name: '',
    amount: '',
    threshold: '80',
    period: 'monthly'
  });
  const [creatingBudget, setCreatingBudget] = useState(false);

  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleAccountMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAccountMenuAnchor(event.currentTarget);
  };

  const handleAccountMenuClose = () => {
    setAccountMenuAnchor(null);
  };

  const handleLogout = () => {
    // 🔒 SECURITY: Clear user-specific cached data on logout
    if (user?.id) {
      const userCacheKey = `cachedCostData_${user.id}`;
      const userRefreshKey = `lastCostRefresh_${user.id}`;
      localStorage.removeItem(userCacheKey);
      localStorage.removeItem(userRefreshKey);
      console.log(`🧹 Cleared cached data for user ${user.id}`);
    }
    logout();
    handleAccountMenuClose();
  };

  // Handle navigation
  const handleViewChange = (newView: string) => {
    console.log('View changed to:', newView);
    setCurrentView(newView as any);
  };

  const handleMobileNavToggle = () => {
    setMobileNavOpen(!mobileNavOpen);
  };

  // Update axios default headers when user changes
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [user]);

  const fetchTrendData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/trends/monthly?months=6`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setTrendData(result.data);
      } else {
        // Enhanced error handling while maintaining existing behavior
        const errorMessage = ErrorHandler.getErrorMessage({ response: { data: result, status: response.status } });
        console.error('❌ Trend fetch error:', errorMessage);
      }
    } catch (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      console.error('❌ Trend fetch error:', errorMessage);
    }
  };

  const checkBackendHealth = async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      setBackendStatus('✅ Connected');
    } catch (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      console.error('❌ Backend health check error:', errorMessage);
      setBackendStatus('❌ Offline');
    }
  };

  const checkAwsConnection = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_URL}/api/aws-setup/account-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setAwsConnectionStatus('✅ Connected');
      } else {
        setAwsConnectionStatus('❌ Not Connected');
        // Enhanced error logging
        const errorMessage = ErrorHandler.getErrorMessage({ response: { data: response.data, status: response.status } });
        console.error('❌ AWS connection error:', errorMessage);
      }
    } catch (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      console.error('❌ AWS connection check error:', errorMessage);
      setAwsConnectionStatus('❌ Not Connected');
    }
  };

  const handleAwsDisconnect = async () => {
    setDisconnecting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.delete(`${API_URL}/api/aws-setup/credentials`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        console.log('✅ AWS credentials disconnected successfully');
        setAwsConnectionStatus('❌ Not Connected');
        setShowAwsStatusDialog(false);
        setShowDisconnectConfirm(false);
        // Show success message
        alert('AWS account disconnected successfully!');
      } else {
        console.error('❌ Disconnect failed:', response.data.error);
        alert('Failed to disconnect AWS account: ' + response.data.error);
      }
    } catch (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      console.error('❌ AWS disconnect error:', errorMessage);
      alert('Failed to disconnect AWS account. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  // Removed fetchAlerts, createAlert, fetchForecast - features available in dedicated tabs

  const fetchMultiAccounts = async () => {
    try {
      console.log('🔍 Fetching multi-accounts...');
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/multi/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      console.log('🔍 Multi-account response:', result);
      if (result.success) {
        setMultiAccounts(result.accounts);
        console.log('🔍 Multi-accounts set:', result.accounts);
      }
    } catch (error) {
      console.error('❌ Multi-account fetch error:', error);
    }
  };

  // Update fetchCostData with cost optimization
  const fetchCostData = async (forceRefresh = false) => {
    // �  SECURITY: User-specific cache keys
    const userCacheKey = `cachedCostData_${user?.id}`;
    const userRefreshKey = `lastCostRefresh_${user?.id}`;

    // 💰 COST OPTIMIZATION: Check refresh throttling
    const lastRefresh = localStorage.getItem(userRefreshKey);
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    if (!forceRefresh && lastRefresh && parseInt(lastRefresh) > fiveMinutesAgo) {
      const minutesLeft = Math.ceil((parseInt(lastRefresh) + (5 * 60 * 1000) - Date.now()) / 60000);
      console.log(`⏳ Cost data refresh throttled. Try again in ${minutesLeft} minutes to avoid unnecessary AWS costs.`);

      // Show user-friendly message - USER-SPECIFIC CACHE
      const existingData = localStorage.getItem(userCacheKey);
      if (existingData) {
        const cachedData = JSON.parse(existingData);
        setCostData(cachedData);
        const processedAnalytics = analyzeCostData(cachedData);
        setAnalytics(processedAnalytics);
        console.log(`✅ Using cached data for user ${user?.id} - $0.00 cost`);
        return;
      }
    }

    setLoading(true);
    try {
      console.log('🔄 Fetching cost data - potential $0.01 cost');
      const response = await axios.get(`${API_URL}/api/cost-data`);
      setCostData(response.data);

      // 🔒 SECURITY: Cache data with user-specific key
      localStorage.setItem(userCacheKey, JSON.stringify(response.data));
      localStorage.setItem(userRefreshKey, Date.now().toString());

      const processedAnalytics = analyzeCostData(response.data);
      setAnalytics(processedAnalytics);

      await fetchTrendData();
      await fetchMultiAccounts();

      console.log(`✅ Cost data refreshed successfully for user ${user?.id}`);
    } catch (error) {
      console.error('Failed to fetch cost data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeCostData = (data: any) => {
    if (!data || !data.ResultsByTime || data.ResultsByTime.length === 0) {
      return null;
    }

    // Consolidate data across all time periods and regions
    const serviceMap = new Map();
    let totalCost = 0;

    data.ResultsByTime.forEach((timePoint: any) => {
      timePoint.Groups?.forEach((group: any) => {
        const serviceName = group.Keys[0];

        // Check both BlendedCost and UnblendedCost (same as backend)
        const costData = group.Metrics?.BlendedCost || group.Metrics?.UnblendedCost;
        if (!costData || !costData.Amount) {
          return; // Skip if no cost data
        }

        const cost = parseFloat(costData.Amount);

        // Consolidate similar services
        let consolidatedName = serviceName;
        if (serviceName.includes('Simple Storage Service')) {
          consolidatedName = 'Amazon S3';
        } else if (serviceName.includes('Elastic Compute Cloud')) {
          consolidatedName = 'Amazon EC2';
        } else if (serviceName.includes('Data Transfer')) {
          consolidatedName = 'AWS Data Transfer';
        }

        if (serviceMap.has(consolidatedName)) {
          serviceMap.set(consolidatedName, serviceMap.get(consolidatedName) + cost);
        } else {
          serviceMap.set(consolidatedName, cost);
        }

        totalCost += cost;
      });
    });

    // Define distinct color palette for chart (20 colors to avoid duplicates)
    const CHART_COLORS = [
      '#FF6384', // Pink
      '#36A2EB', // Blue
      '#FFCE56', // Yellow
      '#4BC0C0', // Teal
      '#9966FF', // Purple
      '#FF9F40', // Orange
      '#FF6B6B', // Red
      '#4ECDC4', // Cyan
      '#45B7D1', // Sky Blue
      '#FFA07A', // Light Salmon
      '#98D8C8', // Mint
      '#F7DC6F', // Light Yellow
      '#BB8FCE', // Light Purple
      '#85C1E2', // Powder Blue
      '#F8B739', // Gold
      '#52B788', // Green
      '#E76F51', // Terracotta
      '#2A9D8F', // Dark Teal
      '#E9C46A', // Sand
      '#F4A261'  // Peach
    ];

    // Convert to array and sort by cost
    const serviceData = Array.from(serviceMap.entries())
      .map(([service, cost], index) => ({
        service,
        cost: cost,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }))
      .filter(item => item.cost !== 0)
      .sort((a, b) => b.cost - a.cost);

    // Generate chart data with full service names
    const chartData = {
      labels: serviceData.map(item => item.service),
      datasets: [
        {
          data: serviceData.map(item => Math.abs(item.cost)), // Use absolute values for chart
          backgroundColor: serviceData.map(item => item.color),
          borderWidth: 2,
          borderColor: '#fff'
        }
      ]
    };

    // Generate optimization suggestions
    const optimizationSuggestions = generateOptimizationSuggestions(serviceData, totalCost);

    return {
      totalCost: Math.abs(totalCost),
      serviceCount: serviceData.length,
      chartData,
      serviceData,
      optimizationSuggestions
    };
  };

  const generateOptimizationSuggestions = (services: any[], totalCost: number) => {
    const suggestions: any[] = [];

    // Find highest cost service
    const sortedServices = services.sort((a, b) => b.cost - a.cost);

    if (sortedServices.length > 0 && sortedServices[0].cost > totalCost * 0.3) {
      suggestions.push({
        title: `High ${sortedServices[0].service} Usage`,
        description: `${sortedServices[0].service} accounts for ${((sortedServices[0].cost / totalCost) * 100).toFixed(1)}% of your costs. Consider rightsizing or optimization.`,
        severity: 'warning' as const,
        potentialSavings: `$${(sortedServices[0].cost * 0.2).toFixed(2)}/month`
      });
    }

    if (totalCost > 100) {
      suggestions.push({
        title: 'Reserved Instance Opportunity',
        description: 'Your monthly spend suggests Reserved Instances could provide significant savings for consistent workloads.',
        severity: 'info' as const,
        potentialSavings: `$${(totalCost * 0.3).toFixed(2)}/month`
      });
    }

    if (services.length > 5) {
      suggestions.push({
        title: 'Service Consolidation',
        description: `You're using ${services.length} services. Consider consolidating similar workloads to reduce complexity and costs.`,
        severity: 'info' as const,
        potentialSavings: `$${(totalCost * 0.15).toFixed(2)}/month`
      });
    }

    return suggestions;
  };

  const exportToCsv = async () => {
    if (!analytics?.serviceData) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/export/csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ costData: analytics.serviceData })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aws-cost-report.csv';
      a.click();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const exportDashboard = async () => {
    try {
      const token = localStorage.getItem('authToken');

      // Create export job for dashboard summary
      const exportConfig = {
        name: `Dashboard Export - ${new Date().toLocaleDateString()}`,
        type: 'dashboard-summary',
        output: {
          format: 'csv',
          columns: ['metric', 'value', 'period'],
          delivery: { type: 'download' }
        },
        filters: {
          timeRange: '30',
          includeCharts: false
        }
      };

      const response = await axios.post(
        `${API_URL}/api/export/jobs`,
        exportConfig,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const jobId = response.data.job.id;
        console.log('✅ Dashboard export job created:', jobId);

        // Wait a moment for job to process
        setTimeout(async () => {
          try {
            const downloadResponse = await axios.get(
              `${API_URL}/api/export/jobs/${jobId}/download`,
              {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
              }
            );

            const blob = new Blob([downloadResponse.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            console.log('✅ Dashboard exported successfully');
          } catch (downloadError) {
            console.error('❌ Download error:', downloadError);
            alert('Export created but download failed. Please check Export Manager.');
          }
        }, 2000);
      }
    } catch (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      console.error('❌ Dashboard export error:', errorMessage);
      alert('Failed to export dashboard. Please try again.');
    }
  };

  const handleCreateBudgetAlert = async () => {
    if (!budgetAlertForm.name || !budgetAlertForm.amount) {
      alert('Please fill in all required fields');
      return;
    }

    setCreatingBudget(true);
    try {
      const token = localStorage.getItem('authToken');

      // Calculate start and end dates based on period
      const startDate = new Date();
      const endDate = new Date();

      if (budgetAlertForm.period === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (budgetAlertForm.period === 'quarterly') {
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (budgetAlertForm.period === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const budgetData = {
        name: budgetAlertForm.name,
        amount: parseFloat(budgetAlertForm.amount),
        period: budgetAlertForm.period,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        notificationThreshold: parseInt(budgetAlertForm.threshold),
        serviceName: null,
        region: null,
        costCenter: null,
        department: null,
        project: null,
        tags: null
      };

      const response = await axios.post(
        `${API_URL}/api/budgets`,
        budgetData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        console.log('✅ Budget alert created successfully');
        alert(`Budget alert "${budgetAlertForm.name}" created successfully! You'll be notified when spending reaches ${budgetAlertForm.threshold}% of $${budgetAlertForm.amount}.`);
        setShowBudgetAlertDialog(false);
        setBudgetAlertForm({
          name: '',
          amount: '',
          threshold: '80',
          period: 'monthly'
        });
        // Refresh budgets list
        if ((window as any).__refreshBudgets) {
          (window as any).__refreshBudgets();
        }
      } else {
        alert('Failed to create budget alert: ' + response.data.error);
      }
    } catch (error) {
      const errorMessage = ErrorHandler.getErrorMessage(error);
      console.error('❌ Budget creation error:', errorMessage);
      alert('Failed to create budget alert. Please try again.');
    } finally {
      setCreatingBudget(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Add this useEffect to check AWS connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      checkAwsConnection();
    }
  }, [isAuthenticated, user]);

  // 💰 COST OPTIMIZATION: Database-only real-time polling
  useEffect(() => {
    let statusInterval: NodeJS.Timeout;

    if (isAuthenticated && user) {
      // Health checks every 30 seconds - NO AWS cost
      statusInterval = setInterval(() => {
        checkBackendHealth();
        checkAwsConnection();
      }, 30000);

      console.log('🔄 Real-time status polling enabled - $0.00 cost');
    }

    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [isAuthenticated, user]);

  // Auto-load cached data on mount - USER-SPECIFIC
  useEffect(() => {
    if (isAuthenticated && user) {
      // 🔒 SECURITY: Load only THIS user's cached data
      const userCacheKey = `cachedCostData_${user.id}`;
      const cachedData = localStorage.getItem(userCacheKey);
      if (cachedData) {
        console.log(`📊 Loading cached cost data for user ${user.id} - $0.00 cost`);
        const data = JSON.parse(cachedData);
        setCostData(data);
        const processedAnalytics = analyzeCostData(data);
        setAnalytics(processedAnalytics);
      } else {
        console.log(`ℹ️ No cached data found for user ${user.id} - AWS setup required`);
      }
    }
  }, [isAuthenticated, user]);

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Halloween Floating Decorations */}
      <FloatingDecorations />

      {/* Cost Commander AI Removed - Redundant with AICostAssistant */}

      {/* Sidebar Navigation - Only show when authenticated */}
      {isAuthenticated && (
        <NavigationSidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="static"
          sx={{
            background: isDarkMode
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
            zIndex: (theme) => theme.zIndex.drawer + 1
          }}
        >
          <Toolbar>
            {/* Mobile Menu Button */}
            {isAuthenticated && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleMobileNavToggle}
                sx={{ mr: 2, display: { md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
            )}

            <CloudIcon sx={{ mr: 2, fontSize: 32 }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              FrankenCost
            </Typography>

            {/* Kiroween Badge */}
            <Box sx={{ ml: 2, mr: 'auto' }}>
              <HalloweenBadge />
            </Box>

            {/* Theme Toggle */}
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              sx={{ mr: 1 }}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            {isAuthenticated ? (
              <>
                <Chip
                  label={`${user?.subscription_tier?.toUpperCase()} Plan`}
                  color="secondary"
                  variant="outlined"
                  sx={{ color: 'white', borderColor: 'white', mr: 2 }}
                />
                <IconButton
                  size="large"
                  aria-label="account of current user"
                  aria-controls="account-menu"
                  aria-haspopup="true"
                  onClick={handleAccountMenu}
                  color="inherit"
                >
                  <AccountIcon />
                </IconButton>
                <Menu
                  id="account-menu"
                  anchorEl={accountMenuAnchor}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(accountMenuAnchor)}
                  onClose={handleAccountMenuClose}
                >
                  <MenuItem onClick={handleAccountMenuClose}>
                    <Typography>{user?.username}</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleAccountMenuClose}>
                    <Typography variant="body2" color="textSecondary">{user?.email}</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Chip
                  label="Enterprise Edition"
                  color="secondary"
                  variant="outlined"
                  sx={{ color: 'white', borderColor: 'white', mr: 2 }}
                />
                <Button
                  color="inherit"
                  startIcon={<LoginIcon />}
                  onClick={() => setShowAuthDialog(true)}
                >
                  Login
                </Button>
              </>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4, pb: 4, flexGrow: 1 }}>
          {!isAuthenticated ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '400px',
                  height: '400px',
                  background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  zIndex: 0,
                },
              }}
            >
              {/* Spooky Cloud Icon */}
              <Box sx={{ mb: 3, position: 'relative', zIndex: 1 }}>
                <SpookyCloudIcon size={90} />
              </Box>

              {/* Halloween-themed title */}
              <Typography
                variant="h4"
                gutterBottom
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #667eea 0%, #a855f7 50%, #f97316 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                Welcome to FrankenCost
              </Typography>

              <Typography
                variant="body1"
                color="textSecondary"
                sx={{
                  mb: 4,
                  position: 'relative',
                  zIndex: 1,
                  maxWidth: 500,
                  mx: 'auto',
                }}
              >
                Monitor, analyze, and optimize your AWS costs with AI-powered insights
              </Typography>

              {/* Spooky Sign In Button */}
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <SpookyButton
                  onClick={() => setShowAuthDialog(true)}
                  startIcon={<LoginIcon />}
                >
                  Sign In / Register
                </SpookyButton>
              </Box>

              {/* Decorative elements around the CTA */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '20%',
                  left: '15%',
                  fontSize: 24,
                  opacity: 0.15,
                  animation: 'float 3s ease-in-out infinite',
                  '@keyframes float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                  },
                }}
              >
                🦇
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  top: '30%',
                  right: '18%',
                  fontSize: 20,
                  opacity: 0.12,
                  animation: 'float 4s ease-in-out infinite',
                  animationDelay: '1s',
                }}
              >
                👻
              </Box>
            </Box>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <WorldClassDashboard
                  backendStatus={backendStatus}
                  awsConnectionStatus={awsConnectionStatus}
                  onRefresh={() => fetchCostData()}
                  onAwsSetup={() => {
                    if (awsConnectionStatus === '✅ Connected') {
                      setShowAwsStatusDialog(true);
                    } else {
                      setShowAwsSetupDialog(true);
                    }
                  }}
                  loading={loading}
                  onViewDetailedReport={() => setCurrentView('resource-allocation')}
                  onExportDashboard={exportDashboard}
                  onSetBudgetAlert={() => {
                    // Pre-fill with smart defaults based on current spending
                    const suggestedBudget = analytics?.totalCost ? (analytics.totalCost * 1.2).toFixed(0) : '1000';
                    setBudgetAlertForm({
                      name: `Monthly Budget - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                      amount: suggestedBudget,
                      threshold: '80',
                      period: 'monthly'
                    });
                    setShowBudgetAlertDialog(true);
                  }}
                  onBudgetCreated={() => {
                    // Callback to refresh budgets after creation
                    if ((window as any).__refreshBudgets) {
                      (window as any).__refreshBudgets();
                    }
                  }}
                />
              )}

              {false && currentView === 'dashboard' && (
                <>
                  {/* OLD DASHBOARD - Kept for reference but disabled */}
                  {/* Status Overview */}
                  <Box sx={{ mb: 4 }}>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2
                        }}>
                          <Box>
                            <Typography
                              variant="h4"
                              sx={{
                                fontWeight: 700,
                                background: isDarkMode
                                  ? 'linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)'
                                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent',
                                mb: 1
                              }}
                            >
                              💰 Cost Analytics Dashboard
                            </Typography>
                            <Typography variant="body1" color="textSecondary">
                              Real-time AWS cost monitoring and optimization insights
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                              variant="outlined"
                              startIcon={<RefreshIcon />}
                              onClick={() => fetchCostData()}
                              disabled={loading}
                              sx={{
                                borderColor: 'primary.main',
                                '&:hover': {
                                  borderColor: 'primary.dark',
                                  backgroundColor: 'rgba(102, 126, 234, 0.04)'
                                }
                              }}
                            >
                              {loading ? 'Fetching...' : 'Refresh Data'}
                            </Button>
                            <Button
                              variant="contained"
                              onClick={() => {
                                if (awsConnectionStatus === '✅ Connected') {
                                  setShowAwsStatusDialog(true);
                                } else {
                                  setShowAwsSetupDialog(true);
                                }
                              }}
                              sx={{
                                background: awsConnectionStatus === '✅ Connected'
                                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': {
                                  background: awsConnectionStatus === '✅ Connected'
                                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                                    : 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                                }
                              }}
                            >
                              {awsConnectionStatus === '✅ Connected' ? 'AWS Status' : 'AWS Setup'}
                            </Button>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Status Cards */}
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Card sx={{
                          background: isDarkMode
                            ? 'linear-gradient(135deg, rgba(129, 140, 248, 0.2) 0%, rgba(167, 139, 250, 0.2) 100%)'
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          backdropFilter: 'blur(20px)',
                          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                          color: 'white',
                          height: '140px',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: isDarkMode
                              ? '0 25px 50px -12px rgba(129, 140, 248, 0.4)'
                              : '0 25px 50px -12px rgba(102, 126, 234, 0.4)',
                          },
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                          },
                          '&:hover::before': {
                            opacity: 1,
                          }
                        }}>
                          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                              <Box display="flex" alignItems="center">
                                <CheckIcon sx={{ mr: 1, fontSize: 28 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>API Status</Typography>
                              </Box>
                              <Box sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: backendStatus.includes('✅') ? '#10b981' : '#ef4444',
                                boxShadow: backendStatus.includes('✅')
                                  ? '0 0 20px rgba(16, 185, 129, 0.6)'
                                  : '0 0 20px rgba(239, 68, 68, 0.6)',
                                animation: backendStatus.includes('✅')
                                  ? 'pulse-success 2s ease-in-out infinite'
                                  : 'pulse-error 2s ease-in-out infinite',
                                '@keyframes pulse-success': {
                                  '0%': {
                                    boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)'
                                  },
                                  '70%': {
                                    boxShadow: '0 0 0 10px rgba(16, 185, 129, 0)'
                                  },
                                  '100%': {
                                    boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)'
                                  }
                                },
                                '@keyframes pulse-error': {
                                  '0%': {
                                    boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)'
                                  },
                                  '70%': {
                                    boxShadow: '0 0 0 10px rgba(239, 68, 68, 0)'
                                  },
                                  '100%': {
                                    boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)'
                                  }
                                }
                              }} />

                            </Box>
                            <Typography variant="h4" sx={{
                              mb: 1,
                              fontWeight: 700,
                              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                              {backendStatus}
                            </Typography>
                            <Typography variant="body2" sx={{
                              opacity: 0.9,
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}>
                              Backend API Connection
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, md: 3 }}>
                        <Card sx={{
                          background: isDarkMode
                            ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(251, 113, 133, 0.2) 100%)'
                            : 'linear-gradient(135deg, #FF9900 0%, #FF6B35 100%)',
                          backdropFilter: 'blur(20px)',
                          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                          color: 'white',
                          height: '140px',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: isDarkMode
                              ? '0 25px 50px -12px rgba(251, 146, 60, 0.4)'
                              : '0 25px 50px -12px rgba(255, 153, 0, 0.4)',
                          },
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                          },
                          '&:hover::before': {
                            opacity: 1,
                          }
                        }}>
                          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                              <Box display="flex" alignItems="center">
                                <CloudIcon sx={{ mr: 1, fontSize: 28 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>AWS Status</Typography>
                              </Box>
                              <Box sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                bgcolor: awsConnectionStatus.includes('✅') ? '#10b981' : '#ef4444',
                                boxShadow: awsConnectionStatus.includes('✅')
                                  ? '0 0 20px rgba(16, 185, 129, 0.6)'
                                  : '0 0 20px rgba(239, 68, 68, 0.6)',
                                animation: awsConnectionStatus.includes('✅')
                                  ? 'pulse-success 2s ease-in-out infinite'
                                  : 'pulse-error 2s ease-in-out infinite',
                              }} />

                            </Box>
                            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
                              {awsConnectionStatus}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.875rem' }}>
                              AWS Account Connection
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, md: 3 }}>
                        <Card sx={{
                          background: isDarkMode
                            ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)'
                            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          backdropFilter: 'blur(20px)',
                          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                          color: 'white',
                          height: '140px',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: isDarkMode
                              ? '0 25px 50px -12px rgba(236, 72, 153, 0.4)'
                              : '0 25px 50px -12px rgba(240, 147, 251, 0.4)',
                          },
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                          },
                          '&:hover::before': {
                            opacity: 1,
                          }
                        }}>
                          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                              <Box display="flex" alignItems="center">
                                <MoneyIcon sx={{ mr: 1, fontSize: 28 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Monthly Cost</Typography>
                              </Box>
                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}>
                                {analytics?.totalCost > 0 ? (
                                  <TrendingUpIcon sx={{ fontSize: 20, color: '#10b981' }} />
                                ) : (
                                  <TrendingDownIcon sx={{ fontSize: 20, color: '#6b7280' }} />
                                )}
                              </Box>
                            </Box>
                            <AnimatedCounter
                              value={analytics?.totalCost || 0}
                              prefix="$"
                              decimals={2}
                              variant="h4"
                              sx={{
                                mb: 1,
                                fontWeight: 700,
                                background: 'linear-gradient(45deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent',
                                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            />

                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.875rem' }}>
                              Current Month
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 12, md: 3 }}>
                        <Card sx={{
                          background: isDarkMode
                            ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.2) 100%)'
                            : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          backdropFilter: 'blur(20px)',
                          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                          color: 'white',
                          height: '140px',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: isDarkMode
                              ? '0 25px 50px -12px rgba(56, 189, 248, 0.4)'
                              : '0 25px 50px -12px rgba(79, 172, 254, 0.4)',
                          },
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                          },
                          '&:hover::before': {
                            opacity: 1,
                          }
                        }}>
                          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                              <Box display="flex" alignItems="center">
                                <CloudIcon sx={{ mr: 1, fontSize: 28 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>Active Services</Typography>
                              </Box>
                              <Box sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: '12px',
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(10px)',
                              }}>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                  {analytics?.serviceCount > 5 ? 'HIGH' : analytics?.serviceCount > 2 ? 'MED' : 'LOW'}
                                </Typography>
                              </Box>
                            </Box>
                            <AnimatedCounter
                              value={analytics?.serviceCount || 0}
                              decimals={0}
                              variant="h4"
                              sx={{ mb: 1, fontWeight: 700 }}
                            />

                            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.875rem' }}>
                              AWS Services
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Main Dashboard */}
                  <Grid container spacing={3}>
                    {/* Cost Breakdown Chart */}
                    <Grid size={{ xs: 12, lg: 8 }}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Cost Breakdown by Service
                          </Typography>
                          {analytics?.chartData ? (
                            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Pie data={analytics.chartData} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                animation: {
                                  animateRotate: true,
                                  animateScale: true,
                                  duration: 2000,
                                  easing: 'easeOutQuart'
                                },
                                plugins: {
                                  legend: {
                                    position: 'right' as const,
                                    labels: {
                                      usePointStyle: true,
                                      padding: 20,
                                      font: {
                                        size: 12,
                                        weight: 600
                                      }
                                    }
                                  },
                                  title: {
                                    display: true,
                                    text: '💰 AWS Cost Distribution',
                                    font: {
                                      size: 16,
                                      weight: 'bold'
                                    },
                                    padding: 20
                                  },
                                  tooltip: {
                                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                    titleColor: isDarkMode ? '#f1f5f9' : '#1a202c',
                                    bodyColor: isDarkMode ? '#f1f5f9' : '#1a202c',
                                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                                    borderWidth: 1,
                                    cornerRadius: 8,
                                    displayColors: true,
                                    callbacks: {
                                      label: function (context: any) {
                                        const percentage = ((context.parsed / analytics.totalCost) * 100).toFixed(1);
                                        return `${context.label}: $${context.parsed.toFixed(2)} (${percentage}%)`;
                                      }
                                    }
                                  }
                                },
                                elements: {
                                  arc: {
                                    borderWidth: 3,
                                    borderColor: isDarkMode ? '#0f172a' : '#ffffff',
                                    hoverBorderWidth: 4
                                  }
                                }
                              }} />
                            </Box>
                          ) : (
                            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography color="textSecondary">No cost data available</Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Cost Optimization Alerts */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            💡 Cost Optimization
                          </Typography>
                          {analytics?.optimizationSuggestions?.map((suggestion: any, index: number) => (
                            <Alert
                              key={index}
                              severity={suggestion.severity}
                              icon={suggestion.severity === 'warning' ? <WarningIcon /> : <TrendingDownIcon />}
                              sx={{ mb: 2 }}
                            >
                              <Typography variant="subtitle2" gutterBottom>
                                {suggestion.title}
                              </Typography>
                              <Typography variant="body2">
                                {suggestion.description}
                              </Typography>
                              <Typography variant="caption" sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}>
                                Potential Savings: {suggestion.potentialSavings}
                              </Typography>
                            </Alert>
                          ))}
                          {!analytics?.optimizationSuggestions?.length && (
                            <Typography color="textSecondary">
                              No optimization suggestions available. Load cost data to get AI-powered insights.
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Removed Cost Alerts - Use Anomaly Detection feature instead */}
                    {/* Removed AI Forecast - Use Business Forecasting feature instead */}

                    {/* Multi-Account Management - Only show if data exists */}
                    {multiAccounts.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>🏢 Multi-Account Overview</Typography>
                            <Grid container spacing={2}>
                              {multiAccounts.map((account: any, index: number) => (
                                <Grid size={{ xs: 12, md: 4 }} key={index}>
                                  <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                                    <Typography variant="subtitle1">{account.accountName}</Typography>
                                    <Typography variant="h6">${account.totalCost?.toFixed(2) || '0.00'}</Typography>
                                    <Typography variant="caption">{account.services?.length || 0} services</Typography>
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}

                    {/* Service Details */}
                    <Grid size={{ xs: 12 }}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Service Usage Details
                          </Typography>
                          {costData && costData.ResultsByTime?.length > 0 ? (
                            <Grid container spacing={2}>
                              {Array.from(new Map(
                                costData.ResultsByTime.flatMap((timePoint: any) =>
                                  timePoint.Groups?.map((group: any) => {
                                    // Check both cost types here too
                                    const costData = group.Metrics?.BlendedCost || group.Metrics?.UnblendedCost;
                                    if (!costData || !costData.Amount) {
                                      return null;
                                    }
                                    return [
                                      group.Keys[0],
                                      {
                                        service: group.Keys[0],
                                        cost: parseFloat(costData.Amount),
                                        unit: costData.Unit
                                      }
                                    ];
                                  }).filter(Boolean) || []
                                )
                              ).values())
                                .filter((item: any) => item.cost !== 0)
                                .sort((a: any, b: any) => Math.abs(b.cost) - Math.abs(a.cost))
                                .map((item: any, index: number) => (
                                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                                    <Paper sx={{
                                      p: 2,
                                      background: isDarkMode
                                        ? 'linear-gradient(135deg, rgba(100, 116, 139, 0.3) 0%, rgba(71, 85, 105, 0.3) 100%)'
                                        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                                      border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                                      transition: 'all 0.3s ease',
                                      '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 3
                                      }
                                    }}>
                                      <Typography
                                        variant="subtitle1"
                                        gutterBottom
                                        sx={{
                                          fontWeight: 600,
                                          color: isDarkMode ? '#e2e8f0' : '#1e293b',
                                          minHeight: '48px',
                                          display: 'flex',
                                          alignItems: 'center'
                                        }}
                                      >
                                        {item.service}
                                      </Typography>
                                      <Typography
                                        variant="h6"
                                        color="primary"
                                        sx={{
                                          fontWeight: 700,
                                          mb: 0.5,
                                          fontSize: '1.25rem'
                                        }}
                                      >
                                        ${Math.abs(item.cost).toFixed(6)}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: isDarkMode ? 'rgba(226, 232, 240, 0.7)' : 'text.secondary',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px'
                                        }}
                                      >
                                        {item.unit}
                                      </Typography>
                                    </Paper>
                                  </Grid>
                                ))}
                            </Grid>
                          ) : (
                            <Typography color="textSecondary">
                              No detailed service data available
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </>
              )}

              {currentView === 'resource-allocation' && (
                <ResourceCostAllocation />
              )}
              {currentView === 'anomalies' && (
                <AnomalyDetection />
              )}

              {currentView === 'reserved-instances' && (
                <ReservedInstanceDashboard />
              )}
              {currentView === 'compliance-governance' && (
                <ComplianceGovernance />
              )}
              {currentView === 'trends' && (
                <TrendAnalysis />
              )}
              {currentView === 'business-forecast' && (
                <BusinessForecasting />
              )}
              {currentView === 'lifecycle-management' && (
                <ResourceLifecycleManagement />
              )}
              {currentView === 'export-manager' && (
                <ExportManager />
              )}
              {currentView === 'webhook-manager' && (
                <WebhookManager />
              )}
              {currentView === 'data-lake-manager' && (
                <DataLakeManager />
              )}
            </>
          )}
        </Container>
      </Box>

      <AuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
      />
      <AwsSetupDialog
        open={showAwsSetupDialog}
        onClose={() => setShowAwsSetupDialog(false)}
        onSuccess={() => {
          console.log('✅ AWS setup completed successfully!');
          // Update AWS connection status immediately
          checkAwsConnection();
          setShowAwsSetupDialog(false);
        }}
      />

      {/* AWS Status Dialog for connected users */}
      <Dialog
        open={showAwsStatusDialog}
        onClose={() => setShowAwsStatusDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center'
        }}>
          <CheckIcon sx={{ mr: 1 }} />
          AWS Connection Status
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Your AWS account is successfully connected and operational!
          </Alert>
          <Box>
            <Typography variant="h6" gutterBottom>
              ✅ Connection Details
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Status:</strong> {awsConnectionStatus}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Backend:</strong> {backendStatus}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              You can now access all AWS cost tracking features including:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              <Typography component="li" variant="body2">Real-time cost monitoring</Typography>
              <Typography component="li" variant="body2">Resource allocation tracking</Typography>
              <Typography component="li" variant="body2">Anomaly detection</Typography>
              <Typography component="li" variant="body2">Reserved instance recommendations</Typography>
              <Typography component="li" variant="body2">Resource lifecycle management</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            onClick={() => setShowDisconnectConfirm(true)}
            variant="outlined"
            color="error"
            startIcon={<WarningIcon />}
          >
            Disconnect AWS
          </Button>
          <Button
            onClick={() => setShowAwsStatusDialog(false)}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              }
            }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* AWS Disconnect Confirmation Dialog */}
      <Dialog
        open={showDisconnectConfirm}
        onClose={() => !disconnecting && setShowDisconnectConfirm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center'
        }}>
          <WarningIcon sx={{ mr: 1 }} />
          Disconnect AWS Account?
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Are you sure you want to disconnect your AWS account?
            </Typography>
          </Alert>
          <Box>
            <Typography variant="body1" gutterBottom>
              This action will:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Remove your AWS credentials from the system
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Stop all cost monitoring and data collection
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Disable anomaly detection and forecasting
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Clear all AWS-related features
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2, fontStyle: 'italic' }}>
              You can reconnect anytime by setting up your AWS credentials again.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setShowDisconnectConfirm(false)}
            disabled={disconnecting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAwsDisconnect}
            variant="contained"
            color="error"
            disabled={disconnecting}
            startIcon={disconnecting ? <CircularProgress size={20} /> : <WarningIcon />}
          >
            {disconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Budget Alert Dialog */}
      <Dialog
        open={showBudgetAlertDialog}
        onClose={() => !creatingBudget && setShowBudgetAlertDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center'
        }}>
          <WarningIcon sx={{ mr: 1 }} />
          Set Budget Alert
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Create a budget alert to get notified when your AWS spending reaches a certain threshold.
          </Alert>

          <TextField
            fullWidth
            label="Budget Name"
            value={budgetAlertForm.name}
            onChange={(e) => setBudgetAlertForm({ ...budgetAlertForm, name: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="e.g., Monthly AWS Budget"
            required
          />

          <TextField
            fullWidth
            label="Budget Amount ($)"
            type="number"
            value={budgetAlertForm.amount}
            onChange={(e) => setBudgetAlertForm({ ...budgetAlertForm, amount: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="e.g., 1000"
            required
            helperText={analytics?.totalCost ? `Current spending: $${analytics.totalCost.toFixed(2)}` : ''}
          />

          <TextField
            fullWidth
            select
            label="Alert Threshold (%)"
            value={budgetAlertForm.threshold}
            onChange={(e) => setBudgetAlertForm({ ...budgetAlertForm, threshold: e.target.value })}
            sx={{ mb: 2 }}
            helperText="You'll be notified when spending reaches this percentage"
          >
            <MenuItem value="50">50% - Early Warning</MenuItem>
            <MenuItem value="75">75% - Moderate Warning</MenuItem>
            <MenuItem value="80">80% - Standard Alert</MenuItem>
            <MenuItem value="90">90% - Critical Alert</MenuItem>
            <MenuItem value="100">100% - Budget Exceeded</MenuItem>
          </TextField>

          <TextField
            fullWidth
            select
            label="Budget Period"
            value={budgetAlertForm.period}
            onChange={(e) => setBudgetAlertForm({ ...budgetAlertForm, period: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="quarterly">Quarterly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </TextField>

          {budgetAlertForm.amount && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Alert will trigger at:</strong> ${(parseFloat(budgetAlertForm.amount) * parseInt(budgetAlertForm.threshold) / 100).toFixed(2)}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setShowBudgetAlertDialog(false)}
            disabled={creatingBudget}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateBudgetAlert}
            variant="contained"
            disabled={creatingBudget || !budgetAlertForm.name || !budgetAlertForm.amount}
            startIcon={creatingBudget ? <CircularProgress size={20} /> : <CheckIcon />}
            sx={{
              background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              }
            }}
          >
            {creatingBudget ? 'Creating...' : 'Create Budget Alert'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/" element={<AppContent />} />
          </Routes>

          {/* AI Cost Assistant - Floating Chat (Outside main content) */}
          <AIAssistantDebug />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
