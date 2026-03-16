// Mock Layer — simulates external APIs (Klaviyo, HubSpot)
// No real API calls are made

export type Scenario = "happy" | "partial_failure" | "total_failure" | "slow";

export interface Subscription {
  id: string;
  name: string;
  status: "active";
}

export interface UnsubscribeResult {
  ok: boolean;
  email: string;
  subscriptionId: string;
}

// Simulated HubSpot subscriptions
const MOCK_SUBSCRIPTIONS: Subscription[] = [
  { id: "sub_001", name: "Marketing Newsletter", status: "active" },
  { id: "sub_002", name: "Product Updates", status: "active" },
  { id: "sub_003", name: "Partner Offers", status: "active" },
];

// Simulate fetching subscriptions from HubSpot
export async function mockGetSubscriptions(
  email: string,
  scenario: Scenario = "happy"
): Promise<Subscription[]> {
  console.log(
    JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      event: "mock_get_subscriptions",
      email,
      scenario,
      mock: true,
    })
  );

  if (scenario === "slow") {
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (scenario === "total_failure") {
    throw new Error("HubSpot API 500: Internal Server Error (simulated)");
  }

  return [...MOCK_SUBSCRIPTIONS];
}

// Simulate unsubscribing from HubSpot
export async function mockUnsubscribe(
  email: string,
  subscriptionId: string,
  scenario: Scenario = "happy"
): Promise<UnsubscribeResult> {
  console.log(
    JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      event: "mock_unsubscribe",
      email,
      subscriptionId,
      scenario,
      mock: true,
    })
  );

  if (scenario === "slow") {
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (scenario === "total_failure") {
    throw new Error(`HubSpot API 500: Failed to unsubscribe ${subscriptionId} (simulated)`);
  }

  if (scenario === "partial_failure" && subscriptionId === "sub_002") {
    throw new Error(`HubSpot API 500: Failed to unsubscribe ${subscriptionId} (simulated partial)`);
  }

  return { ok: true, email, subscriptionId };
}
