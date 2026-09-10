"use client";

/** Scrolls to the console and asks it to read `target` — a verdict card becomes a live example. */
export default function RunExample({ target, label }: { target: string; label: string }) {
  return (
    <button
      type="button"
      className="example"
      onClick={() => {
        document.getElementById("console")?.scrollIntoView({ behavior: "smooth", block: "center" });
        window.dispatchEvent(new CustomEvent("assay:run", { detail: target }));
      }}
    >
      {label} →
    </button>
  );
}
