import Link from "next/link";
import Nav from "./components/Nav";

export default function NotFound() {
  return (
    <main className="dots" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Nav />
      <div className="wrap" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, paddingBottom: 96 }}>
        <div className="eyebrow">404 · not found</div>
        <h1 className="h-display t-h2">Nothing here. <span className="serif">We don&apos;t guess.</span></h1>
        <p className="t-lead" style={{ maxWidth: 520 }}>The page you asked for isn&apos;t registered. The console is.</p>
        <Link href="/#console" className="pill pill-solid" style={{ alignSelf: "flex-start" }}>Check an agent</Link>
      </div>
    </main>
  );
}
