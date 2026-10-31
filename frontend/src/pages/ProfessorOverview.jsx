import { Link } from 'react-router-dom';
import { Badge, Empty, PageHeader, Panel, StatCard, StatStrip, StatusBadge, fmtDate, pct } from '../components/ui.jsx';
import { AreaChart, Donut, HBars } from '../components/charts.jsx';

export default function ProfessorOverview({ stats, user }) {
  const { totals, byAssignment, timeline, languageSplit, topPairs } = stats;
  const week = timeline.slice(-7).reduce((n, d) => n + d.count, 0);
  const needReview = topPairs.filter((p) => p.status === 'REVIEW_REQUIRED');
  return (
    <>
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} subtitle="Here is what is happening across your assignments.">
        <Link className="btn btn-secondary" to="/insights">Open insights</Link>
        <Link className="btn btn-primary" to="/assignments/new">New assignment</Link>
      </PageHeader>

      <StatStrip>
        <StatCard label="Assignments" value={totals.assignments} hint={`${totals.open} open, ${totals.closed} closed`} icon="book" />
        <StatCard label="Students submitting" value={totals.students} hint={`${totals.latestSubmissions} current submissions`} icon="users" tone="sky" />
        <StatCard label="Uploads this week" value={week} hint={`${totals.submissions} versions in total`} icon="upload" tone="emerald" />
        <StatCard label="Pairs to review" value={totals.flaggedPairs} hint={`of ${totals.pairsCompared} compared in the latest analyses`} icon="flag" tone="amber" />
      </StatStrip>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Submission activity" subtitle="Uploads per day, last 14 days"><AreaChart data={timeline.map((d) => ({ label: d.date, value: d.count }))} /></Panel>
        <Panel title="Assignments by language" subtitle="How your coursework is split">
          <Donut caption="assignments" segments={[{ label: 'Java', value: languageSplit.java, color: '#17386A' }, { label: 'Python', value: languageSplit.python, color: '#1F8A5B' }]} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Assignments at a glance" action={<Link className="text-sm font-medium text-indigo-600 hover:underline" to="/assignments">View all</Link>}>
          {byAssignment.length === 0 ? <Empty title="No assignments yet">Create one so students can start submitting.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead className="border-b border-slate-200"><tr><th className="th !pl-0">Title</th><th className="th">Deadline</th><th className="th">Submitted</th><th className="th">Flagged</th><th className="th">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {byAssignment.slice(0, 6).map((a) => (
                    <tr key={a._id}>
                      <td className="td !pl-0 font-medium"><Link className="text-indigo-700 hover:underline" to={`/assignments/${a._id}`}>{a.title}</Link></td>
                      <td className="td">{fmtDate(a.deadline)}</td><td className="td">{a.submitted}{a.late > 0 && <span className="ml-2"><Badge tone="amber">{a.late} late</Badge></span>}</td>
                      <td className="td">{a.analysisCount ? a.flaggedPairs : <span className="text-slate-400">Not analysed</span>}</td><td className="td"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Needs your attention" subtitle="Highest-similarity pairs awaiting review">
          {needReview.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Nothing flagged. Run an analysis from any assignment.</p> : (
            <ul className="divide-y divide-slate-100">
              {needReview.map((p) => (
                <li key={p.resultId}><Link to={`/analyses/${p.analysisId}`} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{p.studentA} and {p.studentB}</p><p className="truncate text-xs text-slate-500">{p.assignmentTitle}</p></div>
                  <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">{pct(p.similarityScore)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {byAssignment.length > 0 && (
        <Panel className="mt-6" title="Submissions per assignment" subtitle="Students with a current submission">
          <HBars items={byAssignment.slice(0, 8).map((a) => ({ label: a.title, value: a.submitted }))} />
        </Panel>
      )}
    </>
  );
}
