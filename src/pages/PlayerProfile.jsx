import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CreditCard,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import YoutubeIcon from "../components/YoutubeIcon";
import Avatar from "../components/Avatar";
import MatchesModal from "../components/MatchesModal";
import { SUPER_ADMIN_NAME } from "../lib/admins";
import {
  computeStats,
  computeRanks,
  computePairStats,
  filterByPeriod,
  applyPeriod,
  isAbandoned,
  matchesForPlayer,
  matchesForPair,
  computeVersusStats,
  matchesVersus,
  formatYoutubeUrl,
} from "../lib/ranking";
import Info from "../components/Info";
import { Bar, PeriodTabs } from "./Report";

const RANK_PERIODS = [
  { key: "today", label: "Day", shortLabel: "Day" },
  { key: "sunday", label: "Sunday", shortLabel: "Sun" },
  { key: "week", label: "Week", shortLabel: "Week" },
  { key: "month", label: "Month", shortLabel: "Month" },
  { key: "all", label: "Overall", shortLabel: "All" },
  { key: "custom", label: "Date Range", shortLabel: "Date" },
];

function daysLeft(endDate) {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
}

function wonFor(m, name) {
  const onTeam1 = m.team1.includes(name);
  const team1Won = m.score1 > m.score2;
  return onTeam1 ? team1Won : !team1Won;
}

const PERIOD_CARDS = [
  { key: "today", label: "Today" },
  { key: "sunday", label: "Sunday" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "Overall" },
];

function recordFor(matches, name) {
  let played = 0,
    wins = 0,
    losses = 0;
  for (const m of matches) {
    const onTeam1 = m.team1.includes(name);
    const onTeam2 = m.team2.includes(name);
    if (!onTeam1 && !onTeam2) continue;
    played++;
    const team1Won = m.score1 > m.score2;
    const won = onTeam1 ? team1Won : !team1Won;
    if (won) wins++;
    else losses++;
  }
  return {
    played,
    wins,
    losses,
    winRate: played ? Math.round((wins / played) * 100) : 0,
  };
}

function StatTile({ value, label, color = "text-orange-600", onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`text-center rounded-xl py-3 px-2 bg-slate-50 dark:bg-slate-700/50 w-full ${onClick ? "cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 transition" : ""}`}
    >
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
        {label}
      </p>
    </Tag>
  );
}

function PeriodCard({ label, rec, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border dark:border-slate-700 p-2.5 sm:p-3 w-full cursor-pointer hover:border-orange-200 dark:hover:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition flex flex-col justify-between"
    >
      <div>
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100">
            {rec.played}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            played
          </span>
        </div>
      </div>
      <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-700/60 w-full">
        <p className="text-[11px] text-slate-600 dark:text-slate-300">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {rec.wins}W
          </span>{" "}
          –{" "}
          <span className="text-red-500 dark:text-red-400 font-bold">
            {rec.losses}L
          </span>
        </p>
        <p className="text-xs font-bold text-orange-600 mt-0.5">{rec.winRate}%</p>
      </div>
    </button>
  );
}

