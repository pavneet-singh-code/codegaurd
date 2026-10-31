import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../services/api.js';
import { useStats } from '../context/StatsContext.jsx';
import { Empty, ErrorMessage, Loading, PageHeader, Pagination, StatCard, StatStrip, StatusBadge, fmtDate } from '../components/ui.jsx';

export default function Analyses() {
  const { stats } = useStats();
  const [rows, setRows] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/analyses', { params: { page, limit: 10 } }).then((r) => { setRows(r.data.analyses); setPagination(r.data.pagination); }).catch((e) => setError(errorMessage(e)));
  }, [page]);

  if (error) return <ErrorMessage error={error} />;
  if (!rows) return <Loading />;
  const t = stats?.totals;
  const flagRate = t && t.pairsCompared ? Math.round((t.flaggedPairs / t.pairsCompared) * 100) : 0;
  return (
    <>
      <PageHeader title="Analyses" subtitle="Every similarity analysis you have run, newest first." />
      {t && (
        <StatStrip>
          <StatCard label="Analyses run" value={t.analysesRun} icon="shield" /><StatCard label="Pairs compared" value={t.pairsCompared} hint="Latest analysis per assignment" icon="layers" tone="sky" />
          <StatCard label="Pairs flagged" value={t.flaggedPairs} icon="flag" tone="amber" /><StatCard label="Flag rate" value={`${flagRate}%`} hint="Flagged pairs divided by pairs compared" icon="chart" tone="violet" />
        </StatStrip>
      )}
      {rows.length === 0 ? <Empty title="No analyses yet">Open an assignment with at least two submissions and choose Plagiarism analysis.</Empty> : (
        <>
          <div className="card overflow-x-auto !p-0">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-slate-200"><tr><th className="th">Assignment</th><th className="th">Run on</th><th className="th">Students</th><th className="th">Pairs</th><th className="th">Threshold</th><th className="th">Flagged</th><th className="th">Status</th><th className="th" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((a) => (
                  <tr key={a._id}>
                    <td className="td font-medium">{a.assignment?.title || 'Deleted assignment'}</td><td className="td">{fmtDate(a.createdAt)}</td>
                    <td className="td">{a.totalSubmissions}</td><td className="td">{a.totalPairsCompared}</td><td className="td">{Math.round(a.threshold * 100)}%</td>
                    <td className="td font-semibold">{a.flaggedPairs}</td><td className="td"><StatusBadge status={a.status} /></td>
                    <td className="td text-right"><Link className="btn btn-secondary !py-1.5" to={`/analyses/${a._id}`}>Open report</Link></td>
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
