import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await API.get('/auth/me');
                setUser(response.data.user);
            } catch (error) {
                console.error('Failed to load user profile:', error);
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await API.post('/auth/login', { email, password });
            const { token, user: userData } = response.data;
            localStorage.setItem('token', token);
            setUser(userData);
            return userData;
        } catch (error) {
            throw error.response?.data || { message: 'Network error occurred during login.' };
        }
    };

    const registerStudent = async (data) => {
        try {
            const response = await API.post('/auth/register/student', data);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Network error occurred during registration.' };
        }
    };

    const registerStaff = async (data) => {
        try {
            const response = await API.post('/auth/register/staff', data);
            return response.data;
        } catch (error) {
            throw error.response?.data || { message: 'Network error occurred during registration.' };
        }
    };

    const logout = async () => {
        try {
            await API.post('/auth/logout');
        } catch (error) {
            console.warn('Backend logout cleanup warning:', error);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, registerStudent, registerStaff, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
