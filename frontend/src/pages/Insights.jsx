import { Link } from 'react-router-dom';
import { useStats } from '../context/StatsContext.jsx';
import { Empty, ErrorMessage, Loading, PageHeader, Panel, StatCard, StatStrip, StatusBadge, ScoreBar, pct } from '../components/ui.jsx';
import { BarChart, Donut, HBars } from '../components/charts.jsx';

export default function Insights() {
  const { stats, error } = useStats();
  if (!stats) return error ? <ErrorMessage error={error} /> : <Loading />;
  const { totals, similarityBuckets, topPairs, byAssignment } = stats;
  const analysed = byAssignment.filter((a) => a.analysisCount > 0);
  const high = similarityBuckets.slice(8).reduce((n, b) => n + b.count, 0);
  const low = similarityBuckets.slice(0, 3).reduce((n, b) => n + b.count, 0);
  const avgMax = analysed.length ? analysed.reduce((n, a) => n + a.maxSimilarity, 0) / analysed.length : 0;
  return (
    <>
      <PageHeader title="Insights" subtitle="How similar your students' work is, based on the latest analysis of each assignment." />
      {totals.pairsCompared === 0 ? <Empty title="No analysis data yet">Run an analysis on an assignment and the charts will appear here.</Empty> : (
        <>
          <StatStrip>
            <StatCard label="Assignments analysed" value={analysed.length} hint={`of ${totals.assignments}`} icon="shield" />
            <StatCard label="Pairs at 80% or more" value={high} hint="Strongest overlaps" icon="flag" tone="rose" />
            <StatCard label="Pairs under 30%" value={low} hint="Mostly unrelated work" icon="check" tone="emerald" />
            <StatCard label="Avg. highest similarity" value={pct(avgMax)} hint="Per analysed assignment" icon="trend" tone="violet" />
          </StatStrip>
          <div className="grid gap-6 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title="Similarity distribution" subtitle="Number of pairs in each similarity band">
              <BarChart data={similarityBuckets.map((b) => ({ label: `${Math.round(b.from * 100)}%`, value: b.count, color: b.from >= 0.6 ? '#D62839' : b.from >= 0.3 ? '#D99A0B' : '#1F8A5B' }))} height={240} />
              <p className="mt-2 text-xs text-slate-500">Each bar starts at the percentage shown. Most pairs usually cluster at the low end because programs share boilerplate.</p>
            </Panel>
            <Panel title="Flagged versus not flagged" subtitle="Using each analysis' own threshold">
              <Donut caption="pairs" segments={[{ label: 'Review required', value: totals.flaggedPairs, color: '#D99A0B' }, { label: 'Not flagged', value: totals.pairsCompared - totals.flaggedPairs, color: '#1F8A5B' }]} />
            </Panel>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Panel title="Highest similarity by assignment">
              <HBars max={1} items={analysed.map((a) => ({ label: a.title, value: a.maxSimilarity, display: pct(a.maxSimilarity), hint: `${a.flaggedPairs} flagged`, color: a.maxSimilarity >= 0.8 ? 'bg-rose-500' : a.maxSimilarity >= 0.5 ? 'bg-amber-500' : 'bg-emerald-500' }))} />
            </Panel>
            <Panel title="Most similar pairs" subtitle="Across the latest analyses">
              <ul className="divide-y divide-slate-100">
                {topPairs.map((p) => (
                  <li key={p.resultId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0"><Link className="font-medium text-indigo-700 hover:underline" to={`/analyses/${p.analysisId}`}>{p.studentA} and {p.studentB}</Link><p className="truncate text-xs text-slate-500">{p.assignmentTitle}</p></div>
                    <div className="flex items-center gap-3"><ScoreBar value={p.similarityScore} /><StatusBadge status={p.status} /></div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
