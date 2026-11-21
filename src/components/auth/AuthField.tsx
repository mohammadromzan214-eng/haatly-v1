import type { InputHTMLAttributes } from "react";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function AuthField({ label, error, id, className = "", ...props }: AuthFieldProps) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-semibold">{label}</span>
      <input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-2 w-full rounded-2xl border bg-paper px-4 py-3 outline-none transition ${error ? "border-clay" : "border-line focus:border-ink"} ${className}`}
      />
      {error && (
        <span id={`${id}-error`} role="alert" className="mt-1.5 block text-xs font-medium text-clay">
          {error}
        </span>
      )}
    </label>
  );
}
