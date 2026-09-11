"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

export function LoginForm({ nextPath = "/app" }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="du@atelier.ch"
          className="h-11 w-full border border-[#c5c9d0] bg-white px-3 text-sm outline-none focus:border-[#0d1b2a]"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="code" className="text-sm font-medium">
          Beta-Code
        </label>
        <input
          id="code"
          name="code"
          type="password"
          autoComplete="off"
          required
          placeholder="BETA_ACCESS"
          className="h-11 w-full border border-[#c5c9d0] bg-white px-3 text-sm outline-none focus:border-[#0d1b2a]"
        />
        <p className="text-xs text-muted-foreground">
          Polar-Checkout ist noch nicht angebunden. Lokal gilt der Code aus{" "}
          <code>BETA_ACCESS</code> (Standard: <code>flatqr-beta</code>).
        </p>
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-black text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Prüfen…" : "In die Werkstatt"}
      </button>
    </form>
  );
}
