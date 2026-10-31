import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';
import { ErrorMessage } from '../components/ui.jsx';
import AuthShell from '../components/AuthShell.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await login(form.email, form.password); navigate('/dashboard'); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to submit code or review similarity reports." footer={<>No account? <Link className="font-semibold text-indigo-600 hover:underline" to="/register">Register</Link></>}>
      <form onSubmit={submit} className="card space-y-4">
        <ErrorMessage error={error} />
        <label className="block text-sm font-medium">Email
          <input className="input mt-1" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="block text-sm font-medium">Password
          <input className="input mt-1" type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthShell>
  );
}
