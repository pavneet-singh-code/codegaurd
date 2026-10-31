import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Panel } from '../components/ui.jsx';

const FAQ = [
  ['Does a high score mean someone cheated?', 'No. It means two files are structurally alike. Short or tightly specified assignments often produce similar code on their own. Always read the matching regions before drawing a conclusion.'],
  ['Why do renamed variables not lower the score?', 'Identifiers, numbers and strings are replaced by generic tokens before comparison, while keywords and operators are kept. Renaming alone therefore changes nothing.'],
  ['What is the difference between similarity, Jaccard and coverage?', 'Coverage A is the share of A\'s fingerprints also found in B (and the reverse for B). Similarity is the larger of the two, which still catches a copy padded with extra code. Jaccard is shared fingerprints divided by all distinct fingerprints in both files.'],
  ['What do k-gram size and window do?', 'The k-gram size is how many tokens make one fingerprint (default 5). The window controls how many fingerprints are kept (default 4). Larger k-grams are stricter; a smaller window keeps more fingerprints and is more sensitive.'],
  ['Which version of a submission is analysed?', 'Only the latest version from each student. Older versions are kept in the history but never counted as separate students.'],
  ['Who can see my code?', 'Only you and the professor who owns the assignment. Uploaded files are stored under random names and are never run.'],
];

export default function Help() {
  const { user } = useAuth();
  const steps = user.role === 'PROFESSOR'
    ? ['Create an assignment with a language and a deadline.', 'Wait for students to submit, or open the assignment to see who has.', 'Choose Plagiarism analysis, set a threshold and run it.', 'Open the report, sort by similarity and use Compare code on a row.', 'Download the CSV if you need to keep a record.']
    : ['Open Assignments and pick one that is still open.', 'Upload a single file in the required language.', 'Need to fix something? Upload again; it becomes a new version.', 'Check Progress to see deadlines and how many uploads you made.'];
  return (
    <>
      <PageHeader title="Help & guide" subtitle="Quick answers about how CodeGuard works." />
      <div className="grid max-w-5xl gap-6">
        <Panel title={user.role === 'PROFESSOR' ? 'Professor quick start' : 'Student quick start'}>
          <ol className="space-y-3">{steps.map((s, i) => <li key={s} className="flex gap-3 text-sm text-slate-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>{s}</li>)}</ol>
        </Panel>
        <Panel title="Frequently asked questions">
          <div className="divide-y divide-slate-100">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-3"><summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:hidden">{q}</summary><p className="mt-2 text-sm leading-6 text-slate-600">{a}</p></details>
            ))}
          </div>
        </Panel>
        <Panel title="Limits to keep in mind">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            <li>Only single .java and .py files are accepted.</li>
            <li>Starter code given to the whole class will match across students.</li>
            <li>Reordering methods or rewriting a loop as recursion can hide a copy from this method.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
