import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api.js';
import { Badge, Empty, ErrorMessage, Loading, PageHeader, Pagination, StatCard, StatStrip, StatusBadge, fmtDate } from '../components/ui.jsx';
import { useStats } from '../context/StatsContext.jsx';

export default function SubmissionHistory() {
  const { stats } = useStats();
  const [subs, setSubs] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/submissions/mine', { params: { page, limit: 10 } })
      .then((r) => { setSubs(r.data.submissions); setPagination(r.data.pagination); }).catch((e) => setError(errorMessage(e)));
  }, [page]);

  if (error) return <ErrorMessage error={error} />;
  if (!subs) return <Loading />;
  return (
    <>
      <PageHeader title="My submissions" subtitle="Every version you have uploaded, newest first." />
      {stats && (
        <StatStrip>
          <StatCard label="Total uploads" value={stats.totals.versions} icon="upload" /><StatCard label="Assignments handed in" value={stats.totals.submitted} icon="check" tone="emerald" />
          <StatCard label="Late" value={stats.totals.lateSubmissions} icon="clock" tone="amber" /><StatCard label="Avg. versions" value={stats.totals.avgVersions} icon="layers" tone="sky" />
        </StatStrip>
      )}
      {subs.length === 0 ? <Empty title="No submissions yet">Open an assignment to upload your first file.</Empty> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[600px]">
              <thead className="border-b border-slate-200"><tr><th className="th">Assignment</th><th className="th">Version</th><th className="th">File</th><th className="th">Submitted</th><th className="th">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map((s) => (
                  <tr key={s._id}>
                    <td className="td font-medium">{s.assignment ? <Link className="text-indigo-700 hover:underline" to={`/assignments/${s.assignment._id}`}>{s.assignment.title}</Link> : 'Deleted assignment'}</td>
                    <td className="td">v{s.version}</td><td className="td">{s.originalFilename}</td>
                    <td className="td">{fmtDate(s.submittedAt)} {s.isLate && <Badge tone="amber">Late</Badge>}</td>
                    <td className="td"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}
    </>
  );
}
