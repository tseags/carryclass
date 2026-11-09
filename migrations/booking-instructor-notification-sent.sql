-- Marks a paid booking whose instructor notification email was accepted by Resend.
-- Used to send that email once even when both the success page and the webhook fulfill it.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "instructorNotificationSentAt" TIMESTAMP(3);
