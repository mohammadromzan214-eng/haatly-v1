import { randomBytes } from "node:crypto";
import type { PaymentProvider, PaymentInitiationInput, PaymentInitiationResult, PaymentVerificationResult } from "./types";

export class NagadProvider implements PaymentProvider {
  readonly method = "nagad" as const;

  async initiate(_input: PaymentInitiationInput): Promise<PaymentInitiationResult> {
    return {
      status: "pending",
      transactionReference: `MOCK-NAGAD-${randomBytes(8).toString("hex").toUpperCase()}`,
      mode: "mock",
      message: "Mock Nagad mode: no real payment was processed. Payment remains pending until verified by Haatly.",
    };
  }

  async verify(transactionReference: string): Promise<PaymentVerificationResult> {
    return {
      status: "pending",
      transactionReference,
      note: "Mock Nagad mode cannot verify a live transaction.",
    };
  }
}
