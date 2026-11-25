"use client";

export default function Error({ unstable_retry }: { error: Error; unstable_retry: () => void }) {
  return (
    <div className="box box-warning" role="alert">
      <h1 className="text-xl font-semibold">Something went wrong on this page</h1>
      <p>Your progress is safe on your device. Please try again.</p>
      <button className="btn btn-primary mt-3" onClick={() => unstable_retry()}>Try again</button>
    </div>
  );
}
