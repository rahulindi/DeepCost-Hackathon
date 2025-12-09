import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Button, Chip, Alert, CircularProgress, LinearProgress, List, ListItem, ListItemText, Paper } from '@mui/material';
import { AutoAwesome as AIIcon, LocalOffer as TagIcon } from '@mui/icons-material';
import axios from 'axios';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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

const TaggingIntelligence: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/api/tagging/analysis`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAnalysis(res.data.analysis);
      }
    } catch (e: any) {
      setMessage(`❌ ${e.response?.data?.error || e.message}`);
    } finally { setLoading(false); }
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
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      // Apply common enterprise tags to untagged resources
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
        setMessage(`✅ Auto-tagged ${res.data.totalResourcesTagged} resources`);
        await fetchAnalysis();
        await fetchCompliance();
      }
    } catch (e: any) {
      setMessage(`❌ Auto-tagging failed: ${e.response?.data?.error || e.message}`);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAnalysis();
    fetchCompliance();
  }, []);

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
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
          <TagIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5">🏷️ Tagging Intelligence & Compliance</Typography>
          {loading && <CircularProgress size={20} />}
          <Box sx={{ ml: 'auto' }}>
            <Button variant="contained" onClick={autoTagResources} startIcon={<AIIcon />}>
              Auto-Tag Resources
            </Button>
          </Box>
        </Box>

        {message && (
          <Alert sx={{ mb: 2 }} severity={message.startsWith('✅') ? 'success' : 'error'}>
            {message}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {/* Compliance Score Card */}
          <Box>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>📊 Compliance Score</Typography>
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
          </Box>

          {/* Common Tags */}
          <Box>
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
          </Box>

          {/* AI Suggestions */}
          <Box>
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
        </Box>

        {/* Compliance by Service */}
        <Box sx={{ mt: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>📋 Compliance by Service</Typography>
              {compliance ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                  {compliance.slice(0, 12).map((item: any, idx: number) => (
                    <Box key={idx}>
                      <Paper sx={{ p: 2 }}>
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
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">Loading compliance data...</Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Recommendations */}
        {analysis?.complianceScore.recommendations && (
          <Box sx={{ mt: 3 }}>
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
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TaggingIntelligence;
