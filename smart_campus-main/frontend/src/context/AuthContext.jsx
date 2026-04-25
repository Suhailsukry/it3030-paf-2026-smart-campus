import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

const GOOGLE_CLIENT_ID = "373651687447-qg28l4cirnpeddncmb57ktim5uamubkj.apps.googleusercontent.com";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    /**
     * Called after Google Sign-In OR on re-login.
     * Sends the Google ID token to the backend once to verify identity.
     * The backend returns user data + a UUID session token.
     * All future API calls use that UUID — NOT the Google JWT.
     */
    const fetchUserProfile = async (googleToken) => {
        try {
            const response = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${googleToken}` }
            });

            const data = response.data;

            // Extract user profile (without the session token)
            const userData = {
                id:    data.id,
                email: data.email,
                name:  data.name,
                role:  data.role,
            };

            // Store the UUID session token — this replaces the Google JWT for all future calls
            const sessionToken = data.token;

            setUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('token', sessionToken);   // UUID, NOT the Google token

            console.log("Logged in as:", userData.email, "| Role:", userData.role, "| Session:", sessionToken);
        } catch (error) {
            console.error("Auth verification failed:", error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser  = localStorage.getItem('currentUser');

        if (storedToken && storedUser) {
            // Trust stored session (UUID or mock). The 401 interceptor in api.js
            // will redirect to /login if the session is stale (server restart etc.)
            setUser(JSON.parse(storedUser));
            setLoading(false);
        } else {
            setLoading(false);
        }

        // Initialize Google Sign-In button
        if (window.google) {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleResponse
            });
        }
    }, []);

    const handleGoogleResponse = (response) => {
        const idToken = response.credential;
        setLoading(true);
        fetchUserProfile(idToken);
    };

    const logout = async () => {
        // Tell the backend to invalidate the session
        try {
            const token = localStorage.getItem('token');
            if (token && token !== 'MOCKED_JWT_TOKEN') {
                await api.post('/auth/logout');
            }
        } catch (_) { /* ignore logout errors */ }

        setUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');

        if (window.google) {
            window.google.accounts.id.disableAutoSelect();
        }
    };

    return (
        <AuthContext.Provider value={{ user, logout, loading, handleGoogleResponse, GOOGLE_CLIENT_ID }}>
            {children}
        </AuthContext.Provider>
    );
};
