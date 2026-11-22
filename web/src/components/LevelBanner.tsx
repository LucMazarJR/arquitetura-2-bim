import type { Reading } from "../api";
import { formatNumber, formatTime } from "../format";
import { LEVEL_LABELS, levelOf, RED_FROM_W, SCALE_MAX_W, YELLOW_FROM_W } from "../levels";

export function LevelBanner({ reading }: { reading: Reading | null }) {
  const level = reading ? levelOf(reading.powerW) : "green";
  const markerPercent = reading ? Math.min(reading.powerW / SCALE_MAX_W, 1) * 100 : 0;

  return (
    <section className="level" aria-labelledby="level-title">
      <div className={`level__banner level__banner--${level}`}>
        <div>
          <h2 id="level-title" className="level__headline">
            {reading ? LEVEL_LABELS[level].headline : "Aguardando a primeira leitura"}
          </h2>
          <p className="level__power">
            <strong data-testid="power-now">{reading ? formatNumber(reading.powerW) : "—"}</strong>
            <span>W</span>
          </p>
        </div>
        {reading && (
          <p className="level__details">
            Leitura das {formatTime(reading.measuredAt)} · tensão {formatNumber(reading.voltageV, 1)} V · corrente{" "}
            {formatNumber(reading.currentA, 2)} A
          </p>
        )}
      </div>

      <div className="level__scale">
        <div className="level__track" aria-hidden="true">
          <span className="level__segment level__segment--green" style={{ flexGrow: YELLOW_FROM_W }} />
          <span className="level__segment level__segment--yellow" style={{ flexGrow: RED_FROM_W - YELLOW_FROM_W }} />
          <span className="level__segment level__segment--red" style={{ flexGrow: SCALE_MAX_W - RED_FROM_W }} />
        </div>
        <div className="level__marker-row" aria-hidden="true">
          {reading && <span className="level__marker" style={{ left: `${markerPercent}%` }} />}
        </div>
        <ul className="level__legend">
          <li>
            <span className="swatch swatch--green" />
            Verde · até {formatNumber(YELLOW_FROM_W)} W
          </li>
          <li>
            <span className="swatch swatch--yellow" />
            Amarelo · até {formatNumber(RED_FROM_W)} W
          </li>
          <li>
            <span className="swatch swatch--red" />
            Vermelho · acima de {formatNumber(RED_FROM_W)} W
          </li>
        </ul>
      </div>
    </section>
  );
}
