import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

// API URL - uses environment variable in production
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface User {
    id: string;
    email: string;
    username: string;
    subscription_tier: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    register: (username: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const API_BASE = `${API_URL}/api/auth`;
    console.log('🔗 Auth API Base:', API_BASE);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await axios.get(`${API_BASE}/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setUser(response.data.user);
            } else {
                localStorage.removeItem('authToken');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('authToken');
        } finally {
            setLoading(false);
        }
    };

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const response = await axios.post(`${API_BASE}/login`, {
                username,
                password
            });

            if (response.data.success) {
                localStorage.setItem('authToken', response.data.token);
                setUser(response.data.user);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    };

    const register = async (username: string, email: string, password: string): Promise<boolean> => {
        try {
            const response = await axios.post(`${API_BASE}/register`, {
                username,
                email,
                password
            });

            if (response.data.success) {
                // Registration successful but email verification required
                // DO NOT set token or user - they must verify email first
                return true;
            }
            return false;
        } catch (error) {
            console.error('Registration failed:', error);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setUser(null);
    };

    const value = {
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        loading
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { };