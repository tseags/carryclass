import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeTestimonials } from "@/components/HomeTestimonials";

describe("HomeTestimonials submit entry flow", () => {
  it("renders submit CTA button", () => {
    render(<HomeTestimonials />);
    expect(screen.getByRole("button", { name: /submit review/i })).toBeInTheDocument();
  });

  it("opens and closes modal via cancel and ESC", async () => {
    render(<HomeTestimonials />);

    fireEvent.click(screen.getByRole("button", { name: /submit review/i }));
    expect(screen.getByRole("dialog", { name: /submit a review/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /submit a review/i })).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /submit review/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /submit a review/i })).not.toBeInTheDocument()
    );
  });

  it("prevents invalid submit and shows inline validation errors", async () => {
    render(<HomeTestimonials />);

    fireEvent.click(screen.getByRole("button", { name: /submit review/i }));
    fireEvent.blur(screen.getByLabelText(/^name \*/i));
    fireEvent.blur(screen.getByLabelText(/^email \*/i));
    fireEvent.blur(screen.getByLabelText(/^rating \(1-5\) \*/i));
    fireEvent.blur(screen.getByLabelText(/^review \*/i));

    const submitButton = screen.getByRole("button", { name: /^submit$/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getAllByText("This field is required.")).toHaveLength(4);
    expect(screen.getByRole("dialog", { name: /submit a review/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^email \*/i), { target: { value: "invalid" } });
    fireEvent.blur(screen.getByLabelText(/^email \*/i));
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("submits valid form and shows success message", async () => {
    render(<HomeTestimonials />);

    fireEvent.click(screen.getByRole("button", { name: /submit review/i }));
    fireEvent.change(screen.getByLabelText(/^name \*/i), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText(/^email \*/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/^rating \(1-5\) \*/i), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText(/^review \*/i), {
      target: { value: "Very easy to compare counties and classes." },
    });
    fireEvent.change(screen.getByLabelText(/^location \(city\/county\)/i), {
      target: { value: "Orange County" },
    });
    fireEvent.change(screen.getByLabelText(/^would you recommend this site\?/i), {
      target: { value: "yes" },
    });

    const submitButton = screen.getByRole("button", { name: /^submit$/i });
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /submit a review/i })).not.toBeInTheDocument()
    );
    expect(screen.getByText(/thanks! your review has been submitted/i)).toBeInTheDocument();
  });
});
