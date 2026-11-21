import type { PaymentMethod, PaymentStatus } from "@/lib/types";

export type OnlinePaymentMethod = Exclude<PaymentMethod, "cod">;

export interface PaymentInitiationInput {
  orderCode: string;
  amount: number;
  currency: "BDT";
  customerName: string;
  customerPhone: string;
}

export interface PaymentInitiationResult {
  status: "pending";
  transactionReference: string;
  mode: "mock";
  message: string;
}

export interface PaymentVerificationResult {
  status: PaymentStatus;
  transactionReference: string;
  note: string;
}

export interface PaymentProvider {
  readonly method: OnlinePaymentMethod;
  initiate(input: PaymentInitiationInput): Promise<PaymentInitiationResult>;
  verify(transactionReference: string): Promise<PaymentVerificationResult>;
}
