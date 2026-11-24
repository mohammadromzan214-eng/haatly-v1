import { randomBytes } from "node:crypto";
import type { PaymentProvider, PaymentInitiationInput, PaymentInitiationResult, PaymentVerificationResult } from "./types";

export class BkashProvider implements PaymentProvider {
  readonly method = "bkash" as const;

  async initiate(_input: PaymentInitiationInput): Promise<PaymentInitiationResult> {
    return {
      status: "pending",
      transactionReference: `MOCK-BKASH-${randomBytes(8).toString("hex").toUpperCase()}`,
      mode: "mock",
      message: "Mock bKash mode: no real payment was processed. Payment remains pending until verified by TOQAEE.",
    };
  }

  async verify(transactionReference: string): Promise<PaymentVerificationResult> {
    return {
      status: "pending",
      transactionReference,
      note: "Mock bKash mode cannot verify a live transaction.",
    };
  }
}
