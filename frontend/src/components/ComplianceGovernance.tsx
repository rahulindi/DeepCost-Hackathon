import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  LocalOffer as TagIcon,
  AutoAwesome as AIIcon,
  AdminPanelSettings as AdminIcon,
  Policy as PolicyIcon,
  Assessment as ComplianceIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import axios from 'axios';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Interfaces
interface Policy {
  id?: number;
  type: 'budget_threshold' | 'tag_compliance';
  name: string;
  params: any;
  active?: boolean;
  priority?: number;
}

interface Analysis {
  totalTaggedResources: number;
  commonTags: Array<{ key: string; frequency: number; usage: string }>;
  suggestions: Array<{ type: string; tag: string; reason: string; priority: string; action: string }>;
  complianceScore: {
    overall: number;
    breakdown: { requiredTags: number; coverage: number; consistency: number };
    recommendations: string[];
  };
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
      id={`compliance-tabpanel-${index}`}
      aria-labelledby={`compliance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const defaultPolicy: Policy = {
  type: 'budget_threshold',
  name: '',
  params: { budget_amount: 50, period: 'monthly' },
  active: true,
  priority: 100
};

const ComplianceGovernance: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  
  // Governance Panel State
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [newPolicy, setNewPolicy] = useState<Policy>(defaultPolicy);
  const [message, setMessage] = useState<string | null>(null);
  const [enforcementResults, setEnforcementResults] = useState<any>(null);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  
  // Tagging Intelligence State
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagMessage, setTagMessage] = useState<string | null>(null);

  // Governance Functions
  const fetchPolicies = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/api/governance/policies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPolicies(res.data.policies || []);
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Failed to load policies');
    }
  };

  const createPolicy = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      await axios.post(`${API_URL}/api/governance/policies`, newPolicy, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Policy created');
      setNewPolicy(defaultPolicy);
      await fetchPolicies();
    } catch (e: any) {
      setMessage(`❌ ${e.response?.data?.error || e.message}`);
    } finally { 
      setLoading(false); 
    }
  };

  const updatePolicy = async (policyId: number, updates: Partial<Policy>) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      await axios.put(`${API_URL}/api/governance/policies/${policyId}`, updates, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Policy updated');
      setEditingPolicy(null);
      await fetchPolicies();
    } catch (e: any) {
      setMessage(`❌ ${e.response?.data?.error || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deletePolicy = async (policyId: number) => {
    if (!window.confirm('Delete this policy? This action cannot be undone.')) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_URL}/api/governance/policies/${policyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Policy deleted');
      await fetchPolicies();
    } catch (e: any) {
      setMessage(`❌ ${e.response?.data?.error || e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startEditPolicy = (policy: Policy) => {
    setEditingPolicy({ ...policy });
  };

  const cancelEdit = () => {
    setEditingPolicy(null);
  };

  const saveEdit = async () => {
    if (!editingPolicy || !editingPolicy.id) return;
    await updatePolicy(editingPolicy.id, {
      name: editingPolicy.name,
      params: editingPolicy.params,
      active: editingPolicy.active
    });
  };

  const enforceNow = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_URL}/api/governance/enforce`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEnforcementResults(res.data);
      setMessage(`✅ Enforcement complete. Enforced: ${res.data.enforcedCount} violations`);
    } catch (e: any) {
      setMessage(`❌ Enforcement failed: ${e.response?.data?.error || e.message}`);
    } finally { 
      setLoading(false); 
    }
  };

  // Tagging Intelligence Functions
  const fetchAnalysis = async () => {
    try {
      setTagLoading(true);
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/api/tagging/analysis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAnalysis(res.data.analysis);
      }
    } catch (e: any) {
      setTagMessage(`❌ ${e.response?.data?.error || e.message}`);
    } finally { 
      setTagLoading(false); 
    }
  };

  const fetchCompliance = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/api/tagging/compliance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setCompliance(res.data.compliance);
      }
    } catch (e: any) {
      console.error('Compliance fetch error:', e);
    }
  };

  const autoTagResources = async () => {
    try {
      setTagLoading(true);
      const token = localStorage.getItem('authToken');
      
      const tagRules = [
        { tagKey: 'Owner', tagValue: 'unassigned', service: null, region: null },
        { tagKey: 'Environment', tagValue: 'unknown', service: null, region: null },
        { tagKey: 'CostCenter', tagValue: 'general', service: null, region: null }
      ];
      
      const res = await axios.post(`${API_URL}/api/tagging/auto-tag`, 
        { tagRules }, 
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }}
      );
      
      if (res.data.success) {
        setTagMessage(`✅ Auto-tagged ${res.data.totalResourcesTagged} resources`);
        await fetchAnalysis();
        await fetchCompliance();
      }
    } catch (e: any) {
      setTagMessage(`❌ Auto-tagging failed: ${e.response?.data?.error || e.message}`);
    } finally { 
      setTagLoading(false); 
    }
  };

  // Initialize data
  useEffect(() => {
    fetchPolicies();
    fetchAnalysis();
    fetchCompliance();
  }, []);

  // Policy parameter fields
  const policyParamFields = () => {
    switch (newPolicy.type) {
      case 'budget_threshold':
        return (
          <>
            <TextField 
              fullWidth 
              label="Budget Amount ($)" 
              type="number" 
              sx={{ mt: 1 }}
              value={newPolicy.params?.budget_amount || ''}
              onChange={(e) => setNewPolicy({
                ...newPolicy, 
                params: { ...newPolicy.params, budget_amount: parseFloat(e.target.value || '0') }
              })} 
            />
            <TextField 
              fullWidth 
              label="Period" 
              select 
              sx={{ mt: 1 }}
              value={newPolicy.params?.period || 'monthly'}
              onChange={(e) => setNewPolicy({
                ...newPolicy, 
                params: { ...newPolicy.params, period: e.target.value }
              })}
            >
              <MenuItem value="daily">daily</MenuItem>
              <MenuItem value="monthly">monthly</MenuItem>
            </TextField>
            <TextField 
              fullWidth 
              label="Notify Webhook (optional)" 
              sx={{ mt: 1 }}
              value={newPolicy.params?.notify_webhook || ''}
              onChange={(e) => setNewPolicy({
                ...newPolicy, 
                params: { ...newPolicy.params, notify_webhook: e.target.value }
              })} 
            />
          </>
        );

      case 'tag_compliance':
        return (
          <>
            <TextField 
              fullWidth 
              label="Required Tags (JSON)" 
              sx={{ mt: 1 }}
              value={JSON.stringify(newPolicy.params?.requiredTags || { Owner: ".+", CostCenter: ".+" })}
              onChange={(e) => {
                try { 
                  const v = JSON.parse(e.target.value); 
                  setNewPolicy({
                    ...newPolicy, 
                    params: { ...newPolicy.params, requiredTags: v }
                  }); 
                } catch { /* ignore */ }
              }} 
            />
          </>
        );
      default: 
        return null;
    }
  };

  // Utility functions
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'info';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <SecurityIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4">🛡️ Compliance & Governance</Typography>
        {(loading || tagLoading) && <CircularProgress size={20} />}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
          <Chip label={`${policies.length} policies`} color="primary" variant="outlined" />
          {analysis && (
            <Chip 
              label={`${analysis.complianceScore.overall}% compliant`} 
              color={getScoreColor(analysis.complianceScore.overall) as any}
            />
          )}
        </Box>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Policy Management" icon={<PolicyIcon />} />
          <Tab label="Tagging Intelligence" icon={<TagIcon />} />
          <Tab label="Compliance Overview" icon={<ComplianceIcon />} />
        </Tabs>
      </Box>

      {/* Policy Management Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr'
            },
            gap: 3
          }}
        >
          {message && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Alert severity={message.startsWith('✅') ? 'success' : 'error'}>
                {message}
              </Alert>
            </Box>
          )}
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Create New Policy</Typography>
              <TextField 
                fullWidth 
                label="Policy Name" 
                sx={{ mb: 2 }} 
                value={newPolicy.name}
                onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })} 
              />
              <TextField 
                fullWidth 
                label="Type" 
                select 
                value={newPolicy.type}
                onChange={(e) => setNewPolicy({ 
                  ...newPolicy, 
                  type: e.target.value as Policy['type'] 
                })}
                sx={{ mb: 2 }}
              >
                <MenuItem value="budget_threshold">Budget Threshold</MenuItem>
                <MenuItem value="tag_compliance">Tag Compliance</MenuItem>
              </TextField>
              {policyParamFields()}
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={createPolicy} 
                  disabled={loading || !newPolicy.name}
                >
                  Save Policy
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary"
                  onClick={enforceNow}
                  disabled={loading}
                >
                  Enforce All
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Active Policies</Typography>
              {policies.length === 0 && (
                <Typography color="text.secondary">No policies yet</Typography>
              )}
              {policies.map((p, idx) => {
                const isEditing = editingPolicy?.id === p.id;
                
                return (
                  <Paper 
                    key={idx} 
                    elevation={0}
                    sx={{ 
                      mb: 1.5, 
                      border: '1px solid',
                      borderColor: isEditing ? 'primary.main' : 'divider',
                      borderLeft: '4px solid',
                      borderLeftColor: isEditing ? 'primary.main' : (p.active ? 'success.main' : 'grey.400'),
                      overflow: 'hidden',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Box sx={{ p: 2 }}>
                      {isEditing ? (
                        // Edit Mode
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="subtitle2" color="primary" fontWeight="600">
                              ✏️ Editing Policy
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button 
                                size="small" 
                                variant="contained" 
                                onClick={saveEdit}
                                disabled={loading}
                              >
                                Save
                              </Button>
                              <Button 
                                size="small" 
                                variant="outlined" 
                                onClick={cancelEdit}
                              >
                                Cancel
                              </Button>
                            </Box>
                          </Box>
                          
                          <TextField 
                            fullWidth 
                            label="Policy Name" 
                            value={editingPolicy?.name || ''}
                            onChange={(e) => editingPolicy && setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                            sx={{ mb: 2 }}
                            size="small"
                          />
                          
                          <TextField 
                            fullWidth 
                            label="Active Status" 
                            select 
                            value={editingPolicy?.active ? 'true' : 'false'}
                            onChange={(e) => editingPolicy && setEditingPolicy({ ...editingPolicy, active: e.target.value === 'true' })}
                            sx={{ mb: 2 }}
                            size="small"
                          >
                            <MenuItem value="true">Active</MenuItem>
                            <MenuItem value="false">Inactive</MenuItem>
                          </TextField>
                          
                          {editingPolicy?.type === 'budget_threshold' && (
                            <>
                              <TextField 
                                fullWidth 
                                label="Budget Amount ($)" 
                                type="number" 
                                value={editingPolicy?.params?.budget_amount || ''}
                                onChange={(e) => editingPolicy && setEditingPolicy({
                                  ...editingPolicy, 
                                  params: { ...editingPolicy.params, budget_amount: parseFloat(e.target.value || '0') }
                                })}
                                sx={{ mb: 2 }}
                                size="small"
                              />
                              <TextField 
                                fullWidth 
                                label="Period" 
                                select 
                                value={editingPolicy?.params?.period || 'monthly'}
                                onChange={(e) => editingPolicy && setEditingPolicy({
                                  ...editingPolicy, 
                                  params: { ...editingPolicy.params, period: e.target.value }
                                })}
                                sx={{ mb: 2 }}
                                size="small"
                              >
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                              </TextField>
                            </>
                          )}
                          
                          {editingPolicy?.type === 'tag_compliance' && (
                            <TextField 
                              fullWidth 
                              label="Required Tags (JSON)" 
                              value={JSON.stringify(editingPolicy?.params?.requiredTags || {})}
                              onChange={(e) => {
                                try { 
                                  const v = JSON.parse(e.target.value); 
                                  editingPolicy && setEditingPolicy({
                                    ...editingPolicy, 
                                    params: { ...editingPolicy.params, requiredTags: v }
                                  }); 
                                } catch { /* ignore */ }
                              }}
                              sx={{ mb: 2 }}
                              size="small"
                              multiline
                              rows={3}
                            />
                          )}
                        </Box>
                      ) : (
                        // View Mode
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight="600">{p.name}</Typography>
                              <Chip 
                                label={p.type.replace(/_/g, ' ').toUpperCase()} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                              />
                              <Chip 
                                label={p.active ? 'Active' : 'Inactive'} 
                                size="small" 
                                color={p.active ? 'success' : 'default'}
                                sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Edit policy">
                                <IconButton 
                                  size="small" 
                                  onClick={() => startEditPolicy(p)}
                                  color="primary"
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete policy">
                                <IconButton 
                                  size="small" 
                                  onClick={() => deletePolicy(p.id!)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                          
                          <Accordion 
                            elevation={0}
                            sx={{ 
                              bgcolor: 'grey.50',
                              '&:before': { display: 'none' }
                            }}
                          >
                            <AccordionSummary 
                              expandIcon={<ExpandMoreIcon />}
                              sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                            >
                              <Typography variant="caption" color="text.secondary">
                                View Parameters
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                              <Typography 
                                variant="body2" 
                                component="pre" 
                                sx={{ 
                                  fontFamily: 'monospace',
                                  fontSize: '0.75rem',
                                  whiteSpace: 'pre-wrap',
                                  color: 'text.secondary'
                                }}
                              >
                                {JSON.stringify(p.params, null, 2)}
                              </Typography>
                            </AccordionDetails>
                          </Accordion>
                        </>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </CardContent>
          </Card>
        </Box>

        {/* Enforcement Results - Enterprise Grade UI */}
        {enforcementResults && (
          <Box sx={{ mt: 3 }}>
            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  height: '100%'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <SecurityIcon />
                      <Typography variant="overline">Policies Evaluated</Typography>
                    </Box>
                    <Typography variant="h3" fontWeight="bold">
                      {enforcementResults.results.length}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                      Total active policies checked
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ 
                  background: enforcementResults.enforcedCount > 0 
                    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                    : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  height: '100%'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <WarningIcon />
                      <Typography variant="overline">Violations</Typography>
                    </Box>
                    <Typography variant="h3" fontWeight="bold">
                      {enforcementResults.enforcedCount}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                      {enforcementResults.enforcedCount > 0 ? 'Requires attention' : 'All policies compliant'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  color: '#333',
                  height: '100%'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CheckCircleIcon />
                      <Typography variant="overline">Compliance Rate</Typography>
                    </Box>
                    <Typography variant="h3" fontWeight="bold">
                      {Math.round(((enforcementResults.results.length - enforcementResults.enforcedCount) / enforcementResults.results.length) * 100)}%
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {enforcementResults.results.length - enforcementResults.enforcedCount} of {enforcementResults.results.length} passing
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Detailed Results */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">
                    Policy Enforcement Details
                  </Typography>
                  <Chip 
                    label={`Last checked: ${new Date().toLocaleTimeString()}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {enforcementResults.results.map((result: any, idx: number) => {
                    const policy = policies.find(p => p.id === result.policyId);
                    const isViolation = result.enforced;
                    
                    return (
                      <Paper 
                        key={idx} 
                        elevation={0}
                        sx={{ 
                          border: '1px solid',
                          borderColor: isViolation ? 'error.main' : 'success.main',
                          borderLeft: '4px solid',
                          borderLeftColor: isViolation ? 'error.main' : 'success.main',
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'translateY(-2px)'
                          }
                        }}
                      >
                        <Box sx={{ p: 2.5 }}>
                          {/* Header */}
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                {isViolation ? (
                                  <WarningIcon sx={{ color: 'error.main', fontSize: 24 }} />
                                ) : (
                                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />
                                )}
                                <Typography variant="h6" fontWeight="600">
                                  {policy?.name || `Policy ${result.policyId}`}
                                </Typography>
                              </Box>
                              
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip 
                                  label={result.type.replace(/_/g, ' ').toUpperCase()} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                />
                                <Chip 
                                  label={isViolation ? 'NON-COMPLIANT' : 'COMPLIANT'} 
                                  size="small"
                                  sx={{ 
                                    bgcolor: isViolation ? 'error.main' : 'success.main',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '0.7rem'
                                  }}
                                />
                              </Box>
                            </Box>
                          </Box>

                          {/* Details Section */}
                          {result.details && (
                            <Box sx={{ 
                              mt: 2, 
                              p: 2, 
                              bgcolor: isViolation ? 'error.lighter' : 'success.lighter',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: isViolation ? 'error.light' : 'success.light'
                            }}>
                              {/* Budget Threshold Details */}
                              {result.type === 'budget_threshold' && result.details.total !== undefined && (
                                <Box>
                                  <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                                    Budget Analysis
                                  </Typography>
                                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                                    <Grid size={{ xs: 6 }}>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Current Spend
                                      </Typography>
                                      <Typography variant="h6" fontWeight="bold" color={isViolation ? 'error.main' : 'success.main'}>
                                        ${parseFloat(result.details.total).toFixed(2)}
                                      </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Budget Limit
                                      </Typography>
                                      <Typography variant="h6" fontWeight="bold">
                                        ${parseFloat(result.details.budget_amount).toFixed(2)}
                                      </Typography>
                                    </Grid>
                                    {isViolation && (
                                      <Grid size={{ xs: 12 }}>
                                        <Alert severity="error" sx={{ mt: 1 }}>
                                          <Typography variant="body2" fontWeight="600">
                                            Overspend: ${(parseFloat(result.details.total) - parseFloat(result.details.budget_amount)).toFixed(2)}
                                          </Typography>
                                          <Typography variant="caption">
                                            You've exceeded your budget by {Math.round(((parseFloat(result.details.total) / parseFloat(result.details.budget_amount)) - 1) * 100)}%
                                          </Typography>
                                        </Alert>
                                      </Grid>
                                    )}
                                  </Grid>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={Math.min((parseFloat(result.details.total) / parseFloat(result.details.budget_amount)) * 100, 100)}
                                    sx={{ 
                                      mt: 2, 
                                      height: 8, 
                                      borderRadius: 4,
                                      bgcolor: 'grey.200',
                                      '& .MuiLinearProgress-bar': {
                                        bgcolor: isViolation ? 'error.main' : 'success.main'
                                      }
                                    }}
                                  />
                                </Box>
                              )}

                              {/* Tag Compliance Details */}
                              {result.type === 'tag_compliance' && result.details.totalOffenders !== undefined && (
                                <Box>
                                  <Typography variant="subtitle2" fontWeight="600" gutterBottom>
                                    Tag Compliance Status
                                  </Typography>
                                  
                                  {/* Summary Stats */}
                                  <Grid container spacing={2} sx={{ mt: 0.5, mb: 2 }}>
                                    <Grid size={{ xs: 6 }}>
                                      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="h4" fontWeight="bold" color={isViolation ? 'error.main' : 'success.main'}>
                                          {result.details.totalOffenders}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          Non-compliant resources
                                        </Typography>
                                      </Box>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="h4" fontWeight="bold" color="primary.main">
                                          {result.details.groupedResources?.length || 0}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          Service/Region groups
                                        </Typography>
                                      </Box>
                                    </Grid>
                                  </Grid>

                                  {/* Required Tags */}
                                  {result.details.requiredTags && (
                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                        Required Tags:
                                      </Typography>
                                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {result.details.requiredTags.map((tag: string) => (
                                          <Chip 
                                            key={tag}
                                            label={tag} 
                                            size="small" 
                                            color="primary"
                                            variant="outlined"
                                            sx={{ fontSize: '0.7rem' }}
                                          />
                                        ))}
                                      </Box>
                                    </Box>
                                  )}

                                  {/* Expandable Resource List */}
                                  {result.details.groupedResources && result.details.groupedResources.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                      <Alert severity="warning" sx={{ mb: 2 }}>
                                        <Typography variant="body2" fontWeight="600">
                                          {result.details.totalOffenders} resource(s) missing required tags
                                        </Typography>
                                        <Typography variant="caption">
                                          Click below to view detailed breakdown by service and region
                                        </Typography>
                                      </Alert>

                                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom sx={{ mb: 1 }}>
                                        Non-Compliant Resources by Service:
                                      </Typography>

                                      {result.details.groupedResources.map((group: any, groupIdx: number) => (
                                        <Paper 
                                          key={groupIdx}
                                          elevation={0}
                                          sx={{ 
                                            mb: 1.5,
                                            p: 2,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderLeft: '3px solid',
                                            borderLeftColor: 'warning.main',
                                            '&:hover': { bgcolor: 'action.hover' }
                                          }}
                                        >
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                            <Box sx={{ flex: 1 }}>
                                              <Typography variant="body1" fontWeight="600">
                                                {group.service}
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary" display="block">
                                                Region: {group.region}
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                Period: {new Date(group.dateRange.earliest).toLocaleDateString()} - {new Date(group.dateRange.latest).toLocaleDateString()}
                                              </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                              <Chip 
                                                label={`$${group.totalCost.toFixed(2)}`}
                                                size="small"
                                                color="warning"
                                                sx={{ fontWeight: 600, mb: 0.5 }}
                                              />
                                              <Typography variant="caption" color="text.secondary" display="block">
                                                {group.recordCount} billing records
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Paper>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              )}

                              {/* Generic Details Fallback */}
                              {result.type !== 'budget_threshold' && result.type !== 'tag_compliance' && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                    Policy Details
                                  </Typography>
                                  <Typography variant="body2" component="pre" sx={{ 
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                    bgcolor: 'background.paper',
                                    p: 1,
                                    borderRadius: 1
                                  }}>
                                    {JSON.stringify(result.details, null, 2)}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </TabPanel>

      {/* Tagging Intelligence Tab */}
      <TabPanel value={tabValue} index={1}>
        {tagMessage && (
          <Alert sx={{ mb: 3 }} severity={tagMessage.startsWith('✅') ? 'success' : 'error'}>
            {tagMessage}
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(3, 1fr)'
            },
            gap: 3
          }}
        >
          {/* Compliance Score Card */}
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">📊 Compliance Score</Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={autoTagResources} 
                  startIcon={<AIIcon />}
                  sx={{ color: 'white', borderColor: 'white' }}
                  disabled={tagLoading}
                >
                  Auto-Tag
                </Button>
              </Box>
              {analysis && (
                <>
                  <Typography variant="h2" sx={{ mb: 2 }}>
                    {analysis.complianceScore.overall}%
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Required Tags: {analysis.complianceScore.breakdown.requiredTags}%</Typography>
                    <LinearProgress variant="determinate" value={analysis.complianceScore.breakdown.requiredTags} sx={{ mb: 1 }} />
                    
                    <Typography variant="body2">Coverage: {analysis.complianceScore.breakdown.coverage}%</Typography>
                    <LinearProgress variant="determinate" value={analysis.complianceScore.breakdown.coverage} sx={{ mb: 1 }} />
                    
                    <Typography variant="body2">Consistency: {analysis.complianceScore.breakdown.consistency}%</Typography>
                    <LinearProgress variant="determinate" value={analysis.complianceScore.breakdown.consistency} />
                  </Box>
                  <Chip 
                    label={`${analysis.totalTaggedResources} tagged resources`} 
                    color="secondary" 
                    variant="outlined" 
                    sx={{ color: 'white', borderColor: 'white' }} 
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Common Tags */}
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>🔖 Most Used Tags</Typography>
              {analysis?.commonTags ? (
                <List dense>
                  {analysis.commonTags.slice(0, 8).map((tag, idx) => (
                    <ListItem key={idx} sx={{ px: 0 }}>
                      <ListItemText 
                        primary={tag.key}
                        secondary={`${tag.usage} usage (${tag.frequency} resources)`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">Loading tag analysis...</Typography>
              )}
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>🤖 AI Suggestions</Typography>
              {analysis?.suggestions ? (
                <List dense>
                  {analysis.suggestions.slice(0, 5).map((suggestion, idx) => (
                    <ListItem key={idx} sx={{ px: 0, alignItems: 'flex-start' }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip 
                              label={suggestion.priority} 
                              size="small" 
                              color={getPriorityColor(suggestion.priority) as any}
                            />
                            <Typography variant="subtitle2">{suggestion.tag}</Typography>
                          </Box>
                        }
                        secondary={suggestion.reason}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">Analyzing patterns...</Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      {/* Compliance Overview Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Compliance by Service */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>📋 Compliance by Service</Typography>
              {compliance ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)'
                    },
                    gap: 2
                  }}
                >
                  {compliance.slice(0, 12).map((item: any, idx: number) => (
                    <Paper key={idx} sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {item.service} ({item.region})
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2">Compliance Rate</Typography>
                        <Chip 
                          label={item.complianceRate} 
                          size="small" 
                          color={parseFloat(item.complianceRate) >= 70 ? 'success' : 'warning'}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {item.taggedResources}/{item.totalResources} resources tagged
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption">
                          Owner: {item.tagBreakdown.Owner} | 
                          CostCenter: {item.tagBreakdown.CostCenter} | 
                          Environment: {item.tagBreakdown.Environment}
                        </Typography>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">Loading compliance data...</Typography>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          {analysis?.complianceScore.recommendations && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>💡 Recommendations</Typography>
                <List>
                  {analysis.complianceScore.recommendations.map((rec, idx) => (
                    <ListItem key={idx}>
                      <ListItemText primary={rec} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      </TabPanel>
    </Box>
  );
};

export default ComplianceGovernance;
