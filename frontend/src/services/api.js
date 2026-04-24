import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8083/api', // Spring Boot endpoint
});

// Interceptor to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;

        // If using mock token, send the stored mock role for the DevAuthFilter
        if (token === 'MOCKED_JWT_TOKEN') {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (user.role) {
                config.headers['X-Mock-Role'] = user.role;
            }
        }
    }
    return config;
});

// Interceptor to handle expired tokens (401) or forbidden (403)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Only clear session and redirect if this is NOT an auth/me call (avoid loops)
            const requestUrl = error.config?.url || '';
            if (!requestUrl.includes('/auth/me')) {
                console.warn('Session expired or unauthorized. Clearing session and redirecting to login.');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('token');
                // Redirect to login page
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
