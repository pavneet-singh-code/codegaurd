import { Link } from 'react-router-dom';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        <Link to="/" className="text-xl font-extrabold tracking-tight">CodeGuard</Link>
        <div>
          <p className="font-hand text-3xl text-red-300 -rotate-2">flagged is not guilty.</p>
          <h2 className="mt-4 max-w-md text-4xl font-extrabold leading-tight tracking-tight">Every flagged pair ends with a person reading the code.</h2>
          <p className="mt-4 max-w-md text-slate-300">CodeGuard shows where two submissions match, line by line. What it means is for you to decide.</p>
        </div>
        <p className="text-sm text-slate-400">Java and Python. Runs offline. Never executes student code.</p>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 block text-xl font-extrabold tracking-tight lg:hidden">CodeGuard</Link>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mb-6 mt-1.5 text-sm text-slate-500">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}
