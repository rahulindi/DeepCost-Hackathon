import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  History as HistoryIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface WebhookSubscription {
  id: string;
  url: string;
  event_types: string[];
  is_active: boolean;
  created_at: string;
  last_delivery?: string;
  delivery_count: number;
  failure_count: number;
}

interface DeliveryHistory {
  id: string;
  webhook_id: string;
  event_type: string;
  status: 'success' | 'failed' | 'pending';
  response_code?: number;
  error_message?: string;
  delivered_at: string;
  payload_size: number;
}

const EVENT_TYPES = [
  'cost.threshold.exceeded',
  'cost.forecast.updated',
  'budget.alert',
  'export.completed',
  'export.failed',
  'governance.violation',
  'rightsizing.opportunity',
  'orphan.detected'
];

const WebhookManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<WebhookSubscription | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    url: '',
    event_types: [] as string[],
    is_active: true
  });

  useEffect(() => {
    loadSubscriptions();
    if (activeTab === 1) {
      loadDeliveryHistory();
    }
  }, [activeTab]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(`${API_URL}/api/webhooks/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load webhooks';
      console.error('❌ Webhook loading error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryHistory = async () => {
    try {
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(`${API_URL}/api/webhooks/delivery-history`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDeliveryHistory(data.deliveries || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load delivery history';
      console.error('❌ Delivery history loading error:', errorMessage);
      setError(errorMessage);
    }
  };

  const handleSaveSubscription = async () => {
    try {
      setError(null);
      const url = editingSubscription 
        ? `${API_URL}/api/webhooks/subscriptions/${editingSubscription.id}`
        : `${API_URL}/api/webhooks/subscriptions`;
      
      const method = editingSubscription ? 'PUT' : 'POST';
      
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      setDialogOpen(false);
      setEditingSubscription(null);
      setFormData({ url: '', event_types: [], is_active: true });
      loadSubscriptions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save webhook';
      console.error('❌ Webhook save error:', errorMessage);
      setError(errorMessage);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this webhook subscription?')) {
      return;
    }

    try {
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(`${API_URL}/api/webhooks/subscriptions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      loadSubscriptions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete webhook';
      console.error('❌ Webhook delete error:', errorMessage);
      setError(errorMessage);
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      setTestingWebhook(id);
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await fetch(`${API_URL}/api/webhooks/test/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      alert(`Test ${result.success ? 'successful' : 'failed'}: ${result.message}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Webhook test error:', errorMessage);
      alert(`Test failed: ${errorMessage}`);
    } finally {
      setTestingWebhook(null);
    }
  };

  const openCreateDialog = () => {
    setFormData({ url: '', event_types: [], is_active: true });
    setEditingSubscription(null);
    setDialogOpen(true);
  };

  const openEditDialog = (subscription: WebhookSubscription) => {
    setFormData({
      url: subscription.url,
      event_types: subscription.event_types,
      is_active: subscription.is_active
    });
    setEditingSubscription(subscription);
    setDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  if (loading && subscriptions.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Webhook Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Add Webhook
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Subscriptions" />
          <Tab label="Delivery History" />
        </Tabs>

        {activeTab === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>URL</TableCell>
                  <TableCell>Event Types</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Deliveries</TableCell>
                  <TableCell>Last Delivery</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {subscription.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {subscription.event_types.map((eventType) => (
                          <Chip
                            key={eventType}
                            label={eventType}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={subscription.is_active ? 'Active' : 'Inactive'}
                        color={subscription.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {subscription.delivery_count}
                        {subscription.failure_count > 0 && (
                          <Typography component="span" color="error" sx={{ ml: 1 }}>
                            ({subscription.failure_count} failed)
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {subscription.last_delivery ? formatDate(subscription.last_delivery) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Test Webhook">
                        <IconButton
                          size="small"
                          onClick={() => handleTestWebhook(subscription.id)}
                          disabled={testingWebhook === subscription.id}
                        >
                          {testingWebhook === subscription.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <TestIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(subscription)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteSubscription(subscription.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {activeTab === 1 && (
          <List>
            {deliveryHistory.map((delivery) => (
              <ListItem key={delivery.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {delivery.event_type}
                      </Typography>
                      <Chip
                        label={delivery.status}
                        color={getStatusColor(delivery.status)}
                        size="small"
                        icon={delivery.status === 'success' ? <SuccessIcon /> : <ErrorIcon />}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {formatDate(delivery.delivered_at)}
                      </Typography>
                      {delivery.response_code && (
                        <Typography variant="body2" color="textSecondary">
                          HTTP {delivery.response_code} • {delivery.payload_size} bytes
                        </Typography>
                      )}
                      {delivery.error_message && (
                        <Typography variant="body2" color="error">
                          {delivery.error_message}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSubscription ? 'Edit Webhook' : 'Create Webhook'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              label="Webhook URL"
              fullWidth
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://your-app.com/webhooks/aws-cost-tracker"
            />
            
            <FormControl fullWidth>
              <InputLabel>Event Types</InputLabel>
              <Select
                multiple
                value={formData.event_types}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  event_types: typeof e.target.value === 'string' ? [e.target.value] : e.target.value 
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {EVENT_TYPES.map((eventType) => (
                  <MenuItem key={eventType} value={eventType}>
                    {eventType}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveSubscription}
            disabled={!formData.url || formData.event_types.length === 0}
          >
            {editingSubscription ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebhookManager;
