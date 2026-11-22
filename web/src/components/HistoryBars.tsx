import type { MinuteConsumption } from "../api";
import { formatNumber, formatTime } from "../format";
import { LEVEL_LABELS, levelOf } from "../levels";
import { Card } from "./Card";

export function HistoryBars({ history }: { history: MinuteConsumption[] }) {
  const totalKwh = history.reduce((sum, m) => sum + m.consumptionKwh, 0);
  const maxPower = Math.max(1, ...history.map((m) => m.averagePowerW));

  return (
    <Card title="Última hora por nível" aside={`${formatNumber(totalKwh, 3)} kWh consumidos`} className="card--history">
      {history.length === 0 ? (
        <p className="empty">Ainda sem histórico.</p>
      ) : (
        <>
          <div className="bars" role="img" aria-label="Potência média por minuto na última hora, colorida pelo nível">
            {history.map((m) => {
              const level = levelOf(m.averagePowerW);
              return (
                <div
                  key={m.minute}
                  className={`bars__bar bars__bar--${level}`}
                  style={{ height: `${Math.max((m.averagePowerW / maxPower) * 100, 3)}%` }}
                  title={`${formatTime(m.minute)} · média ${formatNumber(m.averagePowerW)} W · nível ${LEVEL_LABELS[level].name.toLowerCase()}`}
                />
              );
            })}
          </div>
          <p className="caption">Cada barra é a potência média de um minuto, na cor do nível em que ficou.</p>
        </>
      )}
    </Card>
  );
}
