import axios from 'axios';

export const TOKEN_KEY = 'codeguard_token';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired/invalid token anywhere logs the user out (login attempts themselves are excluded).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('codeguard:logout'));
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err) {
  const e = err.response?.data?.error;
  if (!e) return err.message || 'Something went wrong';
  return e.details?.length ? `${e.message}: ${e.details.map((d) => d.message).join('; ')}` : e.message;
}

export default api;
