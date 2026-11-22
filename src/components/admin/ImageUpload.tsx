"use client";

import { useState } from "react";

export function ImageUpload({ value, onChange, label = "Image" }: { value: string; onChange: (value: string) => void; label?: string }) {
  const [error, setError] = useState("");

  function choose(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image files must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
        setError("");
      }
    };
    reader.onerror = () => setError("Could not read the selected image.");
    reader.readAsDataURL(file);
  }

  return (
    <label className="block text-sm font-semibold">{label}
      <input type="file" accept="image/*" onChange={(event) => choose(event.target.files?.[0])} className="mt-2 block w-full text-sm font-normal" />
      {value && <img src={value} alt={`${label} preview`} className="mt-3 size-20 rounded-xl object-cover" />}
      {error && <span role="alert" className="mt-1 block text-xs text-clay">{error}</span>}
      <span className="mt-1 block text-xs font-normal text-muted">Selected image is stored with this record; maximum 2 MB.</span>
    </label>
  );
}
