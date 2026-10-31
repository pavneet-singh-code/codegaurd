import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

export const StatsContext = createContext({ stats: null, loading: true, error: '', reload: () => {} });
export const useStats = () => useContext(StatsContext);

// One request per page change feeds the sidebar badges, the bell and every stats widget.
export function StatsProvider({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    return api.get(`/stats/${user.role.toLowerCase()}`)
      .then((r) => { setStats(r.data); setError(''); })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [user.role]);

  useEffect(() => { reload(); }, [reload, pathname]);
  return <StatsContext.Provider value={{ stats, loading, error, reload }}>{children}</StatsContext.Provider>;
}
