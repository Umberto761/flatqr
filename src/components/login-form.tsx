"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ nextPath = "/app" }: { nextPath?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });
        const payload = (await response.json()) as { error?: string };
        setPending(false);
        if (!response.ok) {
          setError(payload.error ?? "Login fehlgeschlagen.");
          return;
        }
        router.push(nextPath);
        router.refresh();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@atelier.ch"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Beta-Code</Label>
        <Input
          id="code"
          type="password"
          autoComplete="off"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="BETA_ACCESS"
        />
        <p className="text-xs text-muted-foreground">
          Polar-Checkout ist noch nicht angebunden. Lokal gilt der Code aus{" "}
          <code>BETA_ACCESS</code> (Standard: <code>flatqr-beta</code>).
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full bg-black text-white">
        {pending ? "Prüfen…" : "In die Werkstatt"}
      </Button>
    </form>
  );
}
