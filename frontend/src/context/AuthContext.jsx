import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { TOKEN_KEY } from '../services/api.js';

export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('codeguard:logout', onLogout);
    return () => window.removeEventListener('codeguard:logout', onLogout);
  }, []);

  const finish = useCallback((data) => { localStorage.setItem(TOKEN_KEY, data.token); setUser(data.user); return data.user; }, []);
  const login = async (email, password) => finish((await api.post('/auth/login', { email, password })).data);
  const register = async (form) => finish((await api.post('/auth/register', form)).data);
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: setUser }}>{children}</AuthContext.Provider>;
}
