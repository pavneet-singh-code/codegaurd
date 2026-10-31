import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import RibbonMap from '../components/RibbonMap.jsx';

const CODE = [
  ['11', 'public int highest() {', false],
  ['12', '    int best = Integer.MIN_VALUE;', true],
  ['13', '    for (int s : scores) {', true],
  ['14', '        if (s > best) best = s;', true],
  ['15', '    }', true],
  ['16', '    return best;', false],
];

function MarkedSheet() {
  return (
    <figure className="relative mx-auto w-full max-w-lg rotate-[1.2deg] rounded border border-slate-300 bg-white p-5 shadow-xl">
      <figcaption className="mb-3 flex items-baseline justify-between text-sm"><span className="font-bold">GradeBook.java</span><span className="text-slate-500">submitted by student A</span></figcaption>
      <div className="relative font-mono text-[13px] leading-6">
        {CODE.map(([n, t, hot]) => (
          <div key={n} className="flex"><span className="w-8 shrink-0 select-none text-right text-slate-400">{n}</span><span className={`ml-4 whitespace-pre ${hot ? 'bg-amber-200/70' : ''}`}>{t}</span></div>
        ))}
        <svg className="pointer-events-none absolute -left-3 top-[22px] h-[112px] w-[calc(100%+18px)]" viewBox="0 0 400 112" preserveAspectRatio="none" aria-hidden="true">
          <path d="M14 12 C 80 2, 300 0, 384 10 C 396 30, 394 86, 380 100 C 300 112, 90 110, 18 102 C 4 84, 6 30, 14 12 Z" fill="none" stroke="#D62839" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="absolute -right-2 -top-7 rotate-3 font-hand text-2xl leading-none text-red-600">same shape, new names?</p>
      <p className="mt-4 border-t border-dashed border-slate-300 pt-3 text-xs text-slate-500">Illustration. In a real report this block is joined to the matching block in the other file.</p>
    </figure>
  );
}

const Chip = ({ kind, children }) => {
  const k = { kw: 'bg-indigo-100 text-indigo-800', id: 'bg-slate-200 text-slate-700', num: 'bg-emerald-100 text-emerald-800', op: 'bg-red-100 text-red-700' }[kind];
  return <span className={`rounded px-1.5 py-0.5 font-mono text-sm ${k}`}>{children}</span>;
};

const STEPS = [
  ['Publish', 'A professor posts an assignment with a language and a deadline.'],
  ['Submit', 'Students upload one file. Each new upload is a new version.'],
  ['Compare', 'The latest version from every student is compared against all the others.'],
  ['Review', 'Pairs above your threshold are marked for review. You read the matches and decide.'],
];
const FEATURES = [
  ['Versions and deadlines', 'Every upload is kept. The server clock decides what is late, and a professor can close an assignment at any time.'],
  ['Names do not matter', 'Variable, method and class names are ignored, as are comments and spacing. Renaming alone does not hide a copy.'],
  ['Structure still does', 'Keywords and operators are kept, so a while loop and a for loop remain different things.'],
  ['Evidence, not a verdict', 'Each flagged pair opens to the exact matching lines in both files, with the matches mapped between them.'],
  ['Private by default', 'Students see only their own work. Professors see only their own assignments. The server enforces both.'],
  ['Offline and inert', 'Detection is plain JavaScript on your own server. Uploaded code is read as text and never executed.'],
];
const TOKENS = [
  ['int total = 0;', [['kw', 'int'], ['id', 'ID'], ['op', '='], ['num', 'NUM'], ['op', ';']]],
  ['sum += value * 2;', [['id', 'ID'], ['op', '+='], ['id', 'ID'], ['op', '*'], ['num', 'NUM'], ['op', ';']]],
  ['count = total - bonus;', [['id', 'ID'], ['op', '='], ['id', 'ID'], ['op', '-'], ['id', 'ID'], ['op', ';']]],
];

