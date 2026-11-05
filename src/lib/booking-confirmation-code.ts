import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";

/** No 0/O, 1/I/L — codes get read aloud and typed from emails. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const PREFIX = "CC-";

export const CONFIRMATION_CODE_PATTERN = new RegExp(`^${PREFIX}[${ALPHABET}]{${CODE_LENGTH}}$`);

export function generateConfirmationCode(): string {
  let code = PREFIX;
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/** Unique-constraint hit on confirmationCode (not on the Stripe session id). */
export function isConfirmationCodeCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;
  return JSON.stringify(error.meta?.target ?? "").includes("confirmationCode");
}
