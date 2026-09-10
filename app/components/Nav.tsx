"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "./Art";

const LINKS = [
  { href: "/#console", label: "Console" },
  { href: "/#composition", label: "Composition" },
  { href: "/#rails", label: "Rails" },
  { href: "/trail", label: "Ledger" },
  { href: "/escalate", label: "Step-up" },
  { href: "/architecture", label: "Architecture" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav wrap" style={{ width: "100%" }}>
      <Link href="/" className="wordmark"><Mark /><span>ASSAY</span></Link>
      <div className="nav-links">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={!l.href.startsWith("/#") && path === l.href ? "page" : undefined}>{l.label}</Link>
        ))}
        <a href="/api/openapi">API</a>
      </div>
      <Link href="/#console" className="pill">Check an agent</Link>
    </nav>
  );
}
