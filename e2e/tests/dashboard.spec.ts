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

  await expect(page.getByRole("status").filter({ hasText: "Ao vivo" })).toBeVisible();
  await expect(page.getByTestId("power-now")).not.toHaveText("—");
  await expect(page.getByRole("img", { name: "Gráfico da potência ao vivo" })).toBeVisible();

  await page.screenshot({ path: "screenshots/dashboard.png", fullPage: true });
});

test("high contrast mode can be turned on, survives a reload and can be forced by URL", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");

  await page.getByRole("button", { name: /Alto contraste/ }).click();
  await expect(html).toHaveAttribute("data-contrast", "high");
  await expect(page.getByRole("button", { name: "Alto contraste: ligado" })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(html).toHaveAttribute("data-contrast", "high");
  await page.screenshot({ path: "screenshots/dashboard-high-contrast.png", fullPage: true });

  await page.getByRole("button", { name: /Alto contraste/ }).click();
  await expect(html).toHaveAttribute("data-contrast", "normal");

  await page.goto("/?contraste=alto");
  await expect(html).toHaveAttribute("data-contrast", "high");
});

test("a high power reading becomes an alert in the app and an e-mail", async ({ page, request }) => {
  const { homeId, meterId } = uniqueMeter("alert");

  await publishReadings(homeId, meterId, [deviceReading({ p: 450 })]);
  await waitForMeter(request, meterId);

  await page.goto("/");
  await page.getByLabel("Medidor").selectOption(meterId);

  await publishReadings(homeId, meterId, [deviceReading({ p: 5800, ts: Math.floor(Date.now() / 1000) + 1 })]);

  await expect(page.locator(".alert").filter({ hasText: "Consumo alto: 5.800 W" })).toBeVisible();
  await expect(page.getByTestId("power-now")).toHaveText("5.800");

  await expect
    .poll(async () => {
      const response = await request.get(`${MAILPIT_URL}/api/v1/messages`);
      const body: { messages: { Subject: string; Snippet: string }[] } = await response.json();
      return body.messages.some((m) => m.Subject.includes("[AVISO] Consumo alto: 5.800 W") && m.Snippet.includes(meterId));
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
  await page.getByLabel("Medidor").selectOption(meterId);
  await page.getByLabel("Meta mensal (kWh)").fill("1");
  await page.getByRole("button", { name: "Salvar meta" }).click();

  await expect
    .poll(async () => {
      const response = await request.get(`/api/meters/${meterId}/goal`, { headers: authHeaders });
      const body = await response.text();
      return body ? JSON.parse(body).monthlyGoalKwh : null;
    })
    .toBe(1);

  await publishReadings(homeId, meterId, [deviceReading({ ts: now, e: 1_300_010 })]);

  await expect(page.locator(".alert").filter({ hasText: "meta de 1 kWh" })).toBeVisible();
  await expect(page.getByText(/Previsão acima da meta/)).toBeVisible();
});
