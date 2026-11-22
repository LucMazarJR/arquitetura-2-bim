import { formatNumber } from "../format";
import { Panel } from "./Panel";

export interface PowerPoint {
  time: number;
  powerW: number;
}

const WIDTH = 600;
const HEIGHT = 200;

export function LiveChart({ points }: { points: PowerPoint[] }) {
  const peak = Math.max(0, ...points.map((p) => p.powerW));
  const scaleMax = Math.max(1000, peak) * 1.1;
  const aside = points.length > 0 ? `${points.length} leituras · pico de ${formatNumber(peak)} W` : undefined;

  return (
    <Panel number="02" title="Potência ao vivo" aside={aside} className="panel--chart">
      {points.length < 2 ? (
        <p className="empty">Aguardando leituras ao vivo…</p>
      ) : (
        <div className="chart">
          <div className="chart__axis" aria-hidden="true">
            <span>{formatNumber(scaleMax)} W</span>
            <span>0 W</span>
          </div>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label="Gráfico da potência ao vivo">
            <line className="chart__grid" x1="0" y1={HEIGHT / 2} x2={WIDTH} y2={HEIGHT / 2} />
            <polygon className="chart__area" points={toArea(points, scaleMax)} />
            <polyline className="chart__line" points={toLine(points, scaleMax)} />
          </svg>
        </div>
      )}
    </Panel>
  );
}

function toCoordinates(points: PowerPoint[], scaleMax: number): string[] {
  const first = points[0].time;
  const span = Math.max(points[points.length - 1].time - first, 1);
  return points.map((p) => {
    const x = ((p.time - first) / span) * WIDTH;
    const y = HEIGHT - (p.powerW / scaleMax) * HEIGHT;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
}

function toLine(points: PowerPoint[], scaleMax: number): string {
  return toCoordinates(points, scaleMax).join(" ");
}

function toArea(points: PowerPoint[], scaleMax: number): string {
  return `0,${HEIGHT} ${toLine(points, scaleMax)} ${WIDTH},${HEIGHT}`;
}
