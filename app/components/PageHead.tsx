import type { ReactNode } from "react";
import Nav from "./Nav";

/** Every inner page opens the same way: the nav, one duotone image dissolving in from the right, and a numbered heading. */
export default function PageHead({ art, eyebrow, title, lead, children }: { art: string; eyebrow: string; title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head-art" aria-hidden="true"><img src={art} alt="" /></div>
      <Nav />
      <div className="wrap page-head-wrap">
        <div className="page-head-body fade-in">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="h-display t-h2">{title}</h1>
          {lead && <p className="t-lead" style={{ maxWidth: 620 }}>{lead}</p>}
          {children}
        </div>
      </div>
    </header>
  );
}
