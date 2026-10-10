"use client";

import { useActionState, useEffect, useId } from "react";
import { track } from "@vercel/analytics";
import { joinWaitlist, type WaitlistState } from "@/app/actions";

const MESSAGES: Record<Exclude<WaitlistState["status"], "idle" | "ok">, string> = {
  invalid: "That email doesn't look right. Check it and try again.",
  busy: "Lots of signups right now. Give it a minute and try again.",
  error: "Something went wrong on our side. Try again, or email support@eatoutbetter.com.",
};

export default function WaitlistForm({
  source,
  tone = "light",
}: {
  /** Which placement this is, for analytics and the waitlist row. */
  source: string;
  tone?: "light" | "dark";
}) {
  const [state, action, pending] = useActionState(joinWaitlist, { status: "idle" });
  const id = useId();
  const dark = tone === "dark";

  useEffect(() => {
    if (state.status === "ok") track("waitlist_join", { placement: source });
  }, [state.status, source]);

  if (state.status === "ok") {
    return (
      <div
        role="status"
        className={`flex items-start gap-3 rounded-2xl p-4 ${
          dark ? "bg-white/10 text-cream" : "bg-green-bg text-green-ink"
        }`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-[15px] leading-relaxed">
          <strong className="font-semibold">You&rsquo;re on the list.</strong> We&rsquo;ll email you the
          day it&rsquo;s on the App Store. Nothing else.
        </p>
      </div>
    );
  }

  const error = state.status !== "idle" ? MESSAGES[state.status] : null;

  return (
    <form action={action} className="w-full" noValidate>
      <input type="hidden" name="source" value={source} />
      {/* Honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label htmlFor={`${id}-email`} className={`mb-2 block text-sm font-medium ${dark ? "text-cream/80" : "text-ink-2"}`}>
        Get it the day it launches
      </label>
      <div
        className={`flex flex-col gap-2 rounded-[22px] p-1.5 sm:flex-row sm:items-center ${
          dark ? "bg-white/10 ring-1 ring-white/15" : "bg-card ring-1 ring-line shadow-[0_8px_30px_-12px_rgb(23_75_68/0.25)]"
        }`}
      >
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : `${id}-help`}
          className={`min-h-12 flex-1 rounded-2xl bg-transparent px-4 text-base outline-none placeholder:opacity-60 focus-visible:outline-none ${
            dark ? "text-cream placeholder:text-cream/60" : "text-ink placeholder:text-ink-2"
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className={`group inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-6 text-[15px] font-semibold transition-[transform,background-color] duration-200 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70 ${
            dark ? "bg-cream text-forest-deep hover:bg-white" : "bg-forest text-on-forest hover:bg-forest-deep dark:hover:bg-leaf"
          }`}
        >
          {pending ? "Adding…" : "Join the waitlist"}
          <svg aria-hidden viewBox="0 0 20 20" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 10h11m-4-4.5L15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <p
        id={error ? `${id}-err` : `${id}-help`}
        role={error ? "alert" : undefined}
        className={`mt-2.5 text-sm ${error ? (dark ? "text-red-200" : "text-red-ink") : dark ? "text-cream/70" : "text-ink-2"}`}
      >
        {error ?? "One email when it launches, nothing else. We never sell or share your address."}
      </p>
    </form>
  );
}
