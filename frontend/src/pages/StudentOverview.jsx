import { Link } from 'react-router-dom';
import { Badge, Empty, PageHeader, Panel, StatCard, StatStrip, dueText, fmtDate } from '../components/ui.jsx';
import { AreaChart, Donut } from '../components/charts.jsx';

export default function StudentOverview({ stats, user }) {
  const { totals, upcoming, recent, timeline } = stats;
  return (
    <>
      <PageHeader title={`Hi ${user.name.split(' ')[0]}, here is your week`} subtitle="Deadlines, recent uploads and how you are doing.">
        <Link className="btn btn-secondary" to="/progress">See progress</Link>
        <Link className="btn btn-primary" to="/submit">Submit assignment</Link>
      </PageHeader>

      <StatStrip>
        <StatCard label="Open assignments" value={totals.open} hint={`${totals.assignments} published in total`} icon="book" />
        <StatCard label="Handed in" value={totals.submitted} hint={`${totals.versions} uploads including new versions`} icon="check" tone="emerald" />
        <StatCard label="Still to submit" value={totals.pending} hint={totals.missed ? `${totals.missed} missed` : 'Nothing overdue'} icon="clock" tone="amber" />
        <StatCard label="On-time rate" value={totals.onTimeRate === null ? '-' : `${Math.round(totals.onTimeRate * 100)}%`} hint={totals.submitted ? `${totals.lateSubmissions} late of ${totals.submitted}` : 'Submit something to see this'} icon="trend" tone="violet" />
      </StatStrip>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Your upload activity" subtitle="Uploads per day, last 14 days"><AreaChart data={timeline.map((d) => ({ label: d.date, value: d.count }))} color="#1F8A5B" /></Panel>
        <Panel title="Assignment status" subtitle="Across everything published">
          <Donut caption="assignments" segments={[{ label: 'Submitted', value: totals.submitted, color: '#1F8A5B' }, { label: 'To do', value: totals.pending, color: '#D99A0B' }, { label: 'Missed', value: totals.missed, color: '#D62839' }]} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Due soon" subtitle="Open assignments you have not submitted" action={<Link className="text-sm font-medium text-indigo-600 hover:underline" to="/assignments">All assignments</Link>}>
          {upcoming.length === 0 ? <Empty title="You are all caught up" /> : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((a) => (
                <li key={a._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><Link className="font-medium text-indigo-700 hover:underline" to={`/assignments/${a._id}`}>{a.title}</Link><p className="text-xs capitalize text-slate-500">{a.programmingLanguage}, {fmtDate(a.deadline)} ({dueText(a.deadline)})</p></div>
                  <Link className="btn btn-primary !py-1.5" to={`/assignments/${a._id}/submit`}>Submit</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent uploads" action={<Link className="text-sm font-medium text-indigo-600 hover:underline" to="/submissions">View history</Link>}>
          {recent.length === 0 ? <Empty title="Nothing uploaded yet" /> : (
            <ul className="divide-y divide-slate-100">
              {recent.map((s) => (
                <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div><p className="font-medium">{s.title}</p><p className="text-xs text-slate-500">v{s.version}, {s.originalFilename}</p></div>
                  <span className="flex items-center gap-2 text-xs text-slate-500">{fmtDate(s.submittedAt)}{s.isLate && <Badge tone="amber">Late</Badge>}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
