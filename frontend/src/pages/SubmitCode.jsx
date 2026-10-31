import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api.js';
import { useStats } from '../context/StatsContext.jsx';
import { Badge, Empty, ErrorMessage, Loading, PageHeader, dueText, fmtDate } from '../components/ui.jsx';

const MAX_BYTES = 256 * 1024; // the server enforces its own limit as well
const EXT = { java: '.java', python: '.py' };

function problemWith(file, text, assignment) {
  if (!file) return '';
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (ext !== EXT[assignment.programmingLanguage]) return `This assignment takes ${EXT[assignment.programmingLanguage]} files, but you chose ${ext || 'a file without an extension'}.`;
  if (file.size > MAX_BYTES) return `The file is ${Math.round(file.size / 1024)} KB. The limit is ${MAX_BYTES / 1024} KB.`;
  if (text !== null && (!text.trim() || text.includes('\0'))) return 'The file is empty or is not plain text.';
  return '';
}

function Receipt({ result, assignment, onAnother }) {
  const s = result;
  return (
    <div className="relative mx-auto max-w-lg">
      <div className="card relative overflow-hidden !p-8">
        <div className="stamp-in absolute right-6 top-6 rotate-[-6deg] rounded border-[3px] border-indigo-600 px-3 py-1 text-lg font-extrabold tracking-wide text-indigo-600">RECEIVED</div>
        <h2 className="text-2xl font-extrabold">Handed in</h2>
        <p className="mt-1 text-sm text-slate-500">Keep this for your records. The same details are in My submissions.</p>
        <dl className="mt-6 divide-y divide-dashed divide-slate-300 text-sm">
          {[['Assignment', assignment.title], ['File', s.originalFilename], ['Version', `v${s.version}`], ['Received', fmtDate(s.submittedAt)]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-ink">{v}</dd></div>
          ))}
          <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">Timing</dt><dd>{s.isLate ? <Badge tone="amber">Marked late</Badge> : <Badge tone="green">On time</Badge>}</dd></div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link className="btn btn-primary" to="/submissions">See my submissions</Link>
          <button className="btn btn-secondary" onClick={onAnother}>Upload another version</button>
        </div>
      </div>
    </div>
  );
}