export default function Landing() {
  const { user } = useAuth();
  const demo = [{ aTokenStart: 0, bTokenStart: 20, tokenCount: 70 }, { aTokenStart: 110, bTokenStart: 160, tokenCount: 90 }, { aTokenStart: 230, bTokenStart: 80, tokenCount: 40 }];
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-300 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-extrabold tracking-tight">CodeGuard</Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex"><a href="#report" className="hover:text-ink">The report</a><a href="#how" className="hover:text-ink">How it works</a><a href="#detection" className="hover:text-ink">Detection</a></nav>
          <div className="flex items-center gap-2">
            {user ? <Link to="/dashboard" className="btn btn-primary">Open dashboard</Link> : <><Link to="/login" className="px-3 py-2 text-sm font-semibold hover:underline">Sign in</Link><Link to="/register" className="btn btn-primary">Create account</Link></>}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">Read the matches.<br />Make the call.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">CodeGuard collects Java and Python assignments, compares every student's work with everyone else's, and shows you exactly which lines match. It measures similarity. Deciding what it means stays with you.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            {user ? <Link to="/dashboard" className="btn btn-primary !px-6 !py-3 text-base">Open dashboard</Link> : <><Link to="/register" className="btn btn-primary !px-6 !py-3 text-base">Create an account</Link><Link to="/login" className="btn btn-secondary !px-6 !py-3 text-base">Sign in</Link></>}
          </div>
        </div>
        <div className="pt-8"><MarkedSheet /></div>
      </section>

      <section id="report" className="border-y border-slate-300 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">See where two files overlap, not just how much</h2>
            <p className="mt-4 text-slate-600">A single percentage hides the interesting part. The report lays both files side by side and joins every block that matches exactly. A band that slants means the block was moved to a different place. A file that is mostly red is a very different story from one with a single short band.</p>
            <p className="mt-4 text-slate-600">Click any pair to read the matching code in both files, with real line numbers.</p>
          </div>
          <div className="rounded border border-slate-300 bg-paper p-5"><RibbonMap tokenCountA={300} tokenCountB={290} regions={demo} nameA="Student A" nameB="Student B" /><p className="mt-2 text-xs text-slate-500">Illustration with made-up positions.</p></div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">How a course uses it</h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border-t-[3px] border-ink pt-4">
              <span className="font-hand text-3xl leading-none text-red-600">{i + 1}</span>
              <h3 className="mt-1 text-xl font-bold">{t}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-slate-300 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Built to be fair and easy to explain</h2>
          <dl className="mt-12 grid gap-x-16 gap-y-8 md:grid-cols-2">
            {FEATURES.map(([t, d]) => <div key={t} className="border-b border-slate-200 pb-6"><dt className="text-lg font-bold">{t}</dt><dd className="mt-1.5 text-sm leading-6 text-slate-600">{d}</dd></div>)}
          </dl>
        </div>
      </section>

      <section id="detection" className="mx-auto grid max-w-6xl items-start gap-14 px-6 py-24 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">What the detector actually sees</h2>
          <p className="mt-4 text-slate-600">Code is turned into a stream of tokens. Names, numbers and strings are replaced by generic stand-ins; keywords and operators stay. Short runs of tokens are hashed, a small reliable subset is kept, and two files are compared by how many of those fingerprints they share, in both directions.</p>
          <p className="mt-4 text-slate-600">It is a screening aid. Simple assignments produce similar answers all by themselves, which is why nothing here is ever labelled as proven.</p>
        </div>
        <div className="space-y-4 rounded border border-slate-300 bg-white p-6">
          {TOKENS.map(([src, toks]) => (
            <div key={src}><p className="font-mono text-sm text-slate-500">{src}</p><div className="mt-1.5 flex flex-wrap gap-1.5">{toks.map(([k, t], i) => <Chip key={i} kind={k}>{t}</Chip>)}</div></div>
          ))}
        </div>
      </section>

      <section className="bg-ink px-6 py-20 text-center text-white">
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Set up an assignment and see a real report in a few minutes</h2>
        <div className="mt-8"><Link to={user ? '/dashboard' : '/register'} className="btn bg-white !px-6 !py-3 text-base text-ink hover:bg-slate-100">{user ? 'Open dashboard' : 'Create an account'}</Link></div>
      </section>
      <footer className="px-6 py-8 text-center text-sm text-slate-500">CodeGuard, a college project. Similarity is not proof of plagiarism; every flagged pair needs a human review.</footer>
    </div>
  );
}
