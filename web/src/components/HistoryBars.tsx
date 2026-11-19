import type { MinuteConsumption } from "../api";

export function HistoryBars({ history }: { history: MinuteConsumption[] }) {
  const totalKwh = history.reduce((sum, m) => sum + m.consumptionKwh, 0);
  const maxPower = Math.max(1, ...history.map((m) => m.averagePowerW));

  return (
    <div className="card">
      <div className="chart__header">
        <span>Last hour (average power per minute)</span>
        <span className="muted">{totalKwh.toFixed(3)} kWh</span>
      </div>
      {history.length === 0 ? (
        <p className="muted">No history yet.</p>
      ) : (
        <div className="bars">
          {history.map((m) => (
            <div
              key={m.minute}
              className="bars__bar"
              style={{ height: `${(m.averagePowerW / maxPower) * 100}%` }}
              title={`${new Date(m.minute).toLocaleTimeString()} · ${m.averagePowerW} W avg · ${m.maxPowerW} W max`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
