import type { PaymentMethod } from "@/lib/types";
import { recordPaymentInitiation, recordPaymentInitiationFailure } from "@/lib/db/payment-repository";
import { BkashProvider } from "./bkash-provider";
import { NagadProvider } from "./nagad-provider";
import type { OnlinePaymentMethod, PaymentInitiationInput, PaymentProvider } from "./types";

const providers: Record<OnlinePaymentMethod, PaymentProvider> = {
  bkash: new BkashProvider(),
  nagad: new NagadProvider(),
};

export async function initiateOrderPayment(input: PaymentInitiationInput & {
  paymentId: string;
  method: Exclude<PaymentMethod, "cod">;
}) {
  const provider = providers[input.method];
  try {
    const result = await provider.initiate(input);
    await recordPaymentInitiation(input.paymentId, result.transactionReference, {
      mode: result.mode,
      message: result.message,
    });
    return result;
  } catch (error) {
    await recordPaymentInitiationFailure(input.paymentId);
    throw error;
  }
}
