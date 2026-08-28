"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type SearchHit = {
  slug: string;
  name: string;
  city: string;
  county: string;
  countyLabel: string;
  hasEmail: boolean;
  hasPhone: boolean;
  claimed: boolean;
  claimedByYou: boolean;
};

type ChannelInfo = {
  available: boolean;
  masked: string | null;
  ready: boolean;
};

type ListingDetail = {
  slug: string;
  name: string;
  city: string;
  countyLabel: string;
  claimed: boolean;
  claimedByYou: boolean;
  channels: {
    email: ChannelInfo;
    phone: ChannelInfo;
  };
};

type Step = "search" | "channel" | "code" | "done";

export function ClaimListingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [channel, setChannel] = useState<"email" | "phone" | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [destinationMasked, setDestinationMasked] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/claim/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  async function selectListing(hit: SearchHit) {
    setError(null);
    setBusy(true);
    try {
      if (hit.claimedByYou) {
        router.push("/onboard");
        return;
      }
      if (hit.claimed) {
        setError("This listing is already claimed. Contact support if that is a mistake.");
        return;
      }
      const res = await fetch(`/api/claim/listing/${encodeURIComponent(hit.slug)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load listing");
      setListing(data);
      setStep("channel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load listing");
    } finally {
      setBusy(false);
    }
  }

  async function startVerify(nextChannel: "email" | "phone") {
    if (!listing) return;
    setBusy(true);
    setError(null);
    setChannel(nextChannel);
    try {
      const res = await fetch("/api/claim/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: listing.slug, channel: nextChannel }),
      });
      const data = await res.json();
      if (data.alreadyClaimed) {
        router.push(data.redirectTo || "/onboard");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Could not send code");
      setVerificationId(data.verificationId);
      setDestinationMasked(data.destinationMasked);
      setCode("");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!verificationId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/claim/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setStep("done");
      router.push(data.redirectTo || "/onboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inner-container _588px _100-tablet">
      <h1 className="mg-bottom-12px">Claim your CCW listing</h1>
      <p className="mg-bottom-20px">
        Find the page that already exists for your business (the sheriff-approved
        listing). We&apos;ll send a one-time code to the <strong>email or phone
        on that listing</strong> — not a new contact you type in.
      </p>

      {error ? (
        <p className="paragraph-small color-red-600 mg-bottom-16px" role="alert">
          {error}
        </p>
      ) : null}

      {step === "search" ? (
        <>
          <label className="field-label" htmlFor="claim-search">
            Search by business name
          </label>
          <div className="buttons-row mg-bottom-16px" style={{ alignItems: "stretch", gap: 8 }}>
            <input
              id="claim-search"
              className="input w-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runSearch();
                }
              }}
              placeholder="e.g. Paladin Tactical"
              autoComplete="organization"
            />
            <button
              type="button"
              className="btn-primary w-button"
              onClick={() => void runSearch()}
              disabled={searching || query.trim().length < 2}
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </div>

          {results.length === 0 && query.trim().length >= 2 && !searching ? (
            <p className="paragraph-small color-neutral-600">
              No listings matched. CarryClass only supports claiming an existing
              sheriff-approved page. If you don&apos;t see yours,{" "}
              <a href="mailto:matthiasseager@gmail.com" className="text-decoration-none">
                contact us
              </a>
              .
            </p>
          ) : null}

          <ul className="mg-bottom-0" style={{ listStyle: "none", padding: 0 }}>
            {results.map((hit) => (
              <li key={hit.slug} className="mg-bottom-12px">
                <button
                  type="button"
                  className="btn-secondary w-button"
                  style={{ width: "100%", textAlign: "left", height: "auto", padding: "12px 16px" }}
                  disabled={busy || (hit.claimed && !hit.claimedByYou)}
                  onClick={() => void selectListing(hit)}
                >
                  <strong>{hit.name}</strong>
                  <span className="paragraph-small color-neutral-600" style={{ display: "block" }}>
                    {hit.city}
                    {hit.countyLabel ? ` · ${hit.countyLabel} County` : ""}
                    {hit.claimed
                      ? hit.claimedByYou
                        ? " · Already claimed by you"
                        : " · Already claimed"
                      : ""}
                    {!hit.hasEmail && !hit.hasPhone
                      ? " · No email/phone on file"
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {step === "channel" && listing ? (
        <>
          <p className="mg-bottom-12px">
            Claiming <strong>{listing.name}</strong>
            {listing.city ? ` (${listing.city}` : ""}
            {listing.countyLabel ? `${listing.city ? ", " : " ("}${listing.countyLabel} County)` : listing.city ? ")" : ""}
          </p>
          <p className="paragraph-small color-neutral-600 mg-bottom-16px">
            Choose how to verify. The code is sent only to the contact on your
            directory / sheriff record.
          </p>
          <div className="buttons-row mg-bottom-16px">
            {listing.channels.email.available ? (
              <button
                type="button"
                className="btn-primary w-button"
                disabled={busy || !listing.channels.email.ready}
                onClick={() => void startVerify("email")}
              >
                Email code to {listing.channels.email.masked}
                {!listing.channels.email.ready ? " (not configured)" : ""}
              </button>
            ) : null}
            {listing.channels.phone.available ? (
              <button
                type="button"
                className="btn-secondary w-button"
                disabled={busy || !listing.channels.phone.ready}
                onClick={() => void startVerify("phone")}
              >
                Text code to {listing.channels.phone.masked}
                {!listing.channels.phone.ready ? " (not configured)" : ""}
              </button>
            ) : null}
          </div>
          {!listing.channels.email.available && !listing.channels.phone.available ? (
            <p className="paragraph-small color-neutral-600 mg-bottom-16px">
              This listing has no email or phone on file.{" "}
              <a href="mailto:matthiasseager@gmail.com" className="text-decoration-none">
                Contact us
              </a>{" "}
              to claim it manually.
            </p>
          ) : null}
          <button
            type="button"
            className="text-decoration-none paragraph-small"
            onClick={() => {
              setStep("search");
              setListing(null);
              setError(null);
            }}
          >
            ← Back to search
          </button>
        </>
      ) : null}

      {step === "code" && listing ? (
        <>
          <p className="mg-bottom-12px">
            Enter the 6-digit code we sent via {channel} to{" "}
            <strong>{destinationMasked}</strong>.
          </p>
          <form onSubmit={(e) => void submitCode(e)}>
            <label className="field-label" htmlFor="claim-code">
              Verification code
            </label>
            <input
              id="claim-code"
              className="input w-input mg-bottom-16px"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              required
            />
            <div className="buttons-row">
              <button
                type="submit"
                className="btn-primary w-button"
                disabled={busy || code.length !== 6}
              >
                {busy ? "Verifying…" : "Verify & claim"}
              </button>
              <button
                type="button"
                className="btn-secondary w-button"
                disabled={busy || !channel}
                onClick={() => channel && void startVerify(channel)}
              >
                Resend code
              </button>
            </div>
          </form>
          <button
            type="button"
            className="text-decoration-none paragraph-small mg-top-16px"
            onClick={() => {
              setStep("channel");
              setVerificationId(null);
              setCode("");
              setError(null);
            }}
          >
            ← Choose a different method
          </button>
        </>
      ) : null}

      {step === "done" ? (
        <p className="mg-bottom-0">Listing claimed. Redirecting to onboarding…</p>
      ) : null}
    </div>
  );
}
