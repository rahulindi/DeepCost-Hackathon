import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Alert,
    CircularProgress,
    Stepper,
    Step,
    StepLabel
} from '@mui/material';
import { CloudQueue as CloudIcon } from '@mui/icons-material';
import axios from 'axios';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface AwsSetupDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AwsSetupDialog: React.FC<AwsSetupDialogProps> = ({ open, onClose, onSuccess }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [credentialType, setCredentialType] = useState('access_key');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [hasExistingCredentials, setHasExistingCredentials] = useState(false);

    // Form fields
    const [accessKeyId, setAccessKeyId] = useState('');
    const [secretAccessKey, setSecretAccessKey] = useState('');
    const [roleArn, setRoleArn] = useState('');
    const [accountId, setAccountId] = useState('');
    const [alias, setAlias] = useState('');
    const [region, setRegion] = useState('ap-south-1');

    const steps = ['Choose Method', 'Enter Credentials', 'Verify Connection'];

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('authToken');
            const credentialData = {
                type: credentialType,
                accessKeyId: credentialType === 'access_key' ? accessKeyId : undefined,
                secretAccessKey: credentialType === 'access_key' ? secretAccessKey : undefined,
                roleArn: credentialType === 'role_arn' ? roleArn : undefined,
                accountId,
                alias: alias || 'My AWS Account',
                region: region || 'ap-south-1'
            };

            const response = await axios.post(
                `${API_URL}/api/aws-setup/credentials`,
                credentialData,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                setSuccess('✅ AWS credentials configured successfully!');
                handleNext();
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }
        } catch (error: any) {
            setError(error.response?.data?.error || 'Failed to configure AWS credentials');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setActiveStep(0);
        setAccessKeyId('');
        setSecretAccessKey('');
        setRoleArn('');
        setAccountId('');
        setAlias('');
        setRegion('ap-south-1');
        setError('');
        setSuccess('');
        setHasExistingCredentials(false);
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect AWS? This will remove all stored credentials.')) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            await axios.delete(
                `${API_URL}/api/aws-setup/credentials`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setSuccess('AWS credentials removed successfully');
            setHasExistingCredentials(false);
            resetForm();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            setError(error.response?.data?.error || 'Failed to remove credentials');
        } finally {
            setLoading(false);
        }
    };

    const getStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            How would you like to connect to AWS?
                        </Typography>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Authentication Method</FormLabel>
                            <RadioGroup
                                value={credentialType}
                                onChange={(e) => setCredentialType(e.target.value)}
                            >
                                <FormControlLabel
                                    value="access_key"
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography variant="subtitle2">Access Key & Secret</Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                Recommended for individual developers
                                            </Typography>
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="role_arn"
                                    control={<Radio />}
                                    label={
                                        <Box>
                                            <Typography variant="subtitle2">IAM Role ARN</Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                Recommended for enterprise environments
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </RadioGroup>
                        </FormControl>
                    </Box>
                );

            case 1:
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            Enter your AWS credentials
                        </Typography>

                        {credentialType === 'access_key' && (
                            <>
                                <TextField
                                    fullWidth
                                    label="Access Key ID"
                                    value={accessKeyId}
                                    onChange={(e) => setAccessKeyId(e.target.value)}
                                    margin="normal"
                                    required
                                    helperText="Found in AWS Console → IAM → Users → Security credentials"
                                />
                                <TextField
                                    fullWidth
                                    label="Secret Access Key"
                                    type="password"
                                    value={secretAccessKey}
                                    onChange={(e) => setSecretAccessKey(e.target.value)}
                                    margin="normal"
                                    required
                                    helperText="Generated when creating Access Key"
                                />
                            </>
                        )}

                        {credentialType === 'role_arn' && (
                            <TextField
                                fullWidth
                                label="IAM Role ARN"
                                value={roleArn}
                                onChange={(e) => setRoleArn(e.target.value)}
                                margin="normal"
                                required
                                helperText="arn:aws:iam::123456789012:role/YourRoleName"
                                placeholder="arn:aws:iam::123456789012:role/CostTrackerRole"
                            />
                        )}

                        <TextField
                            fullWidth
                            label="AWS Account ID (Optional)"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            margin="normal"
                            helperText="12-digit AWS account ID"
                        />

                        <TextField
                            fullWidth
                            label="Account Alias"
                            value={alias}
                            onChange={(e) => setAlias(e.target.value)}
                            margin="normal"
                            placeholder="Production, Development, etc."
                            helperText="Friendly name to identify this AWS account"
                        />

                        <TextField
                            fullWidth
                            label="Default AWS Region"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            margin="normal"
                            placeholder="ap-south-1"
                            helperText="Primary region where your resources are located"
                        />
                    </Box>
                );

            case 2:
                return (
                    <Box textAlign="center">
                        {loading && <CircularProgress sx={{ mb: 2 }} />}
                        {success && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                {success}
                            </Alert>
                        )}
                        <Typography variant="h6">
                            {loading ? 'Verifying connection...' : 'AWS Setup Complete!'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {loading
                                ? 'Testing your AWS credentials and permissions'
                                : 'You can now start tracking your AWS costs!'
                            }
                        </Typography>
                    </Box>
                );

            default:
                return 'Unknown step';
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                        <CloudIcon sx={{ mr: 1, color: '#FF9900' }} />
                        Connect Your AWS Account
                    </Box>
                    <Button 
                        color="error" 
                        size="small"
                        onClick={handleDisconnect}
                        disabled={loading}
                    >
                        Disconnect AWS
                    </Button>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {getStepContent(activeStep)}
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                {activeStep > 0 && (
                    <Button onClick={handleBack}>
                        Back
                    </Button>
                )}
                {activeStep < steps.length - 1 && (
                    <Button
                        variant="contained"
                        onClick={activeStep === steps.length - 2 ? handleSubmit : handleNext}
                        disabled={loading}
                    >
                        {activeStep === steps.length - 2 ? 'Connect AWS' : 'Next'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export { };