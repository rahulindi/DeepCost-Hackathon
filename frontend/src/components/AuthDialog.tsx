import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Alert,
    Box,
    Tabs,
    Tab,
    CircularProgress,
    Typography
} from '@mui/material';
import { Login as LoginIcon, PersonAdd as RegisterIcon } from '@mui/icons-material';
import { useAuth } from './AuthContext';

interface AuthDialogProps {
    open: boolean;
    onClose: () => void;
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
            id={`auth-tabpanel-${index}`}
            aria-labelledby={`auth-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    );
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ open, onClose }) => {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    const [registerUsername, setRegisterUsername] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { login, register } = useAuth();

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setError('');
        setSuccess('');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const success = await login(loginUsername, loginPassword);
            if (success) {
                setSuccess('✅ Login successful!');
                setTimeout(() => {
                    onClose();
                    resetForms();
                }, 1000);
            } else {
                setError('❌ Invalid username or password');
            }
        } catch (error) {
            setError('❌ Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (registerPassword !== confirmPassword) {
            setError('❌ Passwords do not match');
            setLoading(false);
            return;
        }

        if (registerPassword.length < 6) {
            setError('❌ Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const success = await register(registerUsername, registerEmail, registerPassword);
            if (success) {
                setSuccess('✅ Registration successful! Account auto-verified for demo. Redirecting to login...');

                // Clear form
                setRegisterUsername('');
                setRegisterEmail('');
                setRegisterPassword('');
                setConfirmPassword('');

                // Auto-switch to Login tab after 3 seconds
                setTimeout(() => {
                    setTabValue(0); // Switch to Login tab
                    setSuccess(''); // Clear success message so it doesn't clutter login view
                    setError('');
                }, 3000);

            } else {
                setError('❌ Registration failed. Email might already exist.');
            }
        } catch (error) {
            setError('❌ Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForms = () => {
        setLoginUsername('');
        setLoginPassword('');
        setRegisterUsername('');
        setRegisterEmail('');
        setRegisterPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
        setTabValue(0);
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
            resetForms();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Typography
                    variant="h5"
                    component="div"
                    align="center"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                    }}
                >
                    <Box
                        component="span"
                        sx={{
                            animation: 'keyFloat 2s ease-in-out infinite',
                            '@keyframes keyFloat': {
                                '0%, 100%': { transform: 'translateY(0) rotate(-5deg)' },
                                '50%': { transform: 'translateY(-3px) rotate(5deg)' },
                            },
                        }}
                    >
                        🔐
                    </Box>
                    FrankenCost
                    <Box
                        component="span"
                        sx={{
                            animation: 'ghostBounce 2s ease-in-out infinite',
                            '@keyframes ghostBounce': {
                                '0%, 100%': { transform: 'translateY(0)' },
                                '50%': { transform: 'translateY(-5px)' },
                            },
                        }}
                    >
                        👻
                    </Box>
                </Typography>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={handleTabChange} centered>
                        <Tab
                            label="Login"
                            icon={<LoginIcon />}
                            iconPosition="start"
                            id="auth-tab-0"
                            aria-controls="auth-tabpanel-0"
                        />
                        <Tab
                            label="Register"
                            icon={<RegisterIcon />}
                            iconPosition="start"
                            id="auth-tab-1"
                            aria-controls="auth-tabpanel-1"
                        />
                    </Tabs>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                        {success}
                    </Alert>
                )}

                <TabPanel value={tabValue} index={0}>
                    <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Username"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            disabled={loading}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading || !loginUsername || !loginPassword}
                            startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Box component="form" onSubmit={handleRegister} sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Username"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={registerUsername}
                            onChange={(e) => setRegisterUsername(e.target.value)}
                            disabled={loading}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="register-email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            disabled={loading}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="register-password"
                            autoComplete="new-password"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            disabled={loading}
                            helperText="Minimum 6 characters"
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            id="confirm-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading || !registerUsername || !registerEmail || !registerPassword || !confirmPassword}
                            startIcon={loading ? <CircularProgress size={20} /> : <RegisterIcon />}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </Button>
                    </Box>
                </TabPanel>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export { };