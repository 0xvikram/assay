"use client";
import { useState } from "react";
import { FIRST } from "./Console";
import { Arrow } from "./Art";

/** The hero's input is the console's input: submitting scrolls down and asks the console to read that reference. */
export default function HeroCheck() {
  const [ref, setRef] = useState(FIRST);
  return (
    <form
      className="hero-form"
      onSubmit={(e) => {
        e.preventDefault();
        const target = ref.trim();
        if (!target) return;
        document.getElementById("console")?.scrollIntoView({ behavior: "smooth", block: "center" });
        window.dispatchEvent(new CustomEvent("assay:run", { detail: target }));
      }}
    >
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="chain:agentId" aria-label="agent to check, as chain:agentId" spellCheck={false} />
      <button type="submit" className="pill pill-solid"><span>Check an agent</span><Arrow /></button>
    </form>
  );
}
