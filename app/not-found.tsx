import Link from "next/link";

export default function NotFound() {
  return (
    <div className="box box-definition">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p>This lesson does not exist (or is not open yet).</p>
      <Link className="btn btn-primary mt-3 inline-flex items-center" href="/">Back to home</Link>
    </div>
  );
}
