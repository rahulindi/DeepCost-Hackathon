import React, { useEffect, useState } from 'react';
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
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudDone as TestIcon,
  Schema as SchemaIcon,
  Upload as ExportIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface DataLakeConnection {
  id: string;
  name: string;
  type: 'snowflake' | 'databricks' | 'bigquery';
  host?: string;
  database?: string;
  schema?: string;
  warehouse?: string;
  projectId?: string;
  dataset?: string;
  created_at: string;
  updated_at: string;
  last_tested_at?: string;
  is_active: boolean;
}

interface SchemaItem {
  name: string;
  type: 'table' | 'view';
  rows?: number;
}

const DataLakeManager: React.FC = () => {
  const [connections, setConnections] = useState<DataLakeConnection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [schemaDialogOpen, setSchemaDialogOpen] = useState<boolean>(false);
  const [exportDialogOpen, setExportDialogOpen] = useState<boolean>(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<DataLakeConnection | null>(null);
  const [schemas, setSchemas] = useState<SchemaItem[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'snowflake' as DataLakeConnection['type'],
    host: '',
    database: '',
    schema: '',
    warehouse: '',
    projectId: '',
    dataset: '',
    is_active: true,
    credentials: '' // handled securely by backend
  });

  // Export form
  const [exportForm, setExportForm] = useState({
    connectionId: '',
    target: '', // table/view name or path
    exportType: 'cost_summary',
    format: 'parquet',
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const res = await fetch(`${API_URL}/api/datalake/connections`, { 
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to load connections';
      console.error('❌ Data lake connections loading error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setFormData({
      name: '', type: 'snowflake', host: '', database: '', schema: '', warehouse: '', projectId: '', dataset: '', is_active: true, credentials: ''
    });
    setSelectedConnection(null);
    setDialogOpen(true);
  };

  const openEdit = (conn: DataLakeConnection) => {
    setFormData({
      name: conn.name,
      type: conn.type,
      host: conn.host || '',
      database: conn.database || '',
      schema: conn.schema || '',
      warehouse: conn.warehouse || '',
      projectId: conn.projectId || '',
      dataset: conn.dataset || '',
      is_active: conn.is_active,
      credentials: ''
    });
    setSelectedConnection(conn);
    setDialogOpen(true);
  };

  const saveConnection = async () => {
    try {
      setError(null);
      const method = selectedConnection ? 'PUT' : 'POST';
      const url = selectedConnection 
        ? `${API_URL}/api/datalake/connections/${selectedConnection.id}` 
        : `${API_URL}/api/datalake/connections`;
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      setDialogOpen(false);
      setSelectedConnection(null);
      await loadConnections();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to save connection';
      console.error('❌ Data lake connection save error:', errorMessage);
      setError(errorMessage);
    }
  };

  const deleteConnection = async (id: string) => {
    if (!window.confirm('Delete this data lake connection?')) return;
    try {
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const res = await fetch(`${API_URL}/api/datalake/connections/${id}`, { 
        method: 'DELETE', 
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      await loadConnections();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to delete connection';
      console.error('❌ Data lake connection delete error:', errorMessage);
      setError(errorMessage);
    }
  };

  const testConnection = async (id: string) => {
    try {
      setTestingId(id);
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const res = await fetch(`${API_URL}/api/datalake/connections/${id}/test`, { 
        method: 'POST', 
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      alert('Connection successful');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      console.error('❌ Data lake connection test error:', errorMessage);
      alert(`Connection failed: ${errorMessage}`);
    } finally {
      setTestingId(null);
    }
  };

  const openSchemas = async (conn: DataLakeConnection) => {
    try {
      setSelectedConnection(conn);
      setSchemaDialogOpen(true);
      setSchemas([]);
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const res = await fetch(`${API_URL}/api/datalake/connections/${conn.id}/schemas`, { 
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setSchemas(data.schemas || []);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to fetch schemas';
      console.error('❌ Data lake schemas fetch error:', errorMessage);
      setError(errorMessage);
    }
  };

  const openExport = (conn: DataLakeConnection) => {
    setSelectedConnection(conn);
    setExportForm({ connectionId: conn.id, target: '', exportType: 'cost_summary', format: 'parquet' });
    setExportDialogOpen(true);
  };

  const triggerExport = async () => {
    try {
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const res = await fetch(`${API_URL}/api/datalake/exports`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(exportForm)
      });
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please ensure the backend is running on port 3001.');
      }
      
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      setExportDialogOpen(false);
      alert('Export started successfully');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to start export';
      console.error('❌ Data lake export error:', errorMessage);
      setError(errorMessage);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'snowflake':
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Account/Host" value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })} />
            <TextField label="Warehouse" value={formData.warehouse} onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })} />
            <TextField label="Database" value={formData.database} onChange={(e) => setFormData({ ...formData, database: e.target.value })} />
            <TextField label="Schema" value={formData.schema} onChange={(e) => setFormData({ ...formData, schema: e.target.value })} />
          </Box>
        );
      case 'databricks':
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Host" value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })} />
            <TextField label="Schema" value={formData.schema} onChange={(e) => setFormData({ ...formData, schema: e.target.value })} />
          </Box>
        );
      case 'bigquery':
        return (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Project ID" value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} />
            <TextField label="Dataset" value={formData.dataset} onChange={(e) => setFormData({ ...formData, dataset: e.target.value })} />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Data Lake Integrations</Typography>
        <Box>
          <IconButton onClick={loadConnections} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ ml: 1 }}>
            Add Connection
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {connections.map((conn) => (
                  <TableRow key={conn.id}>
                    <TableCell>
                      <Typography variant="body2">{conn.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{conn.host || conn.dataset || '-'}</Typography>
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{conn.type}</TableCell>
                    <TableCell>
                      <Chip label={conn.is_active ? 'Active' : 'Inactive'} color={conn.is_active ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell>{new Date(conn.updated_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Tooltip title="Test Connection">
                        <span>
                          <IconButton size="small" onClick={() => testConnection(conn.id)} disabled={testingId === conn.id}>
                            {testingId === conn.id ? <CircularProgress size={16} /> : <TestIcon />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="View Schemas">
                        <IconButton size="small" onClick={() => openSchemas(conn)}>
                          <SchemaIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Start Export">
                        <IconButton size="small" onClick={() => openExport(conn)}>
                          <ExportIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(conn)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => deleteConnection(conn.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {connections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No connections yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Create/Edit Connection Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedConnection ? 'Edit Connection' : 'Create Connection'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}>
                <MenuItem value="snowflake">Snowflake</MenuItem>
                <MenuItem value="databricks">Databricks</MenuItem>
                <MenuItem value="bigquery">BigQuery</MenuItem>
              </Select>
            </FormControl>

            {renderTypeSpecificFields()}

            <Divider />
            <TextField
              label="Credentials (JSON or Token)"
              value={formData.credentials}
              onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
              placeholder="Paste secure credentials (stored encrypted)"
              fullWidth
              multiline
              minRows={3}
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={formData.is_active ? 'active' : 'inactive'} onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveConnection} disabled={!formData.name}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Schemas Dialog */}
      <Dialog open={schemaDialogOpen} onClose={() => setSchemaDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Schemas for {selectedConnection?.name}</DialogTitle>
        <DialogContent>
          {schemas.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Rows</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schemas.map((s) => (
                    <TableRow key={s.name}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{s.type}</TableCell>
                      <TableCell>{s.rows ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSchemaDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Export to {selectedConnection?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Export Type</InputLabel>
              <Select value={exportForm.exportType} onChange={(e) => setExportForm({ ...exportForm, exportType: e.target.value })}>
                <MenuItem value="cost_summary">Cost Summary</MenuItem>
                <MenuItem value="resource_usage">Resource Usage</MenuItem>
                <MenuItem value="budget_analysis">Budget Analysis</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select value={exportForm.format} onChange={(e) => setExportForm({ ...exportForm, format: e.target.value })}>
                <MenuItem value="parquet">Parquet</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Target (table/path)" value={exportForm.target} onChange={(e) => setExportForm({ ...exportForm, target: e.target.value })} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={triggerExport} disabled={!exportForm.target}>Start Export</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataLakeManager;

