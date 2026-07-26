import { Crown, Vote } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { Character } from "../../types/characterTypes";
import {
  getElectionVoteCounts,
  type GuildElection,
  type GuildRelationInsight,
} from "../../guildRelations/guildRelations";
import { getRacePortraitUrl } from "../../utils";
import BaseModal from "../modals/BaseModal";
import GameButton from "../ui/GameButton";

type Props = {
  election: GuildElection | null;
  roster: Character[];
  insights: GuildRelationInsight[];
  onVote: (candidateId: string) => void;
  onFinish: () => void;
};

export default function GuildElectionModal({
  election,
  roster = [],
  insights = [],
  onVote,
  onFinish,
}: Props) {
  const [revealedVotes, setRevealedVotes] = useState(0);
  const candidateSet = new Set(election?.candidateIds || []);
  const candidates = insights.filter((entry) =>
    candidateSet.has(String(entry.character.id)),
  );
  const counts = useMemo(() => getElectionVoteCounts(election), [election]);
  const totalVotes = election
    ? Object.keys(election.memberVotes).length +
      (election.playerVoteId ? 1 : 0)
    : 0;

  useEffect(() => {
    if (!election || election.status !== "complete") {
      setRevealedVotes(0);
      return undefined;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setRevealedVotes(totalVotes);
      return undefined;
    }
    const interval = window.setInterval(() => {
      setRevealedVotes((current) => {
        if (current >= totalVotes) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 180);
    return () => window.clearInterval(interval);
  }, [election, totalVotes]);

  const revealComplete =
    election?.status === "complete" && revealedVotes >= totalVotes;
  const winner = roster.find(
    (member) => String(member.id) === election?.winnerId,
  );

  return (
    <BaseModal
      isOpen={Boolean(election)}
      onClose={() => undefined}
      ariaLabel="Guild Master election"
      overlayClassName="items-center bg-black/90 backdrop-blur-md"
      panelClassName="wow-modal-panel max-h-[92vh] w-[min(940px,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-amber-600/70 bg-slate-950 shadow-2xl"
    >
      <div className="border-b border-amber-900/60 bg-[radial-gradient(circle_at_top,rgba(180,83,9,0.28),transparent_70%)] p-5 text-center md:p-7">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-amber-500 bg-amber-950 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.22)]">
          <Vote size={28} aria-hidden="true" />
        </div>
        <h2 className="fantasy-font mt-3 text-2xl font-bold text-amber-100 md:text-3xl">
          Election of a New Guild Master
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
          Every guild member has cast a private ballot. Your vote is added to
          the final count.
        </p>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {candidates.map((entry) => {
            const characterId = String(entry.character.id);
            const isWinner =
              revealComplete && characterId === election?.winnerId;
            return (
              <article
                key={characterId}
                className={`rounded-xl border p-4 text-center ${
                  isWinner
                    ? "border-amber-400 bg-amber-950/45 shadow-[0_0_28px_rgba(251,191,36,0.18)]"
                    : "border-slate-700 bg-slate-900/70"
                }`}
              >
                <img
                  src={getRacePortraitUrl(
                    entry.character.race,
                    entry.character.gender,
                  )}
                  alt=""
                  className="mx-auto h-20 w-20 rounded-full border-2 border-slate-600"
                />
                <h3 className="mt-3 font-bold text-slate-100">
                  {entry.character.name}
                </h3>
                <div className="mt-1 text-xs text-slate-500">
                  {entry.character.charClass} · {entry.influence} influence
                </div>
                {election?.status === "awaiting_player_vote" ? (
                  <GameButton
                    tone="primary"
                    fullWidth
                    className="mt-4"
                    onClick={() => onVote(characterId)}
                  >
                    Cast Your Vote
                  </GameButton>
                ) : (
                  <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Ballots
                    </div>
                    <div className="mt-1 text-2xl font-black text-amber-200">
                      {revealComplete
                        ? counts[characterId] || 0
                        : "· · ·"}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {election?.status === "complete" && !revealComplete ? (
          <div className="mt-6 text-center">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
              Counting ballots
            </div>
            <div className="mx-auto mt-3 h-2 max-w-md overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-amber-500 transition-[width] duration-150 motion-reduce:transition-none"
                style={{
                  width: `${totalVotes > 0 ? (revealedVotes / totalVotes) * 100 : 100}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {revealComplete && winner ? (
          <div className="mt-6 rounded-xl border border-amber-500/60 bg-amber-950/25 p-5 text-center">
            <Crown
              size={30}
              className="mx-auto text-amber-300"
              aria-hidden="true"
            />
            <div className="fantasy-font mt-2 text-xl font-bold text-amber-100">
              {winner.name} Wins the Election
            </div>
            <p className="mt-1 text-sm text-slate-400">
              The guild gains +5 morale under its newly elected Guild Master.
            </p>
            <GameButton
              tone="primary"
              size="lg"
              className="mt-4"
              onClick={onFinish}
            >
              Proclaim Guild Master
            </GameButton>
          </div>
        ) : null}
      </div>
    </BaseModal>
  );
}
