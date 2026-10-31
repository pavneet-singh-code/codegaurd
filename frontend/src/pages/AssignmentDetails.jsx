import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, Empty, ErrorMessage, Loading, PageHeader, Pagination, StatCard, StatStrip, StatusBadge, dueText, fmtDate, pct } from '../components/ui.jsx';
import { useStats } from '../context/StatsContext.jsx';

export default function AssignmentDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { stats } = useStats();
  const isProf = user.role === 'PROFESSOR';
  const [assignment, setAssignment] = useState(null);
  const [subs, setSubs] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([api.get(`/assignments/${id}`), api.get(`/assignments/${id}/submissions`, { params: { page, limit: 10 } })]);
      setAssignment(a.data.assignment); setSubs(s.data.submissions); setPagination(s.data.pagination);
    } catch (e) { setError(errorMessage(e)); }
  }, [id, page]);
  useEffect(() => { load(); }, [load]);

  const close = async () => {
    if (!window.confirm('Close this assignment? Students will no longer be able to submit.')) return;
    try { await api.patch(`/assignments/${id}/close`); load(); } catch (e) { setError(errorMessage(e)); }
  };

  if (error) return <ErrorMessage error={error} />;
  if (!assignment || !subs) return <Loading />;
  return (
    <>
      <PageHeader title={assignment.title} subtitle={`${assignment.programmingLanguage} assignment, deadline ${fmtDate(assignment.deadline)}`}>
        {isProf ? (
          <>
            <Link className="btn btn-secondary" to={`/assignments/${id}/edit`}>Edit</Link>
            {assignment.status === 'OPEN' && <button className="btn btn-danger" onClick={close}>Close</button>}
            <Link className="btn btn-primary" to={`/assignments/${id}/analysis`}>Plagiarism analysis</Link>
          </>
        ) : assignment.status === 'OPEN' && <Link className="btn btn-primary" to={`/assignments/${id}/submit`}>Submit code</Link>}
      </PageHeader>
      {stats && (isProf ? (() => { const a = stats.byAssignment.find((x) => x._id === id); return a && (
        <StatStrip>
          <StatCard label="Students submitted" value={a.submitted} icon="users" tone="sky" /><StatCard label="Late submissions" value={a.late} icon="clock" tone="amber" />
          <StatCard label="Analyses run" value={a.analysisCount} icon="shield" /><StatCard label="Highest similarity" value={a.analysisCount ? pct(a.maxSimilarity) : '-'} hint={a.analysisCount ? `${a.flaggedPairs} pairs flagged` : 'Not analysed yet'} icon="flag" tone="rose" />
        </StatStrip>); })() : (() => { const a = stats.assignments.find((x) => x._id === id); return a && (
        <StatStrip>
          <StatCard label="Your status" value={a.state === 'SUBMITTED' ? 'Submitted' : a.state === 'PENDING' ? 'To do' : 'Missed'} icon="check" tone={a.state === 'SUBMITTED' ? 'emerald' : a.state === 'PENDING' ? 'amber' : 'rose'} />
          <StatCard label="Your versions" value={a.versions} icon="layers" tone="sky" /><StatCard label="Deadline" value={dueText(a.deadline)} hint={fmtDate(a.deadline)} icon="clock" tone="amber" />
          <StatCard label="Last upload" value={a.lastSubmittedAt ? fmtDate(a.lastSubmittedAt).split(',')[0] : '-'} hint={a.isLate ? 'Marked late' : ''} icon="upload" />
        </StatStrip>); })())}
      <div className="card mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2"><StatusBadge status={assignment.status} />
          {!assignment.allowLateSubmissions && <Badge tone="amber">No late submissions</Badge>}
          {new Date(assignment.deadline) < new Date() && <Badge tone="amber">Deadline passed</Badge>}</div>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{assignment.description || 'No instructions provided.'}</p>
      </div>

      <h2 className="mb-3 text-lg font-semibold">{isProf ? `Latest submission per student (${assignment.submissionCount})` : 'Your submission history'}</h2>
      {subs.length === 0 ? <Empty title="No submissions yet">{isProf ? 'Submissions appear here once students upload code.' : 'Upload your solution before the deadline.'}</Empty> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-slate-200"><tr>{isProf && <th className="th">Student</th>}<th className="th">Version</th><th className="th">File</th><th className="th">Submitted</th><th className="th">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map((s) => (
                  <tr key={s._id}>
                    {isProf && <td className="td font-medium">{s.student?.name}<div className="text-xs font-normal text-slate-500">{s.student?.email}</div></td>}
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
