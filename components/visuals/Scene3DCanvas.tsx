"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { arrayCells, type Dims } from "@/lib/visuals/scene3d";

export type SceneState = { scene: "array-layers" | "stack-heap" | "call-stack"; dims: Dims; sel: [number, number, number]; stack: number; heap: number; frames: number; turn: number };

const css = (name: string, fallback: string) => (typeof document === "undefined" ? fallback : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback);

function Turn({ turn, children }: { turn: number; children: React.ReactNode }) {
  const g = useRef<Group>(null);
  const auto = useRef(0);
  useFrame((_, dt) => {
    if (!g.current) return;
    if (document.documentElement.getAttribute("data-motion") !== "reduce") auto.current += dt * 0.22;
    g.current.rotation.y = auto.current + (turn * Math.PI) / 180;
    g.current.rotation.x = 0.38;
  });
  return <group ref={g}>{children}</group>;
}

function Box({ p, s, color, opacity = 1 }: { p: [number, number, number]; s: [number, number, number]; color: string; opacity?: number }) {
  return <mesh position={p}><boxGeometry args={s} /><meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} roughness={0.45} metalness={0.1} /></mesh>;
}

function ArrayLayers({ dims, sel }: { dims: Dims; sel: [number, number, number] }) {
  const [L, R, C] = dims;
  const cells = useMemo(() => arrayCells(dims), [dims]);
  const base = css("--primary", "#22d3ee"), accent = css("--accent", "#a78bfa"), pick = css("--warning", "#facc15");
  return (
    <>
      {cells.map((c) => {
        const isSel = c.l === sel[0] && c.r === sel[1] && c.c === sel[2];
        const inLayer = c.l === sel[0];
        return <Box key={c.flat} p={[(c.c - (C - 1) / 2) * 1.15, ((L - 1) / 2 - c.l) * 1.8, (c.r - (R - 1) / 2) * 1.15]} s={isSel ? [1.1, 0.7, 1.1] : [0.95, 0.45, 0.95]} color={isSel ? pick : inLayer ? base : accent} opacity={inLayer || isSel ? 1 : 0.45} />;
      })}
    </>
  );
}

function Towers({ stack, heap }: { stack: number; heap: number }) {
  const prim = css("--primary", "#22d3ee"), accent = css("--accent", "#a78bfa"), pick = css("--warning", "#facc15");
  const spots: [number, number][] = [[0, 0], [1.3, 0.4], [-0.5, 1.4], [0.9, -1.4]];
  return (
    <>
      <Box p={[-3, -0.35, 0]} s={[3, 0.12, 2.2]} color={css("--border", "#25335c")} />
      {Array.from({ length: stack }, (_, i) => <Box key={`s${i}`} p={[-3, 0.1 + i * 0.62, 0]} s={[2.4, 0.5, 1.5]} color={i === stack - 1 ? pick : prim} />)}
      <Box p={[2.6, -0.35, 0]} s={[4, 0.12, 4]} color={css("--border", "#25335c")} />
      {Array.from({ length: heap }, (_, i) => <Box key={`h${i}`} p={[2.6 + spots[i][0], 0.3, spots[i][1]]} s={[0.9, 0.9, 0.9]} color={accent} />)}
    </>
  );
}

function Tower({ frames }: { frames: number }) {
  const prim = css("--primary", "#22d3ee"), pick = css("--warning", "#facc15");
  return (
    <>
      <Box p={[0, -0.35, 0]} s={[3.6, 0.12, 2.4]} color={css("--border", "#25335c")} />
      {Array.from({ length: frames }, (_, i) => <Box key={i} p={[0, 0.12 + i * 0.7, 0]} s={[3, 0.58, 1.8]} color={i === frames - 1 ? pick : prim} />)}
    </>
  );
}

/** The WebGL part. Loaded only when 3D is allowed (device tier, user setting, WebGL available); otherwise the 2D view is used. */
export default function Scene3DCanvas({ s }: { s: SceneState }) {
  return (
    <Canvas camera={{ position: [0, 3.2, 8.2], fov: 42 }} dpr={[1, 1.5]} style={{ height: 340, borderRadius: 12, background: "var(--code-bg)" }} aria-hidden>
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 8, 6]} intensity={1.4} />
      <Turn turn={s.turn}>
        {s.scene === "array-layers" && <ArrayLayers dims={s.dims} sel={s.sel} />}
        {s.scene === "stack-heap" && <Towers stack={s.stack} heap={s.heap} />}
        {s.scene === "call-stack" && <Tower frames={s.frames} />}
      </Turn>
    </Canvas>
  );
}
