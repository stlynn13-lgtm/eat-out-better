"use client";

import { useState } from "react";
import { content } from "@/content";

type Status = "idle" | "error" | "done";

/**
 * Placeholder early-access signup form. It validates and shows a success state but does
 * NOT persist or send the email anywhere yet. Wire `submit` to a real backend
 * (Supabase table or an API route) before launch.
 */
export default function Waitlist({ id = "waitlist" }: { id?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus("error");
      return;
    }
    // TODO: POST to the waitlist backend. Intentionally a no-op for now.
    setStatus("done");
  }

  if (status === "done") {
    return (
      <p
        role="status"
        className="rounded-xl border border-brand-600/30 bg-brand-50 px-5 py-4 text-base font-medium text-brand-900"
      >
        {content.form.success}
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-md" id={id}>
      <label htmlFor={`${id}-email`} className="mb-2 block text-sm font-semibold">
        {content.form.label}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          aria-invalid={status === "error"}
          aria-describedby={`${id}-help`}
          placeholder="you@example.com"
          className="h-12 min-w-0 flex-1 rounded-xl border border-brand-900/25 bg-white px-4 text-base text-brand-900 placeholder:text-brand-900/50 focus:border-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
        <button
          type="submit"
          className="h-12 cursor-pointer rounded-xl bg-brand-900 px-6 text-base font-semibold text-white transition-colors duration-200 hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          {content.cta}
        </button>
      </div>
      <p
        id={`${id}-help`}
        role={status === "error" ? "alert" : undefined}
        className={`mt-2 text-sm ${status === "error" ? "text-score-red" : "text-brand-900/70"}`}
      >
        {status === "error"
          ? content.form.error
          : content.form.help}
      </p>
    </form>
  );
}
