import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';
import { ErrorMessage } from '../components/ui.jsx';
import AuthShell from '../components/AuthShell.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'STUDENT', inviteCode: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    const body = { ...form }; if (!body.inviteCode) delete body.inviteCode;
    try { await register(body); navigate('/dashboard'); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Create your account" subtitle="Students submit code, professors review it." footer={<>Already registered? <Link className="font-semibold text-indigo-600 hover:underline" to="/login">Sign in</Link></>}>
      <form onSubmit={submit} className="card space-y-4">
        <ErrorMessage error={error} />
        <label className="block text-sm font-medium">Full name<input className="input mt-1" required value={form.name} onChange={set('name')} /></label>
        <label className="block text-sm font-medium">Email<input className="input mt-1" type="email" required value={form.email} onChange={set('email')} /></label>
        <label className="block text-sm font-medium">Password<input className="input mt-1" type="password" required minLength={8} value={form.password} onChange={set('password')} />
          <span className="text-xs font-normal text-slate-500">At least 8 characters</span></label>
        <label className="block text-sm font-medium">I am a
          <select className="input mt-1" value={form.role} onChange={set('role')}><option value="STUDENT">Student</option><option value="PROFESSOR">Professor</option></select></label>
        {form.role === 'PROFESSOR' && (
          <label className="block text-sm font-medium">Invite code <span className="font-normal text-slate-500">(if your institution requires one)</span>
            <input className="input mt-1" value={form.inviteCode} onChange={set('inviteCode')} /></label>
        )}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
      </form>
    </AuthShell>
  );
}
