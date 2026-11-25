"use client";
import type { CodeSample, Visual } from "@/lib/content-schema";
import { SafeBoundary } from "../SafeBoundary";
import dynamic from "next/dynamic";
import { Decision, Match, Pipeline, SwitchSim, Truth } from "./SimpleVisuals";
import { StepTracer } from "./StepTracer";

// Heavy interactive visuals are downloaded only when a lesson actually uses them (keeps every lesson's first load small).
const loading = () => <p className="text-muted" role="status">Loading animation…</p>;
const ArrayVisual = dynamic(() => import("./ArrayVisual").then((m) => m.ArrayVisual), { loading });
const CanvasVisual = dynamic(() => import("./CanvasVisual").then((m) => m.CanvasVisual), { loading });
const MemoryVisual = dynamic(() => import("./MemoryVisual").then((m) => m.MemoryVisual), { loading });
const RecursionVisual = dynamic(() => import("./RecursionVisual").then((m) => m.RecursionVisual), { loading });
const MatrixVisual = dynamic(() => import("./MatrixVisual").then((m) => m.MatrixVisual), { loading });
const PatternVisual = dynamic(() => import("./PatternVisual").then((m) => m.PatternVisual), { loading });
const ResolverVisual = dynamic(() => import("./ResolverVisual").then((m) => m.ResolverVisual), { loading });
const LoopVisual = dynamic(() => import("./LoopVisual").then((m) => m.LoopVisual), { loading });
const Scene3DVisual = dynamic(() => import("./Scene3DVisual").then((m) => m.Scene3DVisual), { loading });
const SortVisual = dynamic(() => import("./SortVisual").then((m) => m.SortVisual), { loading });

export function VisualRenderer({ visual, samples }: { visual: Visual; samples: CodeSample[] }) {
  const traced = samples.find((s) => s.trace);
  return (
    <SafeBoundary what="animation">
      {visual.kind === "pipeline" && <Pipeline v={visual} />}
      {visual.kind === "decision" && <Decision v={visual} />}
      {visual.kind === "truth" && <Truth v={visual} />}
      {visual.kind === "switch" && <SwitchSim v={visual} />}
      {visual.kind === "match" && <Match v={visual} />}
      {visual.kind === "trace" && traced && <StepTracer sample={traced} />}
      {visual.kind === "array" && <ArrayVisual title={visual.title} mode={visual.mode} values={visual.values} target={visual.target} />}
      {visual.kind === "sort" && <SortVisual title={visual.title} algo={visual.algo} values={visual.values} compare={visual.compare} />}
      {visual.kind === "pattern" && <PatternVisual title={visual.title} shape={visual.shape} n={visual.n} />}
      {visual.kind === "matrix" && <MatrixVisual title={visual.title} op={visual.op} a={visual.a} b={visual.b} />}
      {visual.kind === "memory" && <MemoryVisual title={visual.title} cells={visual.cells} steps={visual.steps} />}
      {visual.kind === "recursion" && <RecursionVisual title={visual.title} fn={visual.fn} n={visual.n} m={visual.m} />}
      {visual.kind === "canvas" && (() => { const sm = samples.find((x) => x.id === visual.sampleId); return sm ? <CanvasVisual title={visual.title} sample={sm} /> : <p className="box box-error">Missing sample {visual.sampleId}.</p>; })()}
      {visual.kind === "loop" && <LoopVisual title={visual.title} init={{ loop: visual.loop, start: visual.start, end: visual.end, step: visual.step, cmp: visual.cmp, jump: visual.jump }} />}
      {visual.kind === "scene3d" && <Scene3DVisual title={visual.title} scene={visual.scene} dims={visual.dims} depth={visual.depth} />}
      {visual.kind === "resolver" && <ResolverVisual title={visual.title} overloads={visual.overloads} argTypes={visual.argTypes} />}
    </SafeBoundary>
  );
}
