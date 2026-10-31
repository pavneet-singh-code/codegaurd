import { useState } from 'react';
import { useStats } from '../context/StatsContext.jsx';
import { Badge, Empty, ErrorMessage, Loading, PageHeader, ScoreBar, StatCard, StatStrip } from '../components/ui.jsx';
import Icon from '../components/icons.jsx';

export default function Students() {
  const { stats, error } = useStats();
  const [q, setQ] = useState('');
  if (!stats) return error ? <ErrorMessage error={error} /> : <Loading />;
  const { students } = stats;
  const shown = students.filter((s) => `${s.name} ${s.email}`.toLowerCase().includes(q.toLowerCase()));
  const involved = students.filter((s) => s.flaggedPairs > 0).length;
  const withLate = students.filter((s) => s.late > 0).length;
  const avgVersions = students.length ? (students.reduce((n, s) => n + s.versions, 0) / students.length).toFixed(1) : '0';
  return (
    <>
      <PageHeader title="Students" subtitle="Everyone who has submitted to one of your assignments." />
      <StatStrip>
        <StatCard label="Students" value={students.length} icon="users" /><StatCard label="In a flagged pair" value={involved} hint="A reason to look, not a verdict" icon="flag" tone="amber" />
        <StatCard label="With late submissions" value={withLate} icon="clock" tone="rose" /><StatCard label="Avg. versions per student" value={avgVersions} icon="layers" tone="sky" />
      </StatStrip>
      <div className="relative mb-4 max-w-xs"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input !pl-9" placeholder="Search students" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {shown.length === 0 ? <Empty title="No students to show">{students.length ? 'No one matches your search.' : 'Students appear here once they submit work.'}</Empty> : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-slate-200"><tr><th className="th">Student</th><th className="th">Assignments</th><th className="th">Uploads</th><th className="th">Late</th><th className="th">Highest similarity</th><th className="th">Flagged pairs</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((s) => (
                <tr key={s._id}>
                  <td className="td"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{s.name.slice(0, 1).toUpperCase()}</span><div><p className="font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-500">{s.email}</p></div></div></td>
                  <td className="td">{s.assignments}</td><td className="td">{s.versions}</td><td className="td">{s.late ? <Badge tone="amber">{s.late}</Badge> : <span className="text-slate-400">0</span>}</td>
                  <td className="td">{s.highestSimilarity > 0 ? <ScoreBar value={s.highestSimilarity} /> : <span className="text-slate-400">Not analysed</span>}</td>
                  <td className="td font-semibold">{s.flaggedPairs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