export function SubmitView({ assignments, selectedId, onSelect, info, file, text, onFile, problem, progress, busy, error, onSubmit, result, onAnother }) {
  const [drag, setDrag] = useState(false);
  const input = useRef(null);
  const assignment = assignments.find((a) => a._id === selectedId);
  if (result && assignment) return <Receipt result={result} assignment={assignment} onAnother={onAnother} />;

  const lines = text ? text.replace(/\r\n?/g, '\n').split('\n') : [];
  const shown = lines.slice(0, 40);
  const nextVersion = (info[selectedId]?.versions || 0) + 1;
  const late = assignment && new Date(assignment.deadline) < new Date();
  return (
    <div className="grid gap-8 xl:grid-cols-[22rem_1fr]">
      <section aria-label="Choose an assignment">
        <h2 className="mb-3 text-sm font-bold text-ink">1. Choose the assignment</h2>
        <ul className="divide-y divide-slate-200 rounded border border-slate-300 bg-white">
          {assignments.map((a) => {
            const done = info[a._id]?.submitted; const active = a._id === selectedId;
            return (
              <li key={a._id}>
                <button type="button" onClick={() => onSelect(a._id)} aria-pressed={active} className={`flex w-full items-start justify-between gap-3 border-l-4 px-4 py-3 text-left transition-colors ${active ? 'border-red-500 bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}>
                  <span className="min-w-0"><span className="block truncate font-semibold">{a.title}</span><span className="block text-xs capitalize text-slate-500">{a.programmingLanguage}, {dueText(a.deadline)}</span></span>
                  {done ? <Badge tone="green">v{info[a._id].versions}</Badge> : <Badge tone="amber">To do</Badge>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Upload your file">
        {!assignment ? <Empty title="Pick an assignment on the left" /> : (
          <>
            <h2 className="mb-3 text-sm font-bold text-ink">2. Add your {EXT[assignment.programmingLanguage]} file</h2>
            <div className="card !p-0">
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-xl font-extrabold">{assignment.title}</h3><span className="text-sm text-slate-500">Deadline {fmtDate(assignment.deadline)}</span></div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{assignment.description || 'No written instructions for this assignment.'}</p>
                {late && <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">The deadline has passed. {assignment.allowLateSubmissions ? 'Your upload will be marked late.' : 'This assignment no longer accepts late work.'}</p>}
              </div>
              <div className="p-5">
                <ErrorMessage error={error} />
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
                  className={`mt-3 flex flex-col items-center rounded border-2 border-dashed px-6 py-10 text-center transition-colors ${drag ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-slate-50'}`}>
                  <p className="font-semibold">{file ? file.name : 'Drop your file here'}</p>
                  <p className="mt-1 text-sm text-slate-500">{file ? `${(file.size / 1024).toFixed(1)} KB, ${lines.length} lines` : `or choose it from your computer. One ${EXT[assignment.programmingLanguage]} file, up to ${MAX_BYTES / 1024} KB.`}</p>
                  <input ref={input} type="file" accept={EXT[assignment.programmingLanguage]} className="sr-only" id="file-input" onChange={(e) => onFile(e.target.files[0])} />
                  <label htmlFor="file-input" className="btn btn-secondary mt-4 cursor-pointer">{file ? 'Choose a different file' : 'Choose file'}</label>
                </div>
                {problem && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{problem}</p>}

                {file && !problem && text !== null && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-semibold">Check it before you send</p>
                    <pre className="max-h-72 overflow-auto rounded border border-slate-300 bg-slate-50 py-2 font-mono text-xs leading-5" aria-label="File preview">
                      {shown.map((l, i) => <div key={i} className="flex"><span className="w-12 shrink-0 select-none pr-3 text-right text-slate-400">{i + 1}</span><code className="whitespace-pre pr-4">{l || ' '}</code></div>)}
                      {lines.length > shown.length && <div className="px-4 pt-1 text-slate-500">…{lines.length - shown.length} more lines</div>}
                    </pre>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                  <p className="text-sm text-slate-500">{info[selectedId]?.submitted ? `You have uploaded v${info[selectedId].versions}. This one will be version ${nextVersion}, and it becomes the one that is checked.` : 'This will be version 1.'}</p>
                  <button className="btn btn-primary !px-6" disabled={!file || !!problem || busy || (late && !assignment.allowLateSubmissions)} onClick={onSubmit}>{busy ? `Uploading ${progress}%` : 'Submit assignment'}</button>
                </div>
                {busy && <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-slate-200"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div>}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function SubmitCode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { stats, reload } = useStats();
  const [assignments, setAssignments] = useState(null);
  const [selectedId, setSelectedId] = useState(id || '');
  const [file, setFile] = useState(null);
  const [text, setText] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get('/assignments', { params: { status: 'OPEN', limit: 100 } })
      .then((r) => { setAssignments(r.data.assignments); setSelectedId((cur) => cur || r.data.assignments[0]?._id || ''); })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  const info = useMemo(() => Object.fromEntries((stats?.assignments || []).map((a) => [a._id, a])), [stats]);
  const assignment = assignments?.find((a) => a._id === selectedId);

  const onFile = async (f) => {
    setError(''); setFile(f || null); setText(null);
    if (f && f.size <= MAX_BYTES) setText(await f.text());
  };
  const onSelect = (sid) => { setSelectedId(sid); setFile(null); setText(null); setError(''); if (id) navigate('/submit', { replace: true }); };
  const problem = assignment ? problemWith(file, text, assignment) : '';

  const onSubmit = async () => {
    setError(''); setBusy(true); setProgress(0);
    const data = new FormData(); data.append('file', file);
    try {
      const res = await api.post(`/assignments/${selectedId}/submissions`, data, { onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded * 100) / e.total)) });
      setResult(res.data.submission); reload();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  if (!assignments) return error ? <ErrorMessage error={error} /> : <Loading />;
  return (
    <>
      <PageHeader title="Submit assignment" subtitle="Pick an open assignment, add your file and check it before you send. Uploading again later creates a new version." />
      {assignments.length === 0 ? <Empty title="Nothing is open for submissions right now">When a professor publishes an assignment it will appear here.</Empty> : (
        <SubmitView assignments={assignments} selectedId={selectedId} onSelect={onSelect} info={info} file={file} text={text} onFile={onFile} problem={problem}
          progress={progress} busy={busy} error={error} onSubmit={onSubmit} result={result} onAnother={() => { setResult(null); setFile(null); setText(null); }} />
      )}
    </>
  );
}
