import { Link, useParams } from "react-router-dom";

import { useGameSelector } from "../../app/useGame";

export default function ActivityRunDetailPage() {
  const { runId = "" } = useParams();
  const records = useGameSelector((game) => game.activityHistory.records);
  const record = records.find((entry) => entry.id === decodeURIComponent(runId));
  if (!record) {
    return (
      <section className="rounded-lg border border-red-900 bg-slate-950 p-6">
        <h2 className="fantasy-font text-2xl text-red-200">Run not found</h2>
        <Link to="/home" className="mt-4 inline-block text-amber-200 underline">Return to guild overview</Link>
      </section>
    );
  }
  const backPath = record.kind === "battleground" ? "/home/battlefields" : "/home/dungeon-board";
  return (
    <section className="space-y-4 rounded-lg border border-amber-900/70 bg-slate-950 p-4 shadow-xl md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-900/50 pb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-amber-500">{record.kind} · {record.contentPhase}</div>
          <h2 className="fantasy-font mt-1 text-2xl text-amber-100">{record.name}</h2>
          <p className="text-sm text-slate-400">Day {record.dayIndex + 1} · {record.source} · {record.participants.length} participants</p>
        </div>
        <div className={`rounded border px-3 py-2 text-sm font-bold uppercase ${record.outcome === "success" ? "border-emerald-800 text-emerald-300" : record.outcome === "failure" ? "border-red-800 text-red-300" : "border-amber-800 text-amber-200"}`}>{record.outcome}</div>
      </header>
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <section className="rounded border border-slate-800 bg-black/25 p-3">
            <h3 className="font-bold text-slate-100">Participants</h3>
            <div className="mt-2 space-y-2">
              {record.participants.map((participant) => (
                <div key={participant.id} className="flex justify-between text-sm"><span className="text-slate-200">{participant.name}</span><span className="text-slate-500">{participant.role || "Adventurer"} · Lv {participant.level ?? "?"}</span></div>
              ))}
            </div>
          </section>
          <section className="rounded border border-slate-800 bg-black/25 p-3 text-sm text-slate-300">
            <h3 className="font-bold text-slate-100">Rewards</h3>
            <div className="mt-2">Gold: {record.rewardGold}g</div>
            <div>Items: {record.rewardItemIds.length || "None"}</div>
            {record.details.kind === "battleground" && <div>Honor: {record.details.honorPerParticipant} per participant</div>}
          </section>
        </div>
        <section className="rounded border border-slate-800 bg-black/25 p-3">
          <h3 className="font-bold text-slate-100">Run Timeline</h3>
          <div className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto">
            {record.events.length === 0 && <p className="text-sm text-slate-500">No detailed events recorded.</p>}
            {record.events.map((event) => (
              <div key={event.sequence} className="rounded border border-slate-800 bg-slate-950 p-2 text-sm">
                <span className="mr-2 text-amber-500">#{event.sequence}</span><span className="text-slate-200">{event.label}</span>
                {event.outcome && <span className={event.outcome === "cleared" ? "ml-2 text-emerald-300" : "ml-2 text-red-300"}>{event.outcome}</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
      <Link to={backPath} className="inline-block text-amber-200 underline">Back to {record.kind === "battleground" ? "Battlefields" : "Dungeon Board"}</Link>
    </section>
  );
}
