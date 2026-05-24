"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/ToastProvider";
import { trackEvent } from "@/lib/analytics";

type SaveHeartButtonProps = {
  vendorId: string;
  initialSaved?: boolean;
  className?: string;
  size?: "sm" | "md";
  onSavedChange?: (saved: boolean) => void;
  showFilledWhenSaved?: boolean;
  colorVariant?: "default" | "burnt";
};

const sizeClasses: Record<NonNullable<SaveHeartButtonProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
};

export function SaveHeartButton({
  vendorId,
  initialSaved = false,
  className = "",
  size = "sm",
  onSavedChange,
  showFilledWhenSaved = true,
  colorVariant = "default",
}: SaveHeartButtonProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { showToast } = useToast();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsSaved(initialSaved);
  }, [initialSaved]);

  function getReturnUrl() {
    if (typeof window === "undefined") return "/instructors";
    return `${window.location.pathname}${window.location.search}`;
  }

  async function toggleSaved() {
    if (isLoading) return;

    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(getReturnUrl())}`);
      return;
    }

    const nextSaved = !isSaved;
    setIsLoading(true);
    setIsSaved(nextSaved);
    onSavedChange?.(nextSaved);

    try {
      const res = await fetch(
        nextSaved ? "/api/saved-vendors" : `/api/saved-vendors/${vendorId}`,
        {
          method: nextSaved ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: nextSaved ? JSON.stringify({ vendorId }) : undefined,
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/sign-in?redirect_url=${encodeURIComponent(getReturnUrl())}`);
          return;
        }
        if (res.status === 409 && nextSaved) {
          setIsSaved(true);
          showToast("Saved listing");
          return;
        }
        setIsSaved(!nextSaved);
        onSavedChange?.(!nextSaved);
        showToast("Could not update listing", "error");
        return;
      }

      showToast(nextSaved ? "Saved listing" : "Removed listing");
      trackEvent(nextSaved ? "saved_listing" : "unsaved_listing", {
        vendorId,
        path: typeof window === "undefined" ? "" : window.location.pathname,
      });
    } catch {
      setIsSaved(!nextSaved);
      onSavedChange?.(!nextSaved);
      showToast("Could not update listing", "error");
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  }

  const ariaLabel = isSaved ? "Unsave listing" : "Save listing";
  const colorClasses =
    colorVariant === "burnt"
      ? ""
      : "border-zinc-300 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900";
  const burntButtonStyle =
    colorVariant === "burnt"
      ? {
          backgroundColor: "#efeee8",
          borderColor: "#c96442",
          color: "#c96442",
        }
      : undefined;

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={isSaved}
        disabled={isLoading}
        onClick={toggleSaved}
        style={burntButtonStyle}
        className={`inline-flex items-center justify-center rounded-full border bg-white p-0 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c96442] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${colorClasses} ${sizeClasses[size]}`}
      >
        {isLoading ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700"
            aria-hidden
          />
        ) : (
          <svg
            className="block h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill={isSaved && showFilledWhenSaved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M12 21s-6.72-4.35-9.2-8.1A5.44 5.44 0 0 1 2 9.8 5.8 5.8 0 0 1 7.8 4a6.4 6.4 0 0 1 4.2 1.73A6.4 6.4 0 0 1 16.2 4 5.8 5.8 0 0 1 22 9.8a5.44 5.44 0 0 1-.8 3.1C18.72 16.65 12 21 12 21Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
