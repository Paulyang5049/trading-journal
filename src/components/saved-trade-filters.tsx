"use client";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, X } from "lucide-react";
import { Button, Input } from "./ui";

type Preset = { name: string; query: string };
const key = "journal.trade-filters.v1";
const allowed = [
  "q",
  "trash",
  "account",
  "asset",
  "strategy",
  "status",
  "review",
  "from",
  "to",
  "exitDate",
];
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("journal-filters-changed", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("journal-filters-changed", onChange);
  };
}
export function SavedTradeFilters({ query }: { query: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  let presets: Preset[] = [];
  try {
    const saved: unknown = JSON.parse(raw);
    if (Array.isArray(saved))
      presets = saved
        .filter(
          (p) => typeof p?.name === "string" && typeof p?.query === "string",
        )
        .slice(0, 12);
  } catch {
    /* Ignore corrupt browser storage. */
  }
  function store(next: Preset[]) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event("journal-filters-changed"));
      setMessage("");
    } catch {
      setMessage("Your browser could not save this view.");
    }
  }
  function clean(value: string) {
    const incoming = new URLSearchParams(value);
    return new URLSearchParams(
      [...incoming].filter(([k]) => allowed.includes(k)),
    ).toString();
  }
  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-2 text-xs font-medium text-muted">
          <Bookmark size={14} />
          Saved views
        </span>
        {presets.map((p) => (
          <div
            key={p.name}
            className="flex items-center rounded-full border bg-surface"
          >
            <button
              type="button"
              className="px-3 py-1.5 text-xs hover:text-primary"
              onClick={() => router.push("/trades?" + clean(p.query))}
            >
              {p.name}
            </button>
            <button
              type="button"
              className="pr-2 text-muted hover:text-negative"
              aria-label={`Remove saved view ${p.name}`}
              onClick={() => store(presets.filter((v) => v.name !== p.name))}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const label = name.trim();
            if (!label) return;
            store([
              ...presets.filter((p) => p.name !== label).slice(-11),
              { name: label, query: clean(query) },
            ]);
            setName("");
          }}
        >
          <Input
            className="h-8 w-36 text-xs"
            aria-label="Saved view name"
            placeholder="Name this view"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button className="h-8 text-xs" variant="secondary" type="submit">
            Save view
          </Button>
        </form>
      </div>
      <p className="mt-2 text-xs text-muted">
        {message || "Saves the applied filters in this browser."}
      </p>
    </div>
  );
}
