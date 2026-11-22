import type { Reading } from "../api";
import { formatNumber } from "../format";

export function Measurements({ reading }: { reading: Reading | null }) {
  const items = [
    { label: "Tensão", value: reading ? formatNumber(reading.voltageV, 1) : "—", unit: "V" },
    { label: "Corrente", value: reading ? formatNumber(reading.currentA, 2) : "—", unit: "A" },
    { label: "Fator de potência", value: reading ? formatNumber(reading.powerFactor, 2) : "—", unit: "" },
    { label: "Frequência", value: reading ? formatNumber(reading.frequencyHz, 1) : "—", unit: "Hz" },
  ];

  return (
    <dl className="measurements">
      {items.map((item) => (
        <div key={item.label} className="measure">
          <dt>{item.label}</dt>
          <dd>
            {item.value}
            {item.unit && <small>{item.unit}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
