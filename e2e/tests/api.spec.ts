import { expect, test } from "@playwright/test";
import { authHeaders } from "./support";

test("health check is public", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: "ok" });
});

test("data endpoints require the API token", async ({ request }) => {
  expect((await request.get("/api/meters")).status()).toBe(401);
  expect((await request.get("/api/meters", { headers: { Authorization: "Bearer wrong" } })).status()).toBe(401);
  expect((await request.get("/api/meters", { headers: authHeaders })).status()).toBe(200);
});

test("the simulator meters are visible through the API", async ({ request }) => {
  await expect
    .poll(async () => {
      const response = await request.get("/api/meters", { headers: authHeaders });
      const meters: { meterId: string }[] = await response.json();
      return meters.map((m) => m.meterId);
    })
    .toEqual(expect.arrayContaining(["meter-01", "meter-02"]));
});
