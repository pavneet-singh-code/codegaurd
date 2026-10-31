import { Link } from 'react-router-dom';
import { useStats } from '../context/StatsContext.jsx';
import { Badge, ErrorMessage, Loading, PageHeader, Panel, StatCard, StatStrip, dueText, fmtDate } from '../components/ui.jsx';
import { Donut, HBars } from '../components/charts.jsx';

const stateBadge = { SUBMITTED: ['green', 'Submitted'], PENDING: ['amber', 'To do'], MISSED: ['red', 'Missed'] };

export default function Progress() {
  const { stats, error } = useStats();
  if (!stats) return error ? <ErrorMessage error={error} /> : <Loading />;
  const { totals, assignments } = stats;
  const submitted = assignments.filter((a) => a.submitted);
  const completion = totals.assignments ? Math.round((totals.submitted / totals.assignments) * 100) : 0;
  return (
    <>
      <PageHeader title="Progress" subtitle="How you are doing across every assignment." />
      <StatStrip>
        <StatCard label="Completion" value={`${completion}%`} hint={`${totals.submitted} of ${totals.assignments} assignments`} icon="check" tone="emerald" />
        <StatCard label="Total uploads" value={totals.versions} icon="upload" /><StatCard label="Avg. versions" value={totals.avgVersions} hint="Uploads per submitted assignment" icon="layers" tone="sky" />
        <StatCard label="Late submissions" value={totals.lateSubmissions} icon="clock" tone="rose" />
      </StatStrip>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Punctuality" subtitle="On time versus late">
          <Donut caption="handed in" segments={[{ label: 'On time', value: totals.submitted - totals.lateSubmissions, color: '#1F8A5B' }, { label: 'Late', value: totals.lateSubmissions, color: '#D99A0B' }]} />
        </Panel>
        <Panel className="xl:col-span-2" title="Versions per assignment" subtitle="How many times you uploaded each one">
          {submitted.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Submit an assignment to see this chart.</p> : <HBars color="bg-emerald-500" items={submitted.map((a) => ({ label: a.title, value: a.versions, display: `${a.versions} version${a.versions === 1 ? '' : 's'}` }))} />}
        </Panel>
      </div>
      <Panel className="mt-6" title="Every assignment">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-slate-200"><tr><th className="th !pl-0">Assignment</th><th className="th">Deadline</th><th className="th">Last upload</th><th className="th">State</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((a) => (
                <tr key={a._id}>
                  <td className="td !pl-0 font-medium"><Link className="text-indigo-700 hover:underline" to={`/assignments/${a._id}`}>{a.title}</Link></td>
                  <td className="td">{fmtDate(a.deadline)} <span className="text-xs text-slate-400">({dueText(a.deadline)})</span></td>
                  <td className="td">{a.lastSubmittedAt ? <>{fmtDate(a.lastSubmittedAt)} {a.isLate && <Badge tone="amber">Late</Badge>}</> : <span className="text-slate-400">Nothing yet</span>}</td>
                  <td className="td"><Badge tone={stateBadge[a.state][0]}>{stateBadge[a.state][1]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
