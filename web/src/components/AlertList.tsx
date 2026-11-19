import type { Alert } from "../api";

export function AlertList({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="card">
      <div className="chart__header">
        <span>Alerts</span>
        <span className="muted">{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <p className="muted">No alerts. Everything looks normal.</p>
      ) : (
        <ul className="alerts">
          {alerts.map((alert) => (
            <li key={alert.alertId} className={`alerts__item alerts__item--${alert.severity}`}>
              <span>{alert.message}</span>
              <time className="muted">{new Date(alert.raisedAt).toLocaleTimeString()}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
