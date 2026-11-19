interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, unit, highlight }: StatCardProps) {
  return (
    <div className={`card stat ${highlight ? "stat--highlight" : ""}`}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
    </div>
  );
}
