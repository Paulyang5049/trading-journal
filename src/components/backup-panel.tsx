"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ShieldCheck, Upload } from "lucide-react";
import { Button, Card, Input } from "./ui";

export function BackupPanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Card id="backup">
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
          <ShieldCheck size={22} />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Keep your journal safe</h2>
          <p className="mt-1 text-sm text-muted">
            One file with your accounts, trades, reviews, capital history and
            screenshots. Includes trades in Trash.
          </p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-surface-2/40 p-4">
          <h3 className="font-medium">Download a full backup</h3>
          <p className="my-3 text-xs leading-5 text-muted">
            Keep a copy before moving to another Mac or making big changes.
            Saved filter views stay in your browser.
          </p>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              setError(false);
              try {
                const response = await fetch("/api/backup");
                if (!response.ok)
                  throw new Error((await response.json()).error);
                download(
                  await response.blob(),
                  `trading-journal-${new Date().toISOString().slice(0, 10)}.json`,
                );
                setMessage("Backup downloaded.");
              } catch (e) {
                setError(true);
                setMessage(e instanceof Error ? e.message : "Backup failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Download size={15} />
            Download backup
          </Button>
        </div>
        <form
          className="rounded-xl border p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const file = fileInput.current?.files?.[0];
            if (!file || !confirmed) return;
            setBusy(true);
            setMessage("");
            setError(false);
            try {
              if (file.size > 50 * 1024 * 1024)
                throw new Error("Choose a backup smaller than 50 MB.");
              const response = await fetch("/api/backup", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Journal-Restore": "confirmed",
                },
                body: file,
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              setMessage(
                `Restored ${result.trades} trades and ${result.images} screenshots. Safety copy saved in backups/${result.safetyName}.`,
              );
              setConfirmed(false);
              if (fileInput.current) fileInput.current.value = "";
              router.refresh();
            } catch (e) {
              setError(true);
              setMessage(e instanceof Error ? e.message : "Restore failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3 className="font-medium">Restore a backup</h3>
          <label className="mt-3 block text-xs text-muted">
            Backup file (JSON, up to 50 MB)
            <Input
              aria-label="Backup file"
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              required
              className="mt-2 h-auto py-2"
            />
          </label>
          <label className="my-3 flex items-start gap-2 text-xs leading-5 text-muted">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              required
              className="mt-1"
            />
            Replace this journal with the backup. A safety copy of the current
            journal will be saved first.
          </label>
          <Button
            type="submit"
            variant="secondary"
            disabled={busy || !confirmed}
          >
            <Upload size={15} />
            {busy ? "Working…" : "Restore backup"}
          </Button>
        </form>
      </div>
      {message && (
        <p
          role={error ? "alert" : "status"}
          className={`mt-4 break-words text-sm ${error ? "text-negative" : "text-positive"}`}
        >
          {message}
        </p>
      )}
    </Card>
  );
}
