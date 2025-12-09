import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button, Container, LinearProgress } from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import axios from 'axios';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const EmailVerificationPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(5);
    const [redirecting, setRedirecting] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const params = new URLSearchParams(location.search);
                const token = params.get('token');

                if (!token) {
                    setError('Invalid verification link - no token provided');
                    setLoading(false);
                    return;
                }

                console.log('🔍 Verifying email with token:', token);

                const response = await axios.get(`${API_URL}/api/users/verify-email/${token}`);

                if (response.data.success) {
                    setSuccess(true);
                    console.log('✅ Email verification successful');
                } else {
                    setError(response.data.error || 'Email verification failed');
                }
            } catch (error: any) {
                console.error('❌ Email verification error:', error);
                setError(error.response?.data?.error || 'Email verification failed');
            } finally {
                setLoading(false);
            }
        };

        verifyEmail();
    }, [location]);

    // Auto-redirect countdown after successful verification
    useEffect(() => {
        if (success && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (success && countdown === 0) {
            setRedirecting(true);
            navigate('/');
        }
    }, [success, countdown, navigate]);

    return (
        <Container maxWidth="sm">
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                minHeight="100vh"
                textAlign="center"
            >
                {loading && (
                    <>
                        <CircularProgress size={60} />
                        <Typography variant="h6" sx={{ mt: 2 }}>
                            Verifying your email address...
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Please wait while we confirm your email
                        </Typography>
                    </>
                )}

                {!loading && success && (
                    <>
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                        </Box>
                        <Alert severity="success" sx={{ mb: 3, width: '100%' }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                ✅ Email Verified Successfully!
                            </Typography>
                            <Typography variant="body2">
                                Your account has been activated. You can now log in.
                            </Typography>
                        </Alert>
                        
                        {redirecting ? (
                            <Box sx={{ width: '100%', mt: 2 }}>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                    Redirecting to login page...
                                </Typography>
                                <LinearProgress />
                            </Box>
                        ) : (
                            <>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                    Redirecting in {countdown} seconds...
                                </Typography>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={() => navigate('/')}
                                    sx={{ mt: 1 }}
                                >
                                    Go to Login Now
                                </Button>
                            </>
                        )}
                    </>
                )}

                {!loading && !success && error && (
                    <>
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                            <Error sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                        </Box>
                        <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                ❌ Verification Failed
                            </Typography>
                            <Typography variant="body2">
                                {error}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                The link may have expired or already been used.
                            </Typography>
                        </Alert>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={() => navigate('/')}
                            sx={{ mt: 2 }}
                        >
                            Back to Home
                        </Button>
                    </>
                )}
            </Box>
        </Container>
    );
};

export default EmailVerificationPage;