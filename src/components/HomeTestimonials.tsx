"use client";

import { useState } from "react";
import { SubmitEntryModal } from "@/components/SubmitEntryModal";
import { trackEvent } from "@/lib/analytics";

export function HomeTestimonials() {
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleOpenSubmitModal = () => {
    setIsSubmitModalOpen(true);
    trackEvent("submit_review_modal_opened", { source: "home_testimonials" });
  };

  const handleCloseSubmitModal = () => {
    setIsSubmitModalOpen(false);
  };

  const handleSubmitSuccess = () => {
    setSuccessMessage("Thanks! Your review has been submitted.");
    trackEvent("submit_review_success", { source: "home_testimonials" });
  };

  return (
    <section
      className="home-testimonials"
      aria-labelledby="home-testimonials-heading"
    >
      <div className="container-default w-container">
        <div className="home-testimonials__header">
          <h2 id="home-testimonials-heading" className="home-testimonials__heading">
            How was your experience finding a CCW course?
          </h2>
        </div>
        {successMessage ? (
          <p className="home-testimonials__status" role="status" aria-live="polite">
            {successMessage}
          </p>
        ) : null}
        <div className="home-testimonials__cta-row">
          <button
            type="button"
            className="btn-secondary small w-button home-testimonials__submit-cta"
            onClick={handleOpenSubmitModal}
          >
            Submit Review
          </button>
        </div>
      </div>
      <SubmitEntryModal
        isOpen={isSubmitModalOpen}
        onClose={handleCloseSubmitModal}
        onSubmitSuccess={handleSubmitSuccess}
      />
    </section>
  );
}
