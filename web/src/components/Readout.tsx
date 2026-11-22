import type { Reading } from "../api";
import { formatNumber, formatTime } from "../format";

export function Readout({ reading }: { reading: Reading | null }) {
  return (
    <section className="readout" aria-labelledby="readout-title">
      <h2 id="readout-title" className="readout__label">
        <span className="panel__number">01</span>
        Consumo agora
      </h2>
      <p className="readout__value">
        <strong data-testid="power-now">{reading ? formatNumber(reading.powerW) : "—"}</strong>
        <span>W</span>
      </p>
      <p className="readout__time">
        {reading ? `Leitura das ${formatTime(reading.measuredAt)}` : "Aguardando a primeira leitura"}
      </p>
    </section>
  );
}

export function Gauges({ reading }: { reading: Reading | null }) {
  const items = [
    { label: "Tensão", value: reading ? formatNumber(reading.voltageV, 1) : "—", unit: "V" },
    { label: "Corrente", value: reading ? formatNumber(reading.currentA, 2) : "—", unit: "A" },
    { label: "Fator de potência", value: reading ? formatNumber(reading.powerFactor, 2) : "—", unit: "" },
    { label: "Frequência", value: reading ? formatNumber(reading.frequencyHz, 1) : "—", unit: "Hz" },
  ];

  return (
    <dl className="gauges">
      {items.map((item) => (
        <div key={item.label} className="gauge">
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
