"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "./ui";

export function ScreenshotInput({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );
  const [error, setError] = useState("");
  useEffect(
    () => () => previews.forEach((url) => URL.revokeObjectURL(url)),
    [previews],
  );
  function update(next: File[]) {
    if (
      next.some(
        (f) => !["image/png", "image/jpeg", "image/webp"].includes(f.type),
      ) ||
      next.reduce((s, f) => s + f.size, 0) > 4 * 1024 * 1024
    ) {
      setError("Use PNG, JPEG, or WebP images, up to 4 MB total per section.");
      next = files;
    } else setError("");
    const transfer = new DataTransfer();
    next.forEach((f) => transfer.items.add(f));
    if (input.current) input.current.files = transfer.files;
    setFiles(next);
  }
  return (
    <div
      className="mt-5 rounded-lg border border-dashed p-4"
      tabIndex={0}
      role="group"
      aria-label={label}
      onPaste={(event) => {
        const pasted = Array.from(event.clipboardData.items)
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile())
          .filter((f): f is File => f !== null);
        if (pasted.length) {
          event.preventDefault();
          update([...files, ...pasted]);
        }
      }}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className="my-2 text-xs text-muted">
        Click here and paste a copied image with ⌘V / Ctrl+V, or choose files.
        Images save when you save the trade. Up to 4 MB per section.
      </p>
      <input
        ref={input}
        aria-label={label}
        type="file"
        name={name}
        multiple
        accept="image/png,image/jpeg,image/webp"
        className="max-w-full text-xs"
        onChange={(event) =>
          update([...files, ...Array.from(event.target.files ?? [])])
        }
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-negative">
          {error}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        {files.map((file, i) => (
          <div key={`${file.name}-${i}`}>
            {previews[i] && (
              <Image
                src={previews[i]}
                alt={`${label} preview ${i + 1}`}
                width={320}
                height={200}
                unoptimized
                className="h-28 w-full rounded border object-contain"
              />
            )}
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
              onClick={() => update(files.filter((_, index) => index !== i))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
