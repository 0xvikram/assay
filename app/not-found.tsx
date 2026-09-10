import Link from "next/link";
import PageHead from "./components/PageHead";
import Footer from "./components/Footer";
import { Arrow } from "./components/Art";

export default function NotFound() {
  return (
    <main>
      <PageHead art="/brand/eye.webp" eyebrow="404 · not found" title={<>Nothing here. <span className="serif">We don&apos;t guess.</span></>} lead="The page you asked for isn't registered. The console is.">
        <Link href="/#console" className="pill pill-solid" style={{ alignSelf: "flex-start" }}><span>Check an agent</span><Arrow /></Link>
      </PageHead>
      <Footer />
    </main>
  );
}
