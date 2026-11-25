"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CodeSample } from "@/lib/content-schema";
import { BGI_COLORS, SCREEN_H, SCREEN_W, rasterize, runGraphics } from "@/lib/visuals/graphics";
import { CodeBlock } from "../topic/CodeBlock";
import { StepperControls, useStepper } from "./Stepper";

const PAL = BGI_COLORS.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

/** Draws a graphics.h sample on a 640x480 canvas (a simulation of Turbo C++/WinBGIm), with live pointer coordinates. */
export function CanvasVisual({ title, sample }: { title: string; sample: CodeSample }) {
  const [code, setCode] = useState(sample.code);
  const [edit, setEdit] = useState(false);
  const run = useMemo(() => runGraphics(code), [code]);
  const s = useStepper(Math.max(1, run.frames.length), 90);
  const ref = useRef<HTMLCanvasElement>(null);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const frame = useMemo(() => run.frames[Math.min(s.i, run.frames.length - 1)] ?? [], [run.frames, s.i]);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const buf = rasterize(frame, run.bg);
    const img = ctx.createImageData(SCREEN_W, SCREEN_H);
    for (let i = 0; i < buf.length; i++) { const c = PAL[buf[i]]; img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    ctx.font = "16px monospace"; ctx.textBaseline = "top";
    for (const op of frame) if (op.t === "text") { ctx.fillStyle = BGI_COLORS[op.c & 15]; ctx.fillText(op.s, op.x, op.y); }
  }, [frame, run.bg]);

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos([Math.floor(((e.clientX - r.left) / r.width) * SCREEN_W), Math.floor(((e.clientY - r.top) / r.height) * SCREEN_H)]);
  };
  return (
    <div className="grid gap-3">
      <h3 className="font-semibold">{title}</h3>
      <p className="box box-exam text-sm">Simulation: graphics.h runs in Turbo C++ or WinBGIm on a lab PC, not in the browser. This canvas redraws the same calls so you can see what they do.</p>
      {run.frames.length > 1 && <StepperControls s={s} label="animation" />}
      <canvas ref={ref} width={SCREEN_W} height={SCREEN_H} className="w-full max-w-full rounded-lg border border-border" style={{ aspectRatio: `${SCREEN_W} / ${SCREEN_H}`, imageRendering: "pixelated" }}
        role="img" aria-label={`Drawing made by ${sample.title}`} onPointerMove={onMove} onPointerLeave={() => setPos(null)} />
      <p className="font-mono text-sm text-muted" dir="ltr">{pos ? `x = ${pos[0]}, y = ${pos[1]}  (y grows downwards)` : `Move over the screen to read (x, y). The screen is ${SCREEN_W} × ${SCREEN_H}, origin at the top-left.`}</p>
      {run.error && <p role="alert" className="box box-error">The simulator could not draw this: {run.error}</p>}
      {edit ? (
        <label className="grid gap-1 text-sm">Edit the program and watch the drawing change
          <textarea className="code min-h-48 w-full" dir="ltr" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn w-fit" onClick={() => { setCode(sample.code); setEdit(false); }}>Reset to the lesson code</button>
        </label>
      ) : (
        <>
          <CodeBlock code={sample.code} label={sample.title} />
          <button className="btn w-fit" onClick={() => setEdit(true)}>✏️ Edit and redraw</button>
        </>
      )}
    </div>
  );
}
