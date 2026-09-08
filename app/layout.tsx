import type { ReactNode } from "react";

export const metadata = {
  title: "Assay",
  description: "Is this agent's reputation real? A paid pre-flight for ERC-8004 agent payments.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", margin: 0, background: "#EFEFEA", color: "#0F2226" }}>
        {children}
      </body>
    </html>
  );
}
