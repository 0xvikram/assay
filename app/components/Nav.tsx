import Link from "next/link";

export function Mark({ color = "#FFFFFF" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v18" /><path d="M4 7h16" /><path d="M6 7l-3 7a3 3 0 0 0 6 0L6 7z" /><path d="M18 7l-3 7a3 3 0 0 0 6 0l-3-7z" /><path d="M8 21h8" />
    </svg>
  );
}

export default function Nav() {
  return (
    <nav className="nav wrap" style={{ width: "100%" }}>
      <Link href="/" className="wordmark"><Mark /><span>ASSAY</span></Link>
      <div className="nav-links">
        <Link href="/#console">Console</Link>
        <Link href="/#composition">Composition</Link>
        <Link href="/#rails">Rails</Link>
        <Link href="/#receipt">Receipt</Link>
        <Link href="/trail">Ledger</Link>
        <Link href="/architecture">Architecture</Link>
        <a href="/api/openapi">API</a>
      </div>
      <Link href="/#console" className="pill">Check an agent</Link>
    </nav>
  );
}
