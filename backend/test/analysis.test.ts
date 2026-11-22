import { AlertRepository } from "../src/modules/analysis/alert.repository";
import type { AnalysisConfig } from "../src/modules/analysis/analysis.config";
import { AnalysisService } from "../src/modules/analysis/analysis.service";
import { defaultRules, PowerAboveLimit, VoltageOutOfRange, type Rule } from "../src/modules/analysis/rules";
import { MemoryCache } from "../src/platform/adapters/memory-cache";
import { MemoryEventBus } from "../src/platform/adapters/memory-event-bus";
import { createFakeDatabase, readingEvent } from "./support";

const config: AnalysisConfig = { powerLimitW: 4500, minVoltageV: 202, maxVoltageV: 231, cooldownSeconds: 120 };

function setup(options: { now?: () => number; rules?: Rule[] } = {}) {
  const bus = new MemoryEventBus();
  const analysis = new AnalysisService(
    bus,
    new MemoryCache(options.now),
    new AlertRepository(createFakeDatabase()),
    config,
    options.rules ?? defaultRules(config),
  );
  return { bus, analysis };
}

describe("rules", () => {
  it("power above limit", () => {
    const rule = new PowerAboveLimit(4500);
    expect(rule.check(readingEvent({ powerW: 4000 }).data)).toBeNull();
    expect(rule.check(readingEvent({ powerW: 5600 }).data)).toMatchObject({ severity: "warning", limit: 4500 });
  });

  it("voltage out of range", () => {
    const rule = new VoltageOutOfRange(202, 231);
    expect(rule.check(readingEvent({ voltageV: 220 }).data)).toBeNull();
    expect(rule.check(readingEvent({ voltageV: 195 }).data)).toMatchObject({ severity: "critical", limit: 202 });
    expect(rule.check(readingEvent({ voltageV: 240 }).data)).toMatchObject({ severity: "critical", limit: 231 });
  });
});

describe("AnalysisService", () => {
  it("publishes alerta.gerado keeping the reading's correlationId", async () => {
    const { bus, analysis } = setup();
    const reading = readingEvent({ powerW: 5600 });

    await analysis.analyze(reading);

    const [alert] = bus.eventsOf("alerts");
    expect(alert.type).toBe("alerta.gerado");
    expect(alert.data.rule).toBe("power-above-limit");
    expect(alert.correlationId).toBe(reading.correlationId);
  });

  it("does not repeat the same alert during the cooldown", async () => {
    let now = 0;
    const { bus, analysis } = setup({ now: () => now });

    await analysis.analyze(readingEvent({ powerW: 5600 }));
    await analysis.analyze(readingEvent({ powerW: 5700 }));
    expect(bus.eventsOf("alerts")).toHaveLength(1);

    now += 121_000;
    await analysis.analyze(readingEvent({ powerW: 5800 }));
    expect(bus.eventsOf("alerts")).toHaveLength(2);
  });

  it("accepts new rules without changing the service", async () => {
    const alwaysFires: Rule = {
      name: "always-fires",
      check: () => ({ severity: "warning", message: "test", measuredValue: 1, limit: 0 }),
    };
    const { bus, analysis } = setup({ rules: [alwaysFires] });

    await analysis.analyze(readingEvent());
    expect(bus.eventsOf("alerts")[0].data.rule).toBe("always-fires");
  });
});
