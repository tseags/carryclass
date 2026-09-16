"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { CONTACT_EMAIL } from "@/lib/site-url";
import { ClaimProgress, claimStepToProgress } from "@/components/claim/ClaimProgress";

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

function ClaimFlowError({ message }: { message: string }) {
  return (
    <p
      className="mt-3 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {message}
    </p>
  );
}

export function ClaimListingFlow() {
  const router = useRouter();
  const { session } = useClerk();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  /** Query string that produced the current results (null = no search run yet). */
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [channel, setChannel] = useState<"email" | "phone" | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [destinationMasked, setDestinationMasked] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchedQuery(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/claim/search?q=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Search failed");
          setResults(data.results ?? []);
          setSearchedQuery(q);
          setError(null);
        } catch (err) {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "Search failed");
          setResults([]);
          setSearchedQuery(q);
        } finally {
          if (!controller.signal.aborted) setSearching(false);
        }
      })();
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const trimmedQuery = query.trim();
  const showNoResults =
    trimmedQuery.length >= 2 &&
    !searching &&
    searchedQuery === trimmedQuery &&
    results.length === 0;

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
      // Refresh Clerk session so role metadata is current before onboarding.
      await session?.reload();
      const dest = data.redirectTo || "/onboard";
      window.location.assign(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  const header =
    step === "channel" && listing
      ? {
            title: "Verify it\u2019s you",
          subtitle: (
            <>
              Claiming <strong className="font-semibold text-zinc-700">{listing.name}</strong>
              {listing.city || listing.countyLabel
                ? ` (${[listing.city, listing.countyLabel ? `${listing.countyLabel} County` : null]
                    .filter(Boolean)
                    .join(", ")})`
                : null}
              . We'll send a one-time code to the email or phone already on this listing.
            </>
          ),
        }
      : step === "code" && listing
        ? {
            title: "Enter your code",
            subtitle: (
              <>
                Sent via {channel} to <strong className="font-semibold text-zinc-700">{destinationMasked}</strong>.
              </>
            ),
          }
        : step === "done"
          ? {
              title: "Listing claimed",
              subtitle: "Redirecting you to onboarding…",
            }
          : {
              title: "Claim your CCW listing",
              subtitle:
                "Search for your sheriff-approved listing. We'll verify with the email or phone already on it.",
            };

  const showSmsNote =
    step === "channel" && listing?.channels.phone.available === true;

  return (
    <>
      <ClaimProgress currentStep={claimStepToProgress(step)} />
      <div className="claim-listing-flow rounded-2xl border border-neutral-300/70 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <h1 className="onboard-step-title claim-page-title">{header.title}</h1>
          <p className="claim-flow-subtitle mt-8 text-sm text-zinc-500">{header.subtitle}</p>
        </div>

      {step === "search" ? (
        <>
          <label className="field-label" htmlFor="claim-search">
            Search by business name
          </label>
          <input
            id="claim-search"
            className="input w-input mg-bottom-16px"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Paladin Tactical"
            autoComplete="organization"
            aria-autocomplete="list"
            aria-controls="claim-search-results"
            aria-expanded={results.length > 0}
          />

          {error ? <ClaimFlowError message={error} /> : null}

          {searching && trimmedQuery.length >= 2 ? (
            <p className="paragraph-small color-neutral-600 mg-bottom-16px" aria-live="polite">
              Searching…
            </p>
          ) : null}

          {showNoResults ? (
            <p className="paragraph-small color-neutral-600 mg-bottom-16px">
              No listings matched. You can only claim an existing sheriff-approved
              page. If yours is missing,{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-decoration-none">
                contact us
              </a>
              .
            </p>
          ) : null}

          <ul id="claim-search-results" className="claim-search-results mg-bottom-0">
            {results.map((hit) => (
              <li key={hit.slug}>
                <button
                  type="button"
                  className="claim-search-result border border-[#141413]/30 bg-[#fafafa]"
                  disabled={busy || (hit.claimed && !hit.claimedByYou)}
                  onClick={() => void selectListing(hit)}
                >
                  <strong className="claim-search-result__name">{hit.name}</strong>
                  <span className="claim-search-result__meta paragraph-small">
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
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-decoration-none">
                Contact us
              </a>{" "}
              to claim it manually.
            </p>
          ) : null}
          {showSmsNote ? (
            <p className="mb-4 text-xs leading-relaxed text-zinc-400">
              Text rates may apply. Reply STOP to opt out.{" "}
              <a href="/privacy" className="text-decoration-none">
                Privacy
              </a>{" "}
              ·{" "}
              <a href="/terms" className="text-decoration-none">
                Terms
              </a>
            </p>
          ) : null}
          {error ? <ClaimFlowError message={error} /> : null}
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
          <form onSubmit={(e) => void submitCode(e)}>
            <label className="field-label" htmlFor="claim-code">
              6-digit code
            </label>
            <input
              id="claim-code"
              className="input w-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              required
            />
            {error ? <ClaimFlowError message={error} /> : null}
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
      </div>
    </>
  );
}
