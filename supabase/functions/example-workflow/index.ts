import { supaflow } from "../_shared/supaflow.ts";

interface OrderRequest {
  orderId: string;
  email: string;
  items: Array<{ sku: string; quantity: number; price: number }>;
}

async function validateOrder(orderId: string) {
  if (!orderId) throw new Error("Missing orderId");
  return { orderId, valid: true };
}

async function chargePayment(total: number) {
  if (total <= 0) throw new Error("Invalid total");
  return { charged: true, total, transactionId: crypto.randomUUID() };
}

async function reserveStock(sku: string, quantity: number) {
  return { sku, quantity, reserved: true };
}

async function sendConfirmation(email: string, orderId: string) {
  return { sent: true, email, orderId };
}

export default supaflow.serve("order-fulfillment", async (flow) => {
  const { orderId, email, items } = flow.input<OrderRequest>();

  const order = await flow.step("validate-order", () =>
    validateOrder(orderId)
  );

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const payment = await flow.step("charge-payment", () =>
    chargePayment(total)
  );

  for (const item of items) {
    await flow.step(`reserve-stock-${item.sku}`, () =>
      reserveStock(item.sku, item.quantity)
    );
  }

  await flow.step("send-confirmation", () =>
    sendConfirmation(email, orderId)
  );
});
