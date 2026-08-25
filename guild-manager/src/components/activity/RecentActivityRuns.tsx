import { Link } from "react-router-dom";

import type { ActivityKind, ActivityRunRecord } from "../../activity/activityHistory";

export default function RecentActivityRuns({ records, kinds, title = "Recent Runs", limit = 8 }: {
  records: ActivityRunRecord[];
  kinds: ActivityKind[];
  title?: string;
  limit?: number;
}) {
  const allowed = new Set(kinds);
  const visible = records.filter((record) => allowed.has(record.kind)).slice(0, limit);
  return (
    <section className="rounded border border-slate-700 bg-slate-900/70 p-4">
      <h3 className="fantasy-font text-xl text-amber-100">{title}</h3>
      <div className="mt-3 space-y-2">
        {visible.length === 0 && (
          <div className="rounded border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-400">No completed runs yet.</div>
        )}
        {visible.map((record) => (
          <Link key={record.id} to={`/home/runs/${encodeURIComponent(record.id)}`} className="flex items-center justify-between gap-3 rounded border border-slate-800 bg-slate-950/70 p-3 transition hover:border-amber-700">
            <span>
              <span className={`block font-bold ${record.outcome === "success" ? "text-emerald-300" : record.outcome === "failure" ? "text-red-300" : "text-amber-200"}`}>{record.name}</span>
              <span className="block text-xs text-slate-400">Day {record.dayIndex + 1} · {record.source} · {record.contentPhase}</span>
            </span>
            <span className="text-xs font-bold uppercase text-amber-200">Details</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
