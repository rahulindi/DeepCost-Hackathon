import React, { useEffect, useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Button, Chip, Alert, CircularProgress, 
  Paper, TextField, MenuItem, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Grid, LinearProgress, Divider, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { 
  TrendingUp as ForecastIcon, Business as BusinessIcon, Assessment as ScenarioIcon,
  ExpandMore as ExpandMoreIcon, Timeline as TimelineIcon, TrendingDown,
  Analytics as AnalyticsIcon, Insights as InsightsIcon, Speed as SpeedIcon
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import axios from 'axios';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface BusinessForecast {
  periods: Array<{
    period: number;
    date: string;
    cost: number;
    businessAdjustedCost: number;
    confidenceLevel: number;
    revenueProjection: number;
  }>;
  businessMetrics: {
    revenuePerDollar: number;
    costGrowthRate: number;
    seasonalityStrength: number;
    businessCorrelation: number;
  };
  confidence: number;
  seasonal?: any[];
}

const BusinessForecasting: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState<BusinessForecast | null>(null);
  const [scenarios, setScenarios] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [forecastMonths, setForecastMonths] = useState(6);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'scenarios' | 'seasonal'>('overview');

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/api/business-forecast/forecast?months=${forecastMonths}&seasonality=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setForecast(res.data.forecast);
      } else {
        setMessage(`❌ ${res.data.error}`);
      }
    } catch (e: any) {
      setMessage(`❌ ${e.response?.data?.error || e.message}`);
    } finally { setLoading(false); }
  };

  const generateScenarios = async () => {
    try {
      setScenarioLoading(true);
      const token = localStorage.getItem('authToken');
      
      const scenarioData = [
        {
          name: 'Conservative Growth',
          businessGrowth: 1.15,
          seasonalityMultiplier: 0.9,
          externalFactors: { marketConditions: 'stable' }
        },
        {
          name: 'Aggressive Expansion', 
          businessGrowth: 1.5,
          seasonalityMultiplier: 1.2,
          externalFactors: { marketConditions: 'growth' }
        },
        {
          name: 'Economic Downturn',
          businessGrowth: 0.85,
          seasonalityMultiplier: 0.8,
          externalFactors: { marketConditions: 'recession' }
        }
      ];
      
      const res = await axios.post(`${API_URL}/api/business-forecast/scenarios`, 
        { scenarios: scenarioData },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }}
      );
      
      if (res.data.success) {
        setScenarios(res.data);
        setMessage('✅ Scenario analysis complete');
      } else {
        setMessage(`❌ Scenario generation failed: ${res.data.error}`);
      }
    } catch (e: any) {
      setMessage(`❌ Scenario analysis failed: ${e.response?.data?.error || e.message}`);
    } finally { setScenarioLoading(false); }
  };

  useEffect(() => {
    fetchForecast();
  }, [forecastMonths]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const createForecastChart = () => {
    if (!forecast?.periods) return null;

    const labels = forecast.periods.map(p => new Date(p.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    
    return {
      labels,
      datasets: [
        {
          label: 'Base Forecast',
          data: forecast.periods.map(p => p.cost),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: false
        },
        {
          label: 'Business-Adjusted',
          data: forecast.periods.map(p => p.businessAdjustedCost),
          borderColor: 'rgb(255, 99, 132)', 
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          fill: false
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Cost Forecast with Business Context' }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      {/* Header with Advanced Controls */}
      <Card sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white',
        mb: 3
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AnalyticsIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                  🚀 Business Intelligence Forecasting
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  AI-Powered Revenue Correlation & Scenario Planning
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {loading && <CircularProgress size={24} sx={{ color: 'white' }} />}
              <TextField
                select
                size="small"
                value={forecastMonths}
                onChange={(e) => setForecastMonths(parseInt(e.target.value))}
                sx={{ 
                  minWidth: 120,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&:hover fieldset': { borderColor: 'white' }
                  }
                }}
              >
                <MenuItem value={3}>3 months</MenuItem>
                <MenuItem value={6}>6 months</MenuItem>
                <MenuItem value={12}>12 months</MenuItem>
              </TextField>
              <Button 
                variant="outlined" 
                onClick={generateScenarios}
                startIcon={scenarioLoading ? <CircularProgress size={16} /> : <ScenarioIcon />}
                disabled={scenarioLoading}
                sx={{ 
                  color: 'white', 
                  borderColor: 'white',
                  '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }
                }}
              >
                {scenarioLoading ? 'Analyzing...' : 'AI Scenarios'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {message && (
        <Alert 
          sx={{ mb: 3, borderRadius: 2 }} 
          severity={message.startsWith('✅') ? 'success' : 'error'}
          variant="filled"
        >
          {message}
        </Alert>
      )}

      {/* Executive Dashboard Metrics */}
      {forecast && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <CardContent>
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SpeedIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Revenue Efficiency</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                  ${forecast.businessMetrics.revenuePerDollar.toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Revenue per AWS dollar
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(forecast.businessMetrics.revenuePerDollar * 20, 100)}
                  sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}
                />
              </Box>
              <Box sx={{ 
                position: 'absolute', 
                top: -20, 
                right: -20, 
                opacity: 0.1, 
                transform: 'rotate(15deg)' 
              }}>
                <SpeedIcon sx={{ fontSize: 80 }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            background: 'linear-gradient(135deg, #4834d4 0%, #686de0 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <CardContent>
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TimelineIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Growth Rate</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {(forecast.businessMetrics.costGrowthRate * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Monthly cost growth
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  {forecast.businessMetrics.costGrowthRate > 0 ? <ForecastIcon /> : <TrendingDown />}
                  <Typography variant="caption" sx={{ ml: 1 }}>
                    {forecast.businessMetrics.costGrowthRate > 0 ? 'Increasing' : 'Decreasing'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            background: 'linear-gradient(135deg, #00d2d3 0%, #54a0ff 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <CardContent>
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <InsightsIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Business Correlation</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {(forecast.businessMetrics.businessCorrelation * 100).toFixed(0)}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Revenue-cost alignment
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={forecast.businessMetrics.businessCorrelation * 100}
                  sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}
                />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9ff3 0%, #f368e0 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <CardContent>
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AnalyticsIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Forecast Confidence</Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {forecast.confidence}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Prediction accuracy
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={forecast.confidence}
                  sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.3)' }}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Main Content - Advanced Forecast Visualization */}
      {forecast && (
        <Card sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
          <CardContent>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              📈 Interactive Forecast Analysis
            </Typography>
            
            {/* Chart Area */}
            <Box sx={{ height: 400, mb: 3 }}>
              <Line 
                data={{
                  labels: forecast.periods.map(p => new Date(p.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })),
                  datasets: [
                    {
                      label: 'Base Forecast',
                      data: forecast.periods.map(p => p.cost),
                      borderColor: 'rgb(102, 126, 234)',
                      backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4
                    },
                    {
                      label: 'Business-Adjusted Forecast',
                      data: forecast.periods.map(p => p.businessAdjustedCost),
                      borderColor: 'rgb(255, 99, 132)',
                      backgroundColor: 'rgba(255, 99, 132, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.4
                    },
                    {
                      label: 'Revenue Projection',
                      data: forecast.periods.map(p => p.revenueProjection),
                      borderColor: 'rgb(75, 192, 192)',
                      backgroundColor: 'rgba(75, 192, 192, 0.1)',
                      borderWidth: 2,
                      borderDash: [5, 5],
                      fill: false,
                      tension: 0.4
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      position: 'top' as const,
                      labels: { usePointStyle: true, padding: 20 }
                    },
                    title: { 
                      display: true, 
                      text: 'Business-Aware Cost & Revenue Forecasting',
                      font: { size: 16, weight: 'bold' }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: false,
                      grid: { color: 'rgba(0,0,0,0.1)' },
                      ticks: {
                        callback: function(value: any) {
                          return formatCurrency(value);
                        }
                      }
                    },
                    x: {
                      grid: { color: 'rgba(0,0,0,0.1)' }
                    }
                  },
                  interaction: {
                    intersect: false,
                    mode: 'index' as const
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Advanced Analytics Sections */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              📋 Detailed Financial Forecast
            </Typography>
              {forecast?.periods ? (
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Period</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Base Cost</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Business-Adjusted</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Revenue Projection</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Confidence</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {forecast.periods.map((period, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {new Date(period.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {formatCurrency(period.cost)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                              {formatCurrency(period.businessAdjustedCost)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'success.main' }}>
                              {formatCurrency(period.revenueProjection)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${period.confidenceLevel}%`} 
                              size="small"
                              color={getConfidenceColor(period.confidenceLevel) as any}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography color="text.secondary">Loading forecast data...</Typography>
                </Box>
              )}
          </CardContent>
        </Card>

        {/* Scenario Analysis */}
          <Card sx={{ borderRadius: 3, height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                🎯 AI Scenario Planning
              </Typography>
              {scenarioLoading && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2">Generating scenarios...</Typography>
                </Box>
              )}
              {scenarios?.scenarios ? (
                <Box>
                  {scenarios.scenarios.map((scenario: any, idx: number) => (
                    <Card key={idx} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                      <CardContent sx={{ pb: '16px !important' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {scenario.name}
                          </Typography>
                          <Chip 
                            label={scenario.metrics.costVariance > 500 ? 'High Risk' : 'Low Risk'}
                            size="small"
                            color={scenario.metrics.costVariance > 500 ? 'error' : 'success'}
                            variant="outlined"
                          />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Total Cost</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                              {formatCurrency(scenario.metrics.totalProjectedCost)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Impact</Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: scenario.impact.direction === 'increase' ? 'error.main' : 'success.main'
                              }}
                            >
                              {scenario.impact.percentageImpact}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <ScenarioIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Generate AI-powered scenarios to explore different business outcomes
                  </Typography>
                  <Button 
                    variant="outlined" 
                    onClick={generateScenarios}
                    startIcon={<ScenarioIcon />}
                    size="small"
                  >
                    Generate Scenarios
                  </Button>
                </Box>
              )}
          </CardContent>
        </Card>
      </Box>

      {/* Seasonal Intelligence */}
      {forecast?.seasonal && (
        <Card sx={{ mt: 3, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              🌍 Seasonal Intelligence & Market Factors
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr', lg: 'repeat(6, 1fr)' }, gap: 2 }}>
              {forecast.seasonal.slice(0, 6).map((seasonal: any, idx: number) => (
                  <Card 
                    sx={{ 
                      textAlign: 'center',
                      background: `linear-gradient(135deg, ${[
                        '#ff6b6b, #ee5a24',
                        '#4834d4, #686de0', 
                        '#00d2d3, #54a0ff',
                        '#ff9ff3, #f368e0',
                        '#ffa502, #ff6348',
                        '#2ed573, #7bed9f'
                      ][idx % 6]})`,
                      color: 'white',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Month {seasonal.month}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
                        {(seasonal.seasonalFactor * 100).toFixed(0)}%
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        {seasonal.externalFactors}
                      </Typography>
                      <Box sx={{ 
                        position: 'absolute', 
                        top: -10, 
                        right: -10, 
                        opacity: 0.1,
                        transform: 'rotate(15deg)' 
                      }}>
                        <InsightsIcon sx={{ fontSize: 60 }} />
                      </Box>
                    </CardContent>
                  </Card>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default BusinessForecasting;
