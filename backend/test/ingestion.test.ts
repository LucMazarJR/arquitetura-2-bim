import { IngestionService } from "../src/modules/ingestion/ingestion.service";
import { ReadingRepository } from "../src/modules/ingestion/reading.repository";
import { parseTopic, translate } from "../src/modules/ingestion/translator";
import { validateReading } from "../src/modules/ingestion/validator";
import { MemoryEventBus } from "../src/platform/adapters/memory-event-bus";
import { createFakeDatabase, devicePayload } from "./support";

const TOPIC = "energy/home-01/meter-01/reading";

function setup() {
  const bus = new MemoryEventBus();
  const ingestion = new IngestionService(bus, new ReadingRepository(createFakeDatabase()));
  return { bus, ingestion };
}

describe("translator", () => {
  it("reads home and meter from the topic", () => {
    expect(parseTopic(TOPIC)).toEqual({ homeId: "home-01", meterId: "meter-01" });
    expect(parseTopic("other/topic")).toBeNull();
  });

  it("converts the device format (Wh, epoch seconds) to the contract (kWh, ISO date)", () => {
    const reading = translate(
      { homeId: "home-01", meterId: "meter-01" },
      { v: 221, i: 2, p: 440, e: 1_234_567, f: 60, pf: 0.99, ts: 1_763_560_000 },
    );
    expect(reading.energyKwh).toBeCloseTo(1234.567);
    expect(reading.measuredAt).toBe(new Date(1_763_560_000_000).toISOString());
    expect(reading.readingId).toBe("meter-01:1763560000");
  });
});

describe("validator", () => {
  const now = new Date("2026-11-19T15:00:00Z");
  const ts = Math.floor(now.getTime() / 1000);
  const valid = { v: 220, i: 2, p: 440, e: 1000, f: 60, pf: 0.98, ts };

  it("accepts a plausible reading", () => {
    expect(validateReading(valid, now).valid).toBe(true);
  });

  it.each([
    [{ ...valid, pf: 1.7 }, "pf"],
    [{ ...valid, v: 900 }, "v"],
    [{ ...valid, p: "high" }, "p"],
    [{ ...valid, ts: ts + 3600 }, "future"],
    [{ ...valid, ts: ts - 3 * 86400 }, "old"],
  ])("rejects an invalid reading (%o)", (reading, expectedReason) => {
    const result = validateReading(reading, now);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain(expectedReason);
  });
});

describe("IngestionService", () => {
  it("saves a valid reading and publishes leitura.validada", async () => {
    const { bus, ingestion } = setup();

    expect(await ingestion.handleMessage(TOPIC, devicePayload())).toBe("recorded");

    const [event] = bus.eventsOf("readings");
    expect(event.type).toBe("leitura.validada");
    expect(event.data.meterId).toBe("meter-01");
    expect(event.data.energyKwh).toBe(1250);
  });

  it("rejects invalid messages without publishing", async () => {
    const { bus, ingestion } = setup();

    expect(await ingestion.handleMessage(TOPIC, devicePayload({ pf: 1.7 }))).toBe("rejected");
    expect(await ingestion.handleMessage(TOPIC, "not json")).toBe("rejected");
    expect(bus.published).toHaveLength(0);
  });

  it("publishes only once when the same message arrives twice", async () => {
    const { bus, ingestion } = setup();
    const message = devicePayload();

    await ingestion.handleMessage(TOPIC, message);
    expect(await ingestion.handleMessage(TOPIC, message)).toBe("duplicate");
    expect(bus.eventsOf("readings")).toHaveLength(1);
  });
});
