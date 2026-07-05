import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="font-mono text-sm text-ember-400">404</p>
      <h1 className="text-lg font-semibold text-mist-100">This lesson doesn&apos;t exist</h1>
      <p className="max-w-sm text-[13px] text-mist-400">
        Check the course map on the home page — the lesson may not be published yet.
      </p>
      <Link href="/" className="text-[13px] text-ember-400 underline underline-offset-2">
        Back to the course map
      </Link>
    </div>
  );
}
