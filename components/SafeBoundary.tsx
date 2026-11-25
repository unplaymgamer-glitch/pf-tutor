"use client";
import { Component, ReactNode } from "react";
import { reportError } from "./track";

/** Wrap every 3D / animation / runner widget. A crash shows a friendly fallback and never blocks the lesson. */
export class SafeBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; what?: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    // Privacy-safe: message only, no user data. Also sent to /api/report (aggregate error log for the admin Health panel).
    console.warn("widget failed:", this.props.what ?? "unknown", error.message);
    reportError(this.props.what ?? "widget", error.message);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      this.props.fallback ?? (
        <div role="status" className="box box-warning">
          <p>This {this.props.what ?? "interactive part"} could not load, but the lesson text below still works.</p>
          <p className="text-sm text-muted">Try reloading the page. If it keeps happening, tell your instructor.</p>
        </div>
      )
    );
  }
}
