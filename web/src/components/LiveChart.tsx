import { formatNumber } from "../format";
import { RED_FROM_W, SCALE_MAX_W } from "../levels";
import { Card } from "./Card";

export interface PowerPoint {
  time: number;
  powerW: number;
}

const WIDTH = 600;
const HEIGHT = 200;

export function LiveChart({ points }: { points: PowerPoint[] }) {
  const peak = Math.max(0, ...points.map((p) => p.powerW));
  const scaleMax = Math.max(SCALE_MAX_W, peak * 1.1);
  const redZoneY = HEIGHT - (RED_FROM_W / scaleMax) * HEIGHT;
  const aside =
    points.length > 0
      ? `${points.length} leituras · faixa vermelha acima de ${formatNumber(RED_FROM_W)} W`
      : undefined;

  return (
    <Card title="Potência ao vivo" aside={aside} className="card--chart">
      {points.length < 2 ? (
        <p className="empty">Aguardando leituras ao vivo…</p>
      ) : (
        <div className="chart">
          <div className="chart__axis" aria-hidden="true">
            <span>{formatNumber(scaleMax)} W</span>
            <span>0 W</span>
          </div>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label="Gráfico da potência ao vivo">
            <rect className="chart__red-zone" x="0" y="0" width={WIDTH} height={redZoneY} />
            <line className="chart__limit" x1="0" y1={redZoneY} x2={WIDTH} y2={redZoneY} />
            <polyline className="chart__line" points={toLine(points, scaleMax)} />
          </svg>
        </div>
      )}
    </Card>
  );
}

function toLine(points: PowerPoint[], scaleMax: number): string {
  const first = points[0].time;
  const span = Math.max(points[points.length - 1].time - first, 1);
  return points
    .map((p) => {
      const x = ((p.time - first) / span) * WIDTH;
      const y = HEIGHT - (p.powerW / scaleMax) * HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
