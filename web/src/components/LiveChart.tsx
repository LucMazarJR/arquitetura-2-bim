export interface PowerPoint {
  time: number;
  powerW: number;
}

const WIDTH = 600;
const HEIGHT = 180;

export function LiveChart({ points }: { points: PowerPoint[] }) {
  if (points.length < 2) {
    return <div className="card chart chart--empty">Waiting for live readings...</div>;
  }

  const maxPower = Math.max(1000, ...points.map((p) => p.powerW)) * 1.1;
  const firstTime = points[0].time;
  const span = Math.max(points[points.length - 1].time - firstTime, 1);

  const coordinates = points.map((p) => {
    const x = ((p.time - firstTime) / span) * WIDTH;
    const y = HEIGHT - (p.powerW / maxPower) * HEIGHT;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div className="card chart">
      <div className="chart__header">
        <span>Live power</span>
        <span className="muted">last {points.length} readings · max {Math.round(maxPower / 1.1)} W</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label="Live power chart">
        <polygon className="chart__area" points={`0,${HEIGHT} ${coordinates.join(" ")} ${WIDTH},${HEIGHT}`} />
        <polyline className="chart__line" points={coordinates.join(" ")} />
      </svg>
    </div>
  );
}
