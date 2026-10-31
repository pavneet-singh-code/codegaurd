import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { StatsProvider, useStats } from '../context/StatsContext.jsx';
import Icon from './icons.jsx';
import { dueText, pct } from './ui.jsx';

const NAV = {
  PROFESSOR: [
    { to: '/dashboard', label: 'Overview', icon: 'home' },
    { to: '/assignments', label: 'Assignments', icon: 'book' },
    { to: '/analyses', label: 'Analyses', icon: 'shield' },
    { to: '/insights', label: 'Insights', icon: 'chart' },
    { to: '/students', label: 'Students', icon: 'users' },
  ],
  STUDENT: [
    { to: '/dashboard', label: 'Overview', icon: 'home' },
    { to: '/submit', label: 'Submit assignment', icon: 'upload' },
    { to: '/assignments', label: 'Assignments', icon: 'book' },
    { to: '/submissions', label: 'My submissions', icon: 'file' },
    { to: '/progress', label: 'Progress', icon: 'trend' },
  ],
};
const ACCOUNT = [{ to: '/settings', label: 'Settings', icon: 'sliders' }, { to: '/help', label: 'Help & guide', icon: 'help' }];

function titleFor(path) {
  if (/^\/assignments\/new/.test(path)) return 'New assignment';
  if (/^\/assignments\/[^/]+\/edit/.test(path)) return 'Edit assignment';
  if (/^\/assignments\/[^/]+\/analysis/.test(path)) return 'Plagiarism analysis';
  if (/^\/assignments\/[^/]+\/submit/.test(path)) return 'Submit assignment';
  if (/^\/assignments\/[^/]+/.test(path)) return 'Assignment';
  if (/^\/analyses\/[^/]+/.test(path)) return 'Similarity report';
  return { '/dashboard': 'Overview', '/assignments': 'Assignments', '/analyses': 'Analyses', '/insights': 'Insights', '/students': 'Students', '/submissions': 'My submissions', '/submit': 'Submit assignment', '/progress': 'Progress', '/settings': 'Settings', '/help': 'Help & guide' }[path] || 'CodeGuard';
}

function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { stats } = useStats();
  const isProf = user.role === 'PROFESSOR';
  const badge = { '/analyses': isProf && stats?.totals.flaggedPairs ? stats.totals.flaggedPairs : null, '/assignments': stats ? (isProf ? stats.totals.open : stats.totals.pending) || null : null };
  const item = ({ isActive }) => `flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'border-red-400 bg-white/10 text-white' : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'}`;
  const link = (n) => (
    <NavLink key={n.to} to={n.to} end={n.to === '/dashboard'} className={item} onClick={onClose}>
      <Icon name={n.icon} className="h-5 w-5 shrink-0" /><span className="flex-1">{n.label}</span>
      {badge[n.to] ? <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${n.to === '/analyses' ? 'bg-red-500 text-white' : 'bg-white/15 text-slate-100'}`}>{badge[n.to]}</span> : null}
    </NavLink>
  );
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink py-6 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Link to="/dashboard" className="mb-9 px-6" onClick={onClose}>
          <span className="relative inline-block text-xl font-extrabold tracking-tight text-white">CodeGuard
            <svg className="absolute -bottom-2 left-0 h-2 w-full text-red-400" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><path d="M0 5 Q 5 0 10 5 T 20 5 T 30 5 T 40 5 T 50 5 T 60 5 T 70 5 T 80 5 T 90 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
          </span>
        </Link>
        {isProf && <div className="mb-6 px-4"><Link to="/assignments/new" onClick={onClose} className="btn w-full gap-2 bg-white text-ink hover:bg-slate-100"><Icon name="plus" className="h-4 w-4" />New assignment</Link></div>}
        <p className="mb-1 px-6 text-xs font-semibold text-slate-400">Workspace</p>
        <nav className="mb-8">{NAV[user.role].map(link)}</nav>
        <p className="mb-1 px-6 text-xs font-semibold text-slate-400">Account</p>
        <nav>{ACCOUNT.map(link)}</nav>
        <div className="mt-auto border-t border-white/10 px-6 pt-4">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="text-xs capitalize text-slate-400">{user.role.toLowerCase()}</p>
          <button onClick={() => { logout(); navigate('/login'); }} className="mt-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white"><Icon name="logout" className="h-4 w-4" />Log out</button>
        </div>
      </aside>
    </>
  );
}

function useOutsideClose(ref, close) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, close]);
}

function Bell() {
  const { user } = useAuth();
  const { stats } = useStats();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));
  let items = [];
  if (stats && user.role === 'PROFESSOR') {
    items = stats.topPairs.filter((p) => p.status === 'REVIEW_REQUIRED').map((p) => ({ key: p.resultId, to: `/analyses/${p.analysisId}`, title: `${p.studentA} and ${p.studentB}`, text: `${pct(p.similarityScore)} similar in ${p.assignmentTitle}` }));
  } else if (stats) {
    items = stats.upcoming.map((a) => ({ key: a._id, to: `/assignments/${a._id}`, title: a.title, text: `Not submitted yet, ${dueText(a.deadline)}` }));
  }
  return (
    <div className="relative" ref={ref}>
      <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setOpen(!open)} aria-label="Notifications">
        <Icon name="bell" />{items.length > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{items.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded border border-slate-300 bg-white p-2 shadow-xl">
          <p className="px-3 py-2 text-sm font-semibold">{user.role === 'PROFESSOR' ? 'Pairs waiting for review' : 'Assignments to hand in'}</p>
          {items.length === 0 ? <p className="px-3 pb-3 text-sm text-slate-500">You are all caught up.</p> : items.map((n) => (
            <Link key={n.key} to={n.to} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-slate-50"><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-slate-500">{n.text}</p></Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100" onClick={() => setOpen(!open)} aria-label="Account menu">
        <span className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-sm font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</span>
        <span className="hidden text-sm font-medium sm:block">{user.name}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded border border-slate-300 bg-white p-1.5 shadow-xl">
          <div className="border-b border-slate-100 px-3 py-2"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
          <Link to="/settings" onClick={() => setOpen(false)} className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">Settings</Link>
          <Link to="/help" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">Help & guide</Link>
          <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </div>
      )}
    </div>
  );
}

function Topbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const submit = (e) => { e.preventDefault(); navigate(`/assignments${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-300 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
      <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <h2 className="hidden text-lg font-extrabold tracking-tight sm:block">{titleFor(pathname)}</h2>
      <form onSubmit={submit} className="relative ml-auto w-full max-w-sm" role="search">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input !pl-9" placeholder="Search assignments…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search assignments" />
      </form>
      <Bell /><UserMenu />
    </header>
  );
}

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <StatsProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setOpen(true)} />
          <main className="margin-rule flex-1 px-4 py-6 lg:py-8 lg:pl-[60px] lg:pr-8"><div className="mx-auto w-full max-w-[1500px]"><Outlet /></div></main>
        </div>
      </div>
    </StatsProvider>
  );
}
