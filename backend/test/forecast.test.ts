import { ForecastRepository } from "../src/modules/forecast/forecast.repository";
import { ForecastService } from "../src/modules/forecast/forecast.service";
import { hoursUntilEndOfMonth, movingAverage, projectMonth } from "../src/modules/forecast/projection";
import { MemoryEventBus } from "../src/platform/adapters/memory-event-bus";
import { createFakeDatabase, readingEvent } from "./support";

describe("projection", () => {
  it("counts the hours until the end of the month", () => {
    expect(hoursUntilEndOfMonth(new Date("2026-11-30T00:00:00Z"))).toBe(24);
  });

  it("adds what was consumed so far to the average for the rest of the month", () => {
    const projection = projectMonth({
      monthStartEnergyKwh: 1000,
      currentEnergyKwh: 1150,
      averagePowerW: 500,
      now: new Date("2026-11-30T00:00:00Z"),
      tariffPerKwh: 0.9,
    });

    expect(projection).toEqual({
      month: "2026-11",
      consumedSoFarKwh: 150,
      projectedKwh: 162,
      projectedCost: 145.8,
    });
  });

  it("moving average smooths peaks", () => {
    expect(movingAverage(undefined, 500, 0.1)).toBe(500);
    expect(movingAverage(500, 5500, 0.1)).toBe(1000);
  });
});

describe("ForecastService", () => {
  it("publishes at most one forecast per interval for each meter", async () => {
    const bus = new MemoryEventBus();
    const forecast = new ForecastService(bus, new ForecastRepository(createFakeDatabase()), {
      tariffPerKwh: 0.9,
      averageAlpha: 0.1,
      publishIntervalSeconds: 30,
    });

    await forecast.update(readingEvent({ measuredAt: "2026-11-19T15:00:00Z" }));
    await forecast.update(readingEvent({ measuredAt: "2026-11-19T15:00:10Z" }));
    await forecast.update(readingEvent({ measuredAt: "2026-11-19T15:00:31Z" }));

    const events = bus.eventsOf("forecasts");
    expect(events).toHaveLength(2);
    expect(events[0].data.month).toBe("2026-11");
    expect(events[0].data.projectedKwh).toBeGreaterThan(0);
  });
});
