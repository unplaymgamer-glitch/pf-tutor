"use client";
import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { cpp } from "@codemirror/lang-cpp";
import { HighlightStyle, bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Theme uses the site's CSS variables so dark/light/system all work without extra code.
const theme = EditorView.theme({
  "&": { backgroundColor: "var(--code-bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "0.95rem" },
  ".cm-content": { fontFamily: "var(--font-code)", caretColor: "var(--primary)", padding: "10px 0" },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--muted)", border: "none" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--text)" },
  "&.cm-focused": { outline: "3px solid var(--primary)" },
  ".cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in srgb, var(--primary) 30%, transparent) !important" },
  ".cm-scroller": { overflow: "auto", maxHeight: "60vh", minHeight: "14rem" },
  ".cm-error-line": { backgroundColor: "color-mix(in srgb, var(--error) 22%, transparent)" },
});
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.modifier], color: "var(--accent)" },
  { tag: [t.string, t.character], color: "var(--success)" },
  { tag: [t.number, t.bool], color: "var(--xp)" },
  { tag: [t.comment], color: "var(--muted)", fontStyle: "italic" },
  { tag: [t.typeName, t.className], color: "var(--primary)" },
  { tag: [t.processingInstruction, t.meta], color: "var(--warning)" },
]);

export type EditorHandle = { getValue: () => string; setValue: (v: string) => void; goToLine: (n: number) => void };

/** Lazy-loaded CodeMirror 6 editor (small, works well on phones). */
export default function CodeEditor({ initial, onChange, handleRef, label }: { initial: string; onChange?: (v: string) => void; handleRef?: React.MutableRefObject<EditorHandle | null>; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initial,
        extensions: [
          lineNumbers(), highlightActiveLine(), drawSelection(), history(), indentOnInput(), bracketMatching(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          cpp(), syntaxHighlighting(highlight), theme,
          EditorState.tabSize.of(4),
          EditorView.contentAttributes.of({ "aria-label": label, spellcheck: "false", autocapitalize: "off", autocorrect: "off" }),
          EditorView.updateListener.of((u) => { if (u.docChanged) onChangeRef.current?.(u.state.doc.toString()); }),
        ],
      }),
    });
    view.current = v;
    // A long program makes the editor scroll: keyboard users must be able to reach the scrolling area (WCAG 2.1.1).
    v.scrollDOM.tabIndex = 0;
    v.scrollDOM.setAttribute("role", "group");
    v.scrollDOM.setAttribute("aria-label", `${label} (scrollable)`);
    if (handleRef) {
      handleRef.current = {
        getValue: () => v.state.doc.toString(),
        setValue: (val) => v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: val } }),
        goToLine: (n) => {
          const line = v.state.doc.line(Math.min(Math.max(1, n), v.state.doc.lines));
          v.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
          v.focus();
        },
      };
    }
    return () => { v.destroy(); view.current = null; if (handleRef) handleRef.current = null; };
    // The editor is created once; later changes go through handleRef.setValue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} dir="ltr" />;
}
