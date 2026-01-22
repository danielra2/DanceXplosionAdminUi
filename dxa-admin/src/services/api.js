import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8089/api', // URL-ul Backend-ului tău
});

// Interceptor: Adaugă automat token-ul la fiecare cerere
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;