function MatchRow({ m, name }) {
  const team1Won = m.score1 > m.score2;
  const onTeam1 = m.team1.includes(name);
  const won = onTeam1 ? team1Won : !team1Won;
  const abandoned = isAbandoned(m);
  return (
    <div
      className={`px-3 py-2 rounded-xl border text-xs ${abandoned ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20" : "dark:border-slate-700"}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-slate-400 dark:text-slate-500 w-16 shrink-0">
          {m.date}
        </span>
        <span
          className={`flex-1 text-right ${team1Won ? "font-bold text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}
        >
          {m.team1.join(" & ")}
        </span>
        <span className="font-bold shrink-0 bg-white dark:bg-slate-700 rounded px-1.5 py-0.5">
          <span
            className={
              team1Won
                ? "text-orange-600"
                : "text-slate-500 dark:text-slate-400"
            }
          >
            {m.score1}
          </span>
          -
          <span
            className={
              !team1Won
                ? "text-orange-600"
                : "text-slate-500 dark:text-slate-400"
            }
          >
            {m.score2}
          </span>
        </span>
        <span
          className={`flex-1 ${!team1Won ? "font-bold text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}
        >
          {m.team2.join(" & ")}
        </span>
        <span
          className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${won ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400"}`}
        >
          {won ? "Won" : "Lost"}
        </span>
        {m.youtubeUrl && (
          <a
            href={formatYoutubeUrl(m.youtubeUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-red-500 hover:text-red-600"
            title="Watch match video"
          >
            <YoutubeIcon size={18} />
          </a>
        )}
      </div>
      {abandoned && (
        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mt-1">
          <AlertTriangle size={10} /> Abandoned
        </p>
      )}
      {m.comment && (
        <p className="text-slate-600 dark:text-slate-300 italic font-medium mt-1">
          "{m.comment}"
        </p>
      )}
    </div>
  );
}

function PlayerCombosCard({ matches, playerName, onDrilldown }) {
  const [tab, setTab] = useState("with"); // "with" | "versus"

  // Partner Combos ("With")
  const pairs = computePairStats(matches).filter((x) =>
    x.players.includes(playerName),
  );
  const partnerOf = (pair) => pair.players.find((n) => n !== playerName);
  const overallWith = pairs.reduce(
    (acc, x) => ({
      played: acc.played + x.played,
      wins: acc.wins + x.wins,
      losses: acc.losses + x.losses,
    }),
    { played: 0, wins: 0, losses: 0 },
  );
  const maxWith = Math.max(1, ...pairs.map((x) => x.played));

  // Opponent Matchups ("Versus")
  const versusList = computeVersusStats(matches, playerName);
  const overallVersus = versusList.reduce(
    (acc, x) => ({
      played: acc.played + x.played,
      wins: acc.wins + x.wins,
      losses: acc.losses + x.losses,
    }),
    { played: 0, wins: 0, losses: 0 },
  );
  const maxVersus = Math.max(1, ...versusList.map((x) => x.played));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          Player Combos
        </h2>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1">
          <button
            type="button"
            onClick={() => setTab("with")}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition ${
              tab === "with"
                ? "bg-slate-900 dark:bg-orange-600 text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <span className="sm:hidden">With</span>
            <span className="hidden sm:inline">With (Partners)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("versus")}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition ${
              tab === "versus"
                ? "bg-slate-900 dark:bg-orange-600 text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <span className="sm:hidden">Versus</span>
            <span className="hidden sm:inline">Versus (Opponents)</span>
          </button>
        </div>
      </div>

      {tab === "with" ? (
        pairs.length === 0 ? (
          <p className="text-slate-400 text-sm">No partner combinations yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <StatTile
                value={pairs.length}
                label="Partners played with"
                color="text-slate-800 dark:text-slate-100"
              />
              <StatTile
                value={overallWith.played}
                label="Total matches"
                onClick={() =>
                  onDrilldown({
                    title: `${playerName} — all matches`,
                    list: matchesForPlayer(matches, playerName),
                  })
                }
              />
              <StatTile
                value={`${overallWith.wins}W – ${overallWith.losses}L`}
                label="Overall record"
                onClick={() =>
                  onDrilldown({
                    title: `${playerName} — all matches`,
                    list: matchesForPlayer(matches, playerName),
                  })
                }
              />
            </div>
            <div className="space-y-2 mb-5">
              {pairs.map((x) => (
                <Bar
                  key={x.players.join("|")}
                  label={`w/ ${partnerOf(x)}`}
                  value={x.played}
                  max={maxWith}
                />
              ))}
            </div>
            <div className="space-y-1.5 max-h-[22rem] overflow-y-auto pr-1">
              {pairs.map((x) => {
                const partner = partnerOf(x);
                return (
                  <button
                    key={x.players.join("|")}
                    type="button"
                    onClick={() =>
                      onDrilldown({
                        title: `${playerName} & ${partner} together`,
                        list: matchesForPair(matches, [playerName, partner]),
                      })
                    }
                    className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg border dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      w/ {partner}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {x.played} played ·{" "}
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {x.wins}W
                      </span>{" "}
                      –{" "}
                      <span className="text-red-500 dark:text-red-400 font-bold">
                        {x.losses}L
                      </span>{" "}
                      · <span className="text-orange-600 font-bold">{x.winRate}%</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )
      ) : (
        versusList.length === 0 ? (
          <p className="text-slate-400 text-sm">No opponent matches yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <StatTile
                value={versusList.length}
                label="Opponents faced"
                color="text-slate-800 dark:text-slate-100"
              />
              <StatTile
                value={overallVersus.played}
                label="Total matchups"
                onClick={() =>
                  onDrilldown({
                    title: `${playerName} — all matches`,
                    list: matchesForPlayer(matches, playerName),
                  })
                }
              />
              <StatTile
                value={`${overallVersus.wins}W – ${overallVersus.losses}L`}
                label="Overall vs record"
                onClick={() =>
                  onDrilldown({
                    title: `${playerName} — all matches`,
                    list: matchesForPlayer(matches, playerName),
                  })
                }
              />
            </div>
            <div className="space-y-2 mb-5">
              {versusList.map((x) => (
                <Bar
                  key={x.opponent}
                  label={`vs ${x.opponent}`}
                  value={x.played}
                  max={maxVersus}
                />
              ))}
            </div>
            <div className="space-y-1.5 max-h-[22rem] overflow-y-auto pr-1">
              {versusList.map((x) => (
                <button
                  key={x.opponent}
                  type="button"
                  onClick={() =>
                    onDrilldown({
                      title: `${playerName} vs ${x.opponent}`,
                      list: matchesVersus(matches, playerName, x.opponent),
                    })
                  }
                  className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg border dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    vs {x.opponent}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {x.played} played ·{" "}
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {x.wins}W
                    </span>{" "}
                    –{" "}
                    <span className="text-red-500 dark:text-red-400 font-bold">
                      {x.losses}L
                    </span>{" "}
                    · <span className="text-orange-600 font-bold">{x.winRate}%</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}

export default function PlayerProfile({
  playerName,
  players,
  matches,
  slots,
  dues,
  onBack,
}) {
  const [drilldown, setDrilldown] = useState(null);
  const [rankPeriod, setRankPeriod] = useState("today");
  const [rankFrom, setRankFrom] = useState("");
  const [rankTo, setRankTo] = useState("");
  const playerObj = players.find(
    (p) => (typeof p === "string" ? p : p.name) === playerName,
  );
  const photo = typeof playerObj === "object" ? playerObj.photo : undefined;
  const isSuperAdminPlayer = playerName === SUPER_ADMIN_NAME;
  const showsAsAdmin =
    isSuperAdminPlayer ||
    (typeof playerObj === "object" && playerObj.role === "admin");

  const slot = slots?.find(
    (s) => s.name?.trim().toLowerCase() === playerName.trim().toLowerCase(),
  );
  const slotDays = slot ? daysLeft(slot.endDate) : null;
  const due = dues?.find((d) => d.name === playerName);

  const overall = recordFor(matches, playerName);
  const winRate = overall.winRate;
  const [rankRow] = computeStats(matches, players, 1).filter(
    (s) => s.name === playerName,
  );

  const playerMatches = matchesForPlayer(matches, playerName);
  const abandonedMatches = playerMatches.filter(isAbandoned);
  const abandonedCount = abandonedMatches.length;
  const recent = playerMatches.slice(0, 15);

  const periodRecords = PERIOD_CARDS.map((p) => ({
    ...p,
    rec: recordFor(filterByPeriod(matches, p.key), playerName),
  }));

  // Ranking: this player's rank/win% for the selected period, reusing
  // Report.jsx's period-tabs UI and the same 3-match qualify rule as
  // Leaderboard/TopSeeds.
  const rankPeriodMatches = applyPeriod(matches, rankPeriod, rankFrom, rankTo);
  const rankMinMatches = rankPeriod === "today" ? 1 : 3;
  const rankStats = computeStats(rankPeriodMatches, players, rankMinMatches);
  const ranks = computeRanks(rankStats);
  const myStatIdx = rankStats.findIndex((s) => s.name === playerName);
  const myStat = myStatIdx === -1 ? null : rankStats[myStatIdx];
  const myRank = myStatIdx === -1 ? null : ranks[myStatIdx];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Profile Card: Avatar, Name, Role, Court Slot & Dues */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <Avatar name={playerName} photo={photo} size="xl" />
          <div className="flex-1 min-w-[10rem]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {playerName}
              </h1>
              {showsAsAdmin ? (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 rounded-full">
                  <ShieldCheck size={10} /> Admin
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded-full">
                  Contributor
                </span>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
              <CalendarClock size={13} className="text-orange-500 shrink-0" />
              {slot ? (
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span>Court slot renews</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {slot.endDate}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      slotDays < 10
                        ? "bg-red-500 text-white"
                        : "bg-orange-600 text-white"
                    }`}
                  >
                    {slotDays < 0
                      ? `Expired ${-slotDays}d ago`
                      : slotDays === 0
                        ? "Due today"
                        : `${slotDays}d left`}
                  </span>
                </span>
              ) : (
                "No active court slot"
              )}
            </p>
            {rankRow?.qualified && (
              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <Trophy size={13} className="text-orange-500" />{" "}
                {rankRow.winRate}% overall win rate
              </p>
            )}
            {due && (
              <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <CreditCard size={13} className="text-orange-500" />
                Party dues:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {due.count}
                </span>
                {due.comment && (
                  <span className="text-slate-400">— {due.comment}</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ranking Section (Directly below the pic) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Ranking
          </h2>
          <Info />
        </div>
        <PeriodTabs
          period={rankPeriod}
          onPeriod={setRankPeriod}
          from={rankFrom}
          to={rankTo}
          onFrom={setRankFrom}
          onTo={setRankTo}
          periods={RANK_PERIODS}
          isMobileShort
        />
        {!myStat || myStat.played === 0 ? (
          <p className="text-slate-400 text-sm">No matches in this range.</p>
        ) : (
          <div className="flex items-center gap-4">
            <span
              className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${myRank === 1 ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}
            >
              {myRank ?? "NA"}
            </span>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {myStat.wins}W – {myStat.losses}L · {myStat.played} played
              </p>
              <p className="text-lg font-extrabold text-orange-600">
                {myStat.winRate}% win rate
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Total Sections: 4 Stat Tiles */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-3">
          Total Record
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            value={overall.played}
            label="Total Played"
            color="text-slate-800 dark:text-slate-100"
            onClick={() =>
              setDrilldown({
                title: `${playerName} — all matches`,
                list: playerMatches,
              })
            }
          />
          <StatTile
            value={overall.wins}
            label="Total Wins"
            color="text-emerald-600 dark:text-emerald-400"
            onClick={() =>
              setDrilldown({
                title: `${playerName} — wins`,
                list: playerMatches.filter((m) => wonFor(m, playerName)),
              })
            }
          />
          <StatTile
            value={overall.losses}
            label="Total Losses"
            color="text-red-500 dark:text-red-400"
            onClick={() =>
              setDrilldown({
                title: `${playerName} — losses`,
                list: playerMatches.filter((m) => !wonFor(m, playerName)),
              })
            }
          />
          <StatTile
            value={`${winRate}%`}
            label="Win Rate"
            onClick={() =>
              setDrilldown({
                title: `${playerName} — all matches`,
                list: playerMatches,
              })
            }
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-3">
          Activity Breakdown
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {periodRecords.map((p) => (
            <PeriodCard
              key={p.key}
              label={p.label}
              rec={p.rec}
              onClick={() =>
                setDrilldown({
                  title: `${playerName} — ${p.label}`,
                  list: matchesForPlayer(
                    filterByPeriod(matches, p.key),
                    playerName,
                  ),
                })
              }
            />
          ))}
        </div>
      </div>

      <PlayerCombosCard
        matches={matches}
        playerName={playerName}
        onDrilldown={setDrilldown}
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Recent Matches
          </h2>
          {abandonedCount > 0 && (
            <button
              type="button"
              onClick={() =>
                setDrilldown({
                  title: `${playerName} — abandoned matches`,
                  list: abandonedMatches,
                })
              }
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition"
            >
              <AlertTriangle size={11} /> {abandonedCount} abandoned
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
          {recent.length === 0 ? (
            <p className="text-slate-400 text-center py-4 text-sm">
              No matches yet.
            </p>
          ) : (
            recent.map((m) => <MatchRow key={m.id} m={m} name={playerName} />)
          )}
        </div>
      </div>

      {drilldown && (
        <MatchesModal
          title={drilldown.title}
          matches={drilldown.list}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}
