import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api.js';
import { ErrorMessage, Loading, PageHeader } from '../components/ui.jsx';

const toLocalInput = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export default function AssignmentForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', programmingLanguage: 'java', deadline: '', allowLateSubmissions: true });
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api.get(`/assignments/${id}`).then((r) => { const a = r.data.assignment; setForm({ title: a.title, description: a.description, programmingLanguage: a.programmingLanguage, deadline: toLocalInput(a.deadline), allowLateSubmissions: a.allowLateSubmissions }); })
      .catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, [id, editing]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    const body = { ...form, deadline: new Date(form.deadline).toISOString() };
    try {
      const res = editing ? await api.put(`/assignments/${id}`, body) : await api.post('/assignments', body);
      navigate(`/assignments/${res.data.assignment._id}`);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  if (loading) return <Loading />;
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={editing ? 'Edit assignment' : 'New assignment'} />
      <form onSubmit={submit} className="card space-y-4">
        <ErrorMessage error={error} />
        <label className="block text-sm font-medium">Title<input className="input mt-1" required minLength={3} value={form.title} onChange={set('title')} /></label>
        <label className="block text-sm font-medium">Instructions<textarea className="input mt-1" rows={5} value={form.description} onChange={set('description')} /></label>
        <label className="block text-sm font-medium">Language
          <select className="input mt-1" value={form.programmingLanguage} onChange={set('programmingLanguage')}><option value="java">Java (.java)</option><option value="python">Python (.py)</option></select></label>
        <label className="block text-sm font-medium">Deadline<input className="input mt-1" type="datetime-local" required value={form.deadline} onChange={set('deadline')} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowLateSubmissions} onChange={set('allowLateSubmissions')} /> Accept late submissions (they are marked late)</label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create assignment'}</button>
      </form>
    </div>
  );
}
