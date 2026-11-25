"use client";
import { useCallback, useEffect, useState } from "react";
import { AVATARS, newDeviceId, validateNickname } from "@/lib/game/leaderboard";
import { useProgress } from "../useProgress";
import { useSiteState } from "../SiteState";

type Board = { enabled: boolean; weekId?: string; top?: { rank: number; nickname: string; avatar: string; xp: number }[]; me?: { rank: number; xp: number; nickname: string } | null; error?: boolean };

/** Optional, opt-in, nickname-only weekly board. Deliberately low-key: collapsed by default, never on the home screen. */
export function LeaderboardPanel() {
  const site = useSiteState();
  const { progress, update } = useProgress();
  const pr = progress.profile;
  const [open, setOpen] = useState(false);
  const [nick, setNick] = useState(pr.nickname);
  const [avatar, setAvatar] = useState<string>(pr.avatar);
  const [msg, setMsg] = useState("");
  const [board, setBoard] = useState<Board | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/leaderboard${pr.deviceId ? `?deviceId=${pr.deviceId}` : ""}`, { cache: "no-store" });
      setBoard(await r.json());
    } catch { setBoard({ enabled: true, error: true }); }
  }, [pr.deviceId]);
  useEffect(() => {
    if (!open) return;
    let off = false;
    void fetch(`/api/leaderboard${pr.deviceId ? `?deviceId=${pr.deviceId}` : ""}`, { cache: "no-store" }).then((r) => r.json()).then((j) => { if (!off) setBoard(j); }).catch(() => { if (!off) setBoard({ enabled: true, error: true }); });
    return () => { off = true; };
  }, [open, pr.deviceId]);

  if (site && !site.features.leaderboard) return null;

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const v = validateNickname(nick);
    if (!v.ok) { setMsg(v.reason); return; }
    const deviceId = pr.deviceId || newDeviceId();
    const r = await fetch("/api/leaderboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId, nickname: v.nickname, avatar, xpWeek: progress.xpWeek.xp }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(j.error ?? "Could not join right now."); return; }
    update((p) => ({ ...p, profile: { nickname: v.nickname, avatar, leaderboard: true, deviceId } }));
    setMsg("You are on the board. Only your nickname, avatar and this week's XP are shared.");
    void load();
  }
  async function leave() {
    if (pr.deviceId) await fetch("/api/leaderboard", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: pr.deviceId }) }).catch(() => {});
    update((p) => ({ ...p, profile: { ...p.profile, leaderboard: false } }));
    setMsg("You left the leaderboard and your entry was deleted.");
    void load();
  }

  return (
    <section aria-labelledby="lb" className="box grid gap-3">
      <h2 id="lb" className="text-lg font-semibold"><button className="min-h-11 text-start" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "▾" : "▸"} Class leaderboard (optional)</button></h2>
      {open && (
        <>
          <p className="text-sm text-muted">Resets every week. Only a nickname, avatar and this week&apos;s XP are shared. No names, no roll numbers. You can leave any time. Your best competition is your own last result.</p>
          {pr.leaderboard ? (
            <div className="flex flex-wrap items-center gap-3"><span>{pr.avatar} <strong>{pr.nickname}</strong></span><button className="btn" onClick={leave}>Leave leaderboard</button></div>
          ) : (
            <form onSubmit={join} className="grid gap-2">
              <label className="grid gap-1 text-sm">Nickname (2–16 characters, not your real name or roll number)<input className="btn text-start" value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} /></label>
              <div role="radiogroup" aria-label="Avatar" className="flex flex-wrap gap-1">{AVATARS.map((a) => <button type="button" key={a} role="radio" aria-checked={avatar === a} className={`btn !min-w-11 ${avatar === a ? "border-primary" : ""}`} onClick={() => setAvatar(a)}>{a}</button>)}</div>
              <button className="btn btn-primary w-fit">Join the leaderboard</button>
            </form>
          )}
          {msg && <p role="status" className="text-sm">{msg}</p>}
          {board?.error && <p className="text-muted">The board could not load right now.</p>}
          {board?.enabled && !board.error && (
            <div>
              <h3 className="mb-1 font-semibold">This week {board.weekId}</h3>
              {board.top && board.top.length > 0 ? (
                <ol className="grid gap-1">{board.top.slice(0, 10).map((t) => <li key={t.rank} className="flex justify-between gap-2"><span>{t.rank}. {t.avatar} {t.nickname}</span><span>{t.xp} XP</span></li>)}</ol>
              ) : <p className="text-muted">No one is on the board yet this week.</p>}
              {board.me && <p className="mt-2 text-sm text-muted">You are #{board.me.rank} with {board.me.xp} XP.</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Background sync (no UI): sends the weekly XP at most once a minute while the student has opted in. */
export function LeaderboardSync() {
  const { progress } = useProgress();
  const { leaderboard, deviceId, nickname, avatar } = progress.profile;
  const xp = progress.xpWeek.xp;
  useEffect(() => {
    if (!leaderboard || !deviceId || !nickname) return;
    const t = setTimeout(() => {
      void fetch("/api/leaderboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId, nickname, avatar, xpWeek: xp }) }).catch(() => {});
    }, 20_000);
    return () => clearTimeout(t);
  }, [leaderboard, deviceId, nickname, avatar, xp]);
  return null;
}
