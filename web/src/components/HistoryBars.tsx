import type { MinuteConsumption } from "../api";
import { formatNumber, formatTime } from "../format";
import { Panel } from "./Panel";

export function HistoryBars({ history }: { history: MinuteConsumption[] }) {
  const totalKwh = history.reduce((sum, m) => sum + m.consumptionKwh, 0);
  const maxPower = Math.max(1, ...history.map((m) => m.averagePowerW));

  return (
    <Panel
      number="05"
      title="Última hora"
      aside={`${formatNumber(totalKwh, 3)} kWh consumidos`}
      className="panel--wide"
    >
      {history.length === 0 ? (
        <p className="empty">Ainda sem histórico.</p>
      ) : (
        <>
          <div className="bars" role="img" aria-label="Potência média por minuto na última hora">
            {history.map((m, index) => (
              <div
                key={m.minute}
                className={index === history.length - 1 ? "bars__bar bars__bar--current" : "bars__bar"}
                style={{ height: `${Math.max((m.averagePowerW / maxPower) * 100, 2)}%` }}
                title={`${formatTime(m.minute)} · média ${formatNumber(m.averagePowerW)} W · pico ${formatNumber(m.maxPowerW)} W`}
              />
            ))}
          </div>
          <p className="caption">Potência média por minuto. A última barra é o minuto atual.</p>
        </>
      )}
    </Panel>
  );
}
