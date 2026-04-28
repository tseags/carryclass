"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type SubmitEntryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
};

type FormValues = {
  name: string;
  email: string;
  rating: string;
  review: string;
  location: string;
  wouldRecommend: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const REQUIRED_FIELDS: Array<keyof FormValues> = ["name", "email", "rating", "review"];

const EMPTY_FORM: FormValues = {
  name: "",
  email: "",
  rating: "",
  review: "",
  location: "",
  wouldRecommend: "",
};

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

function validateField(field: keyof FormValues, value: string): string {
  const trimmed = value.trim();

  if (REQUIRED_FIELDS.includes(field) && !trimmed) {
    return "This field is required.";
  }

  if (field === "email" && trimmed) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      return "Enter a valid email address.";
    }
  }

  if (field === "rating" && trimmed) {
    const ratingNumber = Number(trimmed);
    if (!Number.isInteger(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      return "Choose a rating from 1 to 5.";
    }
  }

  return "";
}

export function SubmitEntryModal({ isOpen, onClose, onSubmitSuccess }: SubmitEntryModalProps) {
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const { showToast } = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const isFormValid = useMemo(
    () =>
      REQUIRED_FIELDS.every((field) => formValues[field].trim() && !validateField(field, formValues[field])),
    [formValues]
  );

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      firstInputRef.current?.focus();
    }, 0);

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("disabled"));

      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const isShift = event.shiftKey;
      const active = document.activeElement;

      if (isShift && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!isShift && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleTab);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleTab);
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose]);

  const setFieldValue = (field: keyof FormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: validateField(field, value) };
    });
  };

  const validateFieldOnBlur = (field: keyof FormValues) => {
    const error = validateField(field, formValues[field]);
    setErrors((prev) => ({ ...prev, [field]: error || undefined }));
  };

  const validateAllFields = () => {
    const nextErrors: FormErrors = {};

    (Object.keys(formValues) as Array<keyof FormValues>).forEach((field) => {
      const error = validateField(field, formValues[field]);
      if (error) {
        nextErrors[field] = error;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isValid = validateAllFields();
    if (!isValid) return;

    showToast("Thanks! Your review has been submitted.");
    onSubmitSuccess();
    onClose();
    setFormValues(EMPTY_FORM);
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <div className="submit-entry-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="submit-entry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="submit-entry-modal__close"
          aria-label="Close submit review dialog"
          onClick={onClose}
        >
          ×
        </button>
        <h3 id={titleId} className="submit-entry-modal__title">
          Submit a review
        </h3>
        <p id={descriptionId} className="submit-entry-modal__helper">
          Share your feedback about your experience.
        </p>

        <form className="submit-entry-modal__form" onSubmit={handleSubmit} noValidate>
          <label className="submit-entry-modal__field">
            <span>Name *</span>
            <input
              ref={firstInputRef}
              name="name"
              value={formValues.name}
              onChange={(event) => setFieldValue("name", event.target.value)}
              onBlur={() => validateFieldOnBlur("name")}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "submit-entry-error-name" : undefined}
            />
            {errors.name ? (
              <span id="submit-entry-error-name" className="submit-entry-modal__error">
                {errors.name}
              </span>
            ) : null}
          </label>

          <label className="submit-entry-modal__field">
            <span>Email *</span>
            <input
              type="email"
              name="email"
              value={formValues.email}
              onChange={(event) => setFieldValue("email", event.target.value)}
              onBlur={() => validateFieldOnBlur("email")}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "submit-entry-error-email" : undefined}
            />
            {errors.email ? (
              <span id="submit-entry-error-email" className="submit-entry-modal__error">
                {errors.email}
              </span>
            ) : null}
          </label>

          <label className="submit-entry-modal__field">
            <span>Rating (1-5) *</span>
            <select
              name="rating"
              value={formValues.rating}
              onChange={(event) => setFieldValue("rating", event.target.value)}
              onBlur={() => validateFieldOnBlur("rating")}
              aria-invalid={Boolean(errors.rating)}
              aria-describedby={errors.rating ? "submit-entry-error-rating" : undefined}
            >
              <option value="">Select a rating</option>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Fair</option>
              <option value="1">1 - Poor</option>
            </select>
            {errors.rating ? (
              <span id="submit-entry-error-rating" className="submit-entry-modal__error">
                {errors.rating}
              </span>
            ) : null}
          </label>

          <label className="submit-entry-modal__field">
            <span>Review *</span>
            <textarea
              name="review"
              rows={4}
              value={formValues.review}
              onChange={(event) => setFieldValue("review", event.target.value)}
              onBlur={() => validateFieldOnBlur("review")}
              aria-invalid={Boolean(errors.review)}
              aria-describedby={errors.review ? "submit-entry-error-review" : undefined}
            />
            {errors.review ? (
              <span id="submit-entry-error-review" className="submit-entry-modal__error">
                {errors.review}
              </span>
            ) : null}
          </label>

          <label className="submit-entry-modal__field">
            <span>Location (city/county)</span>
            <input
              name="location"
              value={formValues.location}
              onChange={(event) => setFieldValue("location", event.target.value)}
              onBlur={() => validateFieldOnBlur("location")}
              aria-invalid={Boolean(errors.location)}
              aria-describedby={errors.location ? "submit-entry-error-location" : undefined}
            />
            {errors.location ? (
              <span id="submit-entry-error-location" className="submit-entry-modal__error">
                {errors.location}
              </span>
            ) : null}
          </label>

          <label className="submit-entry-modal__field">
            <span>Would you recommend this site?</span>
            <select
              name="wouldRecommend"
              value={formValues.wouldRecommend}
              onChange={(event) => setFieldValue("wouldRecommend", event.target.value)}
              onBlur={() => validateFieldOnBlur("wouldRecommend")}
              aria-invalid={Boolean(errors.wouldRecommend)}
              aria-describedby={
                errors.wouldRecommend ? "submit-entry-error-would-recommend" : undefined
              }
            >
              <option value="">Select one</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {errors.wouldRecommend ? (
              <span id="submit-entry-error-would-recommend" className="submit-entry-modal__error">
                {errors.wouldRecommend}
              </span>
            ) : null}
          </label>

          <div className="submit-entry-modal__actions">
            <button type="button" className="btn-secondary small w-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary small w-button" disabled={!isFormValid}>
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
