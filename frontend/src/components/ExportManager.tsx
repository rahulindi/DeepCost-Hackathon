import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Checkbox
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Download as DownloadIcon, Delete as DeleteIcon } from '@mui/icons-material';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface ExportJob {
  id: string;
  type: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
  downloadUrl?: string;
}

const ExportManager: React.FC = () => {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    type: 'cost_summary',
    format: 'csv',
    filters: {}
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Fetching export jobs...');
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/export/jobs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📊 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Jobs data:', data);
        const normalized = (data.jobs || []).map((j: any) => {
          const downloadPath = j.links?.download || j.downloadUrl || `/api/export/jobs/${j.id}/download`;
          return {
            id: j.id,
            type: j.type || 'custom_report',
            format: (j.format || j.output?.format || 'csv').toUpperCase(),
            status: j.status,
            createdAt: j.created_at || j.createdAt || j.created || new Date().toISOString(),
            completedAt: j.completed_at || j.completedAt,
            error: j.error,
            downloadUrl: downloadPath.startsWith('http') ? downloadPath : `${API_URL}${downloadPath}`
          };
        });
        setJobs(normalized);
      } else {
        const text = await response.text();
        console.error('❌ Fetch jobs error:', response.status, text);
        setError(`Failed to fetch export jobs (${response.status})`);
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const createJob = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const payload = {
        type: newJob.type,
        schedule: { type: 'one-time' },
        filters: newJob.filters,
        output: { format: newJob.format, delivery: { type: 'download' } }
      };
      console.log('📊 Creating job with payload:', payload);
      
      const response = await fetch(`${API_URL}/api/export/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Job created:', result);
        setCreateDialogOpen(false);
        setNewJob({ type: 'cost_summary', format: 'csv', filters: {} });
        fetchJobs();
      } else {
        const text = await response.text();
        console.error('❌ Create job error:', response.status, text);
        setError(`Failed to create export job (${response.status})`);
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const downloadJob = async (job: ExportJob) => {
    try {
      const token = localStorage.getItem('authToken');
      const urlPath = job.downloadUrl || `${API_URL}/api/export/jobs/${job.id}/download`;
      console.log(`📥 Downloading from: ${urlPath}`);
      
      const response = await fetch(urlPath, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.text();
        console.log('✅ Data received:', data.substring(0, 100) + '...');
        
        // Determine MIME type based on format
        const mimeTypes: { [key: string]: string } = {
          'CSV': 'text/csv',
          'JSON': 'application/json',
          'XLSX': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
        
        const mimeType = mimeTypes[job.format.toUpperCase()] || 'text/csv';
        
        // Create blob with proper MIME type
        const blob = new Blob([data], { type: `${mimeType};charset=utf-8` });
        const url = window.URL.createObjectURL(blob);
        
        // Create filename with type and timestamp
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `${job.type}_${timestamp}.${job.format.toLowerCase()}`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
        
        console.log(`✅ Download successful: ${filename}`);
      } else {
        const text = await response.text();
        console.error('❌ Download error:', response.status, text);
        setError(`Failed to download (${response.status})`);
      }
    } catch (err) {
      setError('Error downloading file');
    }
  };

  const toggleSelectJob = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map(job => job.id)));
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this export job?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/export/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('✅ Job deleted successfully');
        setSelectedJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
        fetchJobs(); // Refresh the list
      } else {
        const text = await response.text();
        console.error('❌ Delete error:', response.status, text);
        setError(`Failed to delete job (${response.status})`);
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const deleteSelectedJobs = async () => {
    if (selectedJobs.size === 0) {
      setError('No jobs selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedJobs.size} export job(s)?`)) {
      return;
    }

    setDeleting(true);
    const token = localStorage.getItem('authToken');
    let successCount = 0;
    let failCount = 0;

    for (const jobId of Array.from(selectedJobs)) {
      try {
        const response = await fetch(`${API_URL}/api/export/jobs/${jobId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setDeleting(false);
    setSelectedJobs(new Set());
    
    if (failCount === 0) {
      console.log(`✅ Successfully deleted ${successCount} job(s)`);
    } else {
      setError(`Deleted ${successCount} job(s), failed to delete ${failCount} job(s)`);
    }
    
    fetchJobs(); // Refresh the list
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'warning';
      default: return 'default';
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Export Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {selectedJobs.size > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={deleteSelectedJobs}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : `Delete Selected (${selectedJobs.size})`}
            </Button>
          )}
          <IconButton onClick={fetchJobs} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{ ml: 1 }}
          >
            New Export
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Export Jobs
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={jobs.length > 0 && selectedJobs.size === jobs.length}
                        indeterminate={selectedJobs.size > 0 && selectedJobs.size < jobs.length}
                        onChange={toggleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Format</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Completed</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow 
                      key={job.id}
                      selected={selectedJobs.has(job.id)}
                      hover
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedJobs.has(job.id)}
                          onChange={() => toggleSelectJob(job.id)}
                        />
                      </TableCell>
                      <TableCell>{job.type}</TableCell>
                      <TableCell>{job.format.toUpperCase()}</TableCell>
                      <TableCell>
                        <Chip
                          label={job.status}
                          color={getStatusColor(job.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(job.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {job.status === 'completed' && (
                            <IconButton
                              onClick={() => downloadJob(job)}
                              size="small"
                              color="primary"
                              title="Download"
                            >
                              <DownloadIcon />
                            </IconButton>
                          )}
                          <IconButton
                            onClick={() => deleteJob(job.id)}
                            size="small"
                            color="error"
                            title="Delete"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {jobs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No export jobs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Export Job</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="export-type-label">Export Type</InputLabel>
              <Select
                labelId="export-type-label"
                label="Export Type"
                value={newJob.type}
                onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
              >
                <MenuItem value="cost_summary">Cost Summary</MenuItem>
                <MenuItem value="resource_usage">Resource Usage</MenuItem>
                <MenuItem value="budget_analysis">Budget Analysis</MenuItem>
                <MenuItem value="custom_report">Custom Report</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth variant="outlined">
              <InputLabel id="format-label">Format</InputLabel>
              <Select
                labelId="format-label"
                label="Format"
                value={newJob.format}
                onChange={(e) => setNewJob({ ...newJob, format: e.target.value })}
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="xlsx">Excel</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateDialogOpen(false)} color="secondary">
            CANCEL
          </Button>
          <Button onClick={createJob} variant="contained" color="primary">
            CREATE JOB
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExportManager;
