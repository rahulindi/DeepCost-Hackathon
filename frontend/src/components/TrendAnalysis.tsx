import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import axios from 'axios';
import { AnimatedCounter } from './AnimatedCounter';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Add shimmer animation styles
const shimmerStyles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

interface TrendData {
  month_year: string;
  total_cost: string;
  service_breakdown: { [service: string]: number };
  growth_rate: number;
}

interface TrendStats {
  avgMonthlyCost: number;
  totalCost: number;
  highestMonth: { month: string; cost: number };
  lowestMonth: { month: string; cost: number };
  overallTrend: 'increasing' | 'decreasing' | 'stable';
  volatility: 'low' | 'medium' | 'high';
}

interface TrendingService {
  service_name: string;
  avg_cost: string;
  max_cost: string;
  min_cost: string;
  growth_rate: string;
  months_active: number;
}



const TrendAnalysis: React.FC = () => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [stats, setStats] = useState<TrendStats | null>(null);
  const [trendingServices, setTrendingServices] = useState<TrendingService[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('6');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [viewMode, setViewMode] = useState<'cost' | 'growth'>('cost');

  const fetchTrendData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');

      // Fetch monthly trends
      const trendsResponse = await axios.get(`${API_URL}/api/trends/monthly?months=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (trendsResponse.data.success) {
        const data = trendsResponse.data.data;
        setTrendData(data);
        calculateStats(data);
      } else {
        setError('Failed to fetch trend data');
      }

      // Fetch trending services
      try {
        const trendingResponse = await axios.get(`${API_URL}/api/trends/trending-services?months=${timeRange}&limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (trendingResponse.data.success) {
          setTrendingServices(trendingResponse.data.data);
        }
      } catch (err) {
        console.warn('Could not fetch trending services:', err);
      }


    } catch (err: any) {
      setError(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_URL}/api/trends/export?months=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cost-trends-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error('Export error:', err);
      setError('Failed to export data');
    }
  };

  const calculateStats = (data: TrendData[]) => {
    if (!data.length) return;

    const costs = data.map(d => parseFloat(d.total_cost));
    const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
    const totalCost = costs.reduce((sum, cost) => sum + cost, 0);

    const maxCost = Math.max(...costs);
    const minCost = Math.min(...costs);
    const maxIndex = costs.indexOf(maxCost);
    const minIndex = costs.indexOf(minCost);

    // Calculate trend
    const firstHalf = costs.slice(0, Math.floor(costs.length / 2));
    const secondHalf = costs.slice(Math.floor(costs.length / 2));
    const firstAvg = firstHalf.reduce((sum, cost) => sum + cost, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, cost) => sum + cost, 0) / secondHalf.length;

    let overallTrend: 'increasing' | 'decreasing' | 'stable';
    const trendDiff = ((secondAvg - firstAvg) / firstAvg) * 100;
    if (trendDiff > 5) overallTrend = 'increasing';
    else if (trendDiff < -5) overallTrend = 'decreasing';
    else overallTrend = 'stable';

    // Calculate volatility
    const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - avgCost, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);
    const coefficientVariation = stdDev / avgCost;

    let volatility: 'low' | 'medium' | 'high';
    if (coefficientVariation < 0.1) volatility = 'low';
    else if (coefficientVariation < 0.25) volatility = 'medium';
    else volatility = 'high';

    setStats({
      avgMonthlyCost: avgCost,
      totalCost,
      highestMonth: { month: data[maxIndex].month_year, cost: maxCost },
      lowestMonth: { month: data[minIndex].month_year, cost: minCost },
      overallTrend,
      volatility
    });
  };

  useEffect(() => {
    fetchTrendData();
  }, [timeRange]);

  const getChartData = () => {
    if (!trendData.length) return null;

    const labels = trendData.map(item => item.month_year).reverse(); // Reverse to show chronological order

    if (viewMode === 'cost') {
      return {
        labels,
        datasets: [{
          label: 'Monthly Costs ($)',
          data: trendData.map(item => parseFloat(item.total_cost)).reverse(),
          borderColor: 'rgba(102, 126, 234, 1)',
          backgroundColor: chartType === 'bar'
            ? 'rgba(102, 126, 234, 0.7)'
            : 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: chartType === 'line',
          borderWidth: 3,
          pointBackgroundColor: 'rgba(102, 126, 234, 1)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      };
    } else {
      return {
        labels,
        datasets: [{
          label: 'Growth Rate (%)',
          data: trendData.map(item => item.growth_rate || 0).reverse(),
          borderColor: trendData.map(item => {
            const rate = item.growth_rate || 0;
            return rate > 0 ? 'rgba(239, 68, 68, 1)' : rate < 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(156, 163, 175, 1)';
          }).reverse(),
          backgroundColor: chartType === 'bar'
            ? trendData.map(item => {
              const rate = item.growth_rate || 0;
              return rate > 0 ? 'rgba(239, 68, 68, 0.7)' : rate < 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(156, 163, 175, 0.7)';
            }).reverse()
            : 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: chartType === 'line',
          borderWidth: 3,
          pointBackgroundColor: trendData.map(item => {
            const rate = item.growth_rate || 0;
            return rate > 0 ? 'rgba(239, 68, 68, 1)' : rate < 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(156, 163, 175, 1)';
          }).reverse(),
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      };
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 14, weight: 600 }
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#f1f5f9',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context: any) {
            const value = context.parsed.y;
            return viewMode === 'cost'
              ? `Cost: $${value.toFixed(2)}`
              : `Growth: ${value.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: viewMode === 'cost',
        grid: { color: 'rgba(0,0,0,0.1)' },
        ticks: {
          callback: function (value: any) {
            return viewMode === 'cost' ? `$${value}` : `${value}%`;
          }
        }
      },
      x: {
        grid: { color: 'rgba(0,0,0,0.1)' }
      }
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'error';
      case 'decreasing': return 'success';
      default: return 'info';
    }
  };

  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'success';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <style>{shimmerStyles}</style>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AnalyticsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          📈 Cost Trend Analysis
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              <MenuItem value="3">3 Months</MenuItem>
              <MenuItem value="6">6 Months</MenuItem>
              <MenuItem value="12">12 Months</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={loading || trendData.length === 0}
          >
            📥 Export CSV
          </Button>
          <Button
            variant="outlined"
            onClick={fetchTrendData}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
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

      {/* Stats Cards */}
      {stats && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 3,
            mb: 3
          }}
        >
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>💰 Avg Monthly</Typography>
              <AnimatedCounter
                value={stats.avgMonthlyCost}
                prefix="$"
                decimals={2}
                variant="h4"
                sx={{ fontWeight: 700, color: 'white' }}
              />
            </CardContent>
          </Card>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>📊 Total Period</Typography>
              <AnimatedCounter
                value={stats.totalCost}
                prefix="$"
                decimals={2}
                variant="h4"
                sx={{ fontWeight: 700, color: 'white' }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>📈 Overall Trend</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {stats.overallTrend === 'increasing' ? (
                  <TrendingUpIcon color="error" />
                ) : stats.overallTrend === 'decreasing' ? (
                  <TrendingDownIcon color="success" />
                ) : (
                  <AnalyticsIcon color="info" />
                )}
                <Chip
                  label={stats.overallTrend}
                  color={getTrendColor(stats.overallTrend) as any}
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>⚡ Volatility</Typography>
              <Chip
                label={stats.volatility.toUpperCase()}
                color={getVolatilityColor(stats.volatility) as any}
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Cost stability indicator
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Chart Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="cost">Cost View</ToggleButton>
          <ToggleButton value="growth">Growth Rate</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(_, newType) => newType && setChartType(newType)}
          size="small"
        >
          <ToggleButton value="line">Line Chart</ToggleButton>
          <ToggleButton value="bar">Bar Chart</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Main Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {viewMode === 'cost' ? '💰 Cost Trends' : '📈 Growth Rate Trends'} - Last {timeRange} Months
          </Typography>

          {/* Warning for insufficient growth data */}
          {viewMode === 'growth' && trendData.length === 1 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Growth rate requires at least 2 months of data. Currently showing {trendData.length} month.
              The first month shows 0% growth (no previous month to compare).
            </Alert>
          )}

          {loading ? (
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={60} />
            </Box>
          ) : getChartData() ? (
            <Box sx={{ height: 400 }}>
              {chartType === 'line' ? (
                <Line data={getChartData()!} options={chartOptions} />
              ) : (
                <Bar data={getChartData()!} options={chartOptions} />
              )}
            </Box>
          ) : (
            <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="textSecondary">No trend data available</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      {stats && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)'
            },
            gap: 3,
            mb: 3
          }}
        >
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>🔝 Highest Cost Month</Typography>
              <Typography variant="h4" color="error.main">
                ${stats.highestMonth.cost.toFixed(2)}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                {stats.highestMonth.month}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>🔻 Lowest Cost Month</Typography>
              <Typography variant="h4" color="success.main">
                ${stats.lowestMonth.cost.toFixed(2)}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                {stats.lowestMonth.month}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Trending Services - Enhanced UI */}
      {trendingServices.length > 0 && (
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              pointerEvents: 'none'
            }
          }}
        >
          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Typography sx={{ fontSize: '24px' }}>🔥</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                  Top Trending Services
                </Typography>
              </Box>
              <Chip
                label={`Last ${timeRange} months`}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600,
                  backdropFilter: 'blur(10px)'
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {trendingServices.map((service, index) => {
                const growthRate = parseFloat(service.growth_rate);
                const isGrowing = growthRate > 0;
                const avgCost = parseFloat(service.avg_cost);
                const maxCost = parseFloat(service.max_cost);
                const minCost = parseFloat(service.min_cost);

                return (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                        background: 'rgba(255,255,255,1)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: isGrowing ? '#ef4444' : '#10b981',
                            boxShadow: isGrowing
                              ? '0 0 8px rgba(239, 68, 68, 0.6)'
                              : '0 0 8px rgba(16, 185, 129, 0.6)'
                          }} />
                          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1e293b' }}>
                            {service.service_name || 'Unknown Service'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Box>
                            <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                              Average Cost
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#0f172a' }}>
                              ${avgCost.toFixed(2)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                              Range
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#0f172a' }}>
                              ${minCost.toFixed(2)} - ${maxCost.toFixed(2)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                              Active Months
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#0f172a' }}>
                              {service.months_active}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 1
                      }}>
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          bgcolor: isGrowing ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: '12px',
                          border: `2px solid ${isGrowing ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}>
                          {isGrowing ? (
                            <TrendingUpIcon sx={{ fontSize: 20, color: '#ef4444' }} />
                          ) : (
                            <TrendingDownIcon sx={{ fontSize: 20, color: '#10b981' }} />
                          )}
                          <Typography
                            variant="h6"
                            fontWeight={700}
                            sx={{ color: isGrowing ? '#ef4444' : '#10b981' }}
                          >
                            {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>
                          Growth Rate
                        </Typography>
                      </Box>
                    </Box>
                    {/* Mini progress indicator */}
                    <Box sx={{
                      width: '100%',
                      height: 4,
                      bgcolor: 'rgba(0,0,0,0.05)',
                      borderRadius: 2,
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <Box sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${Math.min(Math.abs(growthRate) * 2, 100)}%`,
                        bgcolor: isGrowing ? '#ef4444' : '#10b981',
                        borderRadius: 2,
                        transition: 'width 0.5s ease'
                      }} />
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}



      {/* Service Breakdown - Enhanced UI */}
      {trendData.length > 0 && trendData[0].service_breakdown && Object.keys(trendData[0].service_breakdown).length > 0 && (
        <Card
          sx={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              pointerEvents: 'none'
            }
          }}
        >
          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography sx={{ fontSize: '24px' }}>📊</Typography>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                  Service Cost Breakdown
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  {trendData[0].month_year} • Total: ${parseFloat(trendData[0].total_cost).toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 2
            }}>
              {Object.entries(trendData[0].service_breakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([service, cost], index) => {
                  const totalCost = parseFloat(trendData[0].total_cost) || 1;
                  const percentage = totalCost > 0 ? (cost / totalCost) * 100 : 0;

                  // Color palette for different services
                  const colors = [
                    { bg: 'rgba(99, 102, 241, 0.95)', shadow: 'rgba(99, 102, 241, 0.4)' },
                    { bg: 'rgba(236, 72, 153, 0.95)', shadow: 'rgba(236, 72, 153, 0.4)' },
                    { bg: 'rgba(34, 197, 94, 0.95)', shadow: 'rgba(34, 197, 94, 0.4)' },
                    { bg: 'rgba(251, 146, 60, 0.95)', shadow: 'rgba(251, 146, 60, 0.4)' },
                    { bg: 'rgba(168, 85, 247, 0.95)', shadow: 'rgba(168, 85, 247, 0.4)' },
                    { bg: 'rgba(14, 165, 233, 0.95)', shadow: 'rgba(14, 165, 233, 0.4)' },
                    { bg: 'rgba(234, 179, 8, 0.95)', shadow: 'rgba(234, 179, 8, 0.4)' },
                    { bg: 'rgba(239, 68, 68, 0.95)', shadow: 'rgba(239, 68, 68, 0.4)' },
                    { bg: 'rgba(20, 184, 166, 0.95)', shadow: 'rgba(20, 184, 166, 0.4)' },
                    { bg: 'rgba(139, 92, 246, 0.95)', shadow: 'rgba(139, 92, 246, 0.4)' }
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        p: 2,
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.3)',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 12px 24px ${color.shadow}`,
                          background: 'rgba(255,255,255,1)'
                        }
                      }}
                    >
                      {/* Rank badge */}
                      <Box sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: color.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                        color: 'white',
                        boxShadow: `0 4px 12px ${color.shadow}`
                      }}>
                        {index + 1}
                      </Box>

                      <Box sx={{ pr: 4 }}>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{
                            mb: 1,
                            display: 'block',
                            wordBreak: 'break-word',
                            lineHeight: 1.4,
                            color: '#1e293b',
                            fontSize: '0.95rem'
                          }}
                          title={service}
                        >
                          {service || 'Unknown Service'}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
                          <Typography variant="h6" fontWeight={700} sx={{ color: '#0f172a' }}>
                            ${cost.toFixed(2)}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
                            {percentage.toFixed(1)}%
                          </Typography>
                        </Box>

                        {/* Enhanced progress bar */}
                        <Box sx={{ position: 'relative' }}>
                          <Box sx={{
                            width: '100%',
                            height: 8,
                            bgcolor: 'rgba(0,0,0,0.06)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <Box sx={{
                              width: `${percentage}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${color.bg} 0%, ${color.bg.replace('0.95', '0.7')} 100%)`,
                              borderRadius: 2,
                              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                              position: 'relative',
                              '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                                animation: 'shimmer 2s infinite'
                              }
                            }} />
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TrendAnalysis;
