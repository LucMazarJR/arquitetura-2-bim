import { expect, test } from "@playwright/test";
import {
  authHeaders,
  deviceReading,
  MAILPIT_URL,
  publishReadings,
  uniqueMeter,
  waitForMeter,
} from "./support";

test("dashboard shows live readings from the simulator", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("live", { exact: true })).toBeVisible();
  await expect(page.locator(".stat--highlight .stat__value")).not.toHaveText("-");
  await expect(page.locator(".chart svg")).toBeVisible();

  await page.screenshot({ path: "screenshots/dashboard.png", fullPage: true });
});

test("a high power reading becomes an alert in the app and an e-mail", async ({ page, request }) => {
  const { homeId, meterId } = uniqueMeter("alert");

  await publishReadings(homeId, meterId, [deviceReading({ p: 450 })]);
  await waitForMeter(request, meterId);

  await page.goto("/");
  await page.getByLabel("Meter").selectOption(meterId);

  await publishReadings(homeId, meterId, [deviceReading({ p: 5800, ts: Math.floor(Date.now() / 1000) + 1 })]);

  await expect(page.locator(".alerts__item").filter({ hasText: "High consumption: 5800 W" })).toBeVisible();
  await expect(page.locator(".stat--highlight .stat__value")).toContainText("5,800");

  await expect
    .poll(async () => {
      const response = await request.get(`${MAILPIT_URL}/api/v1/messages`);
      const body: { messages: { Subject: string; Snippet: string }[] } = await response.json();
      return body.messages.some((m) => m.Subject.includes("5800 W") && m.Snippet.includes(meterId));
    })
    .toBe(true);
});

test("setting a monthly goal publishes meta.atualizada and the analysis warns when the forecast passes it", async ({
  page,
  request,
}) => {
  const { homeId, meterId } = uniqueMeter("goal");
  const now = Math.floor(Date.now() / 1000);

  await publishReadings(homeId, meterId, [deviceReading({ ts: now - 40, e: 1_300_000 })]);
  await waitForMeter(request, meterId);

  await page.goto("/");
  await page.getByLabel("Meter").selectOption(meterId);
  await page.getByLabel("Monthly goal (kWh)").fill("1");
  await page.getByRole("button", { name: "Save goal" }).click();

  await expect
    .poll(async () => (await request.get(`/api/meters/${meterId}/goal`, { headers: authHeaders })).status())
    .toBe(200);

  await publishReadings(homeId, meterId, [deviceReading({ ts: now, e: 1_300_010 })]);

  await expect(page.locator(".alerts__item").filter({ hasText: "goal 1 kWh" })).toBeVisible();
  await expect(page.getByText("Projection is above the goal")).toBeVisible();
});
