import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, ErrorMessage, PageHeader, Panel } from '../components/ui.jsx';

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState({ profile: '', password: '' });
  const [err, setErr] = useState({ profile: '', password: '' });
  const [busy, setBusy] = useState('');

  const saveName = async (e) => {
    e.preventDefault(); setBusy('profile'); setErr({ ...err, profile: '' });
    try { const r = await api.patch('/auth/me', { name }); refreshUser(r.data.user); setMsg({ ...msg, profile: 'Profile saved.' }); }
    catch (x) { setErr({ ...err, profile: errorMessage(x) }); setMsg({ ...msg, profile: '' }); } finally { setBusy(''); }
  };
  const savePw = async (e) => {
    e.preventDefault(); setBusy('password'); setErr({ ...err, password: '' });
    try { await api.post('/auth/change-password', pw); setPw({ currentPassword: '', newPassword: '' }); setMsg({ ...msg, password: 'Password updated.' }); }
    catch (x) { setErr({ ...err, password: errorMessage(x) }); setMsg({ ...msg, password: '' }); } finally { setBusy(''); }
  };
  const ok = (t) => t && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{t}</p>;
  return (
    <>
      <PageHeader title="Settings" subtitle="Your account details and security." />
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <Panel title="Profile">
          <form onSubmit={saveName} className="space-y-4">
            <ErrorMessage error={err.profile} />{ok(msg.profile)}
            <label className="block text-sm font-medium">Full name<input className="input mt-1" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="block text-sm font-medium">Email<input className="input mt-1 !bg-slate-50" value={user.email} disabled /></label>
            <div className="flex items-center gap-2 text-sm"><span className="font-medium">Role</span><Badge tone="blue">{user.role}</Badge></div>
            <button className="btn btn-primary" disabled={busy === 'profile' || name.trim() === user.name}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button>
          </form>
        </Panel>
        <Panel title="Change password">
          <form onSubmit={savePw} className="space-y-4">
            <ErrorMessage error={err.password} />{ok(msg.password)}
            <label className="block text-sm font-medium">Current password<input className="input mt-1" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></label>
            <label className="block text-sm font-medium">New password<input className="input mt-1" type="password" required minLength={8} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /><span className="text-xs font-normal text-slate-500">At least 8 characters</span></label>
            <button className="btn btn-primary" disabled={busy === 'password'}>{busy === 'password' ? 'Updating…' : 'Update password'}</button>
          </form>
        </Panel>
        <Panel title="Session" className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Sign out on this device. Your token is removed from the browser.</p>
            <button className="btn btn-danger" onClick={() => { logout(); navigate('/login'); }}>Log out</button></div>
        </Panel>
      </div>
    </>
  );
}
