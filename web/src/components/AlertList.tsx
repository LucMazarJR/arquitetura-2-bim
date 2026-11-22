import type { Alert } from "../api";
import { formatTime } from "../format";
import { Card } from "./Card";

const SEVERITY_LABELS: Record<Alert["severity"], string> = {
  warning: "Aviso",
  critical: "Crítico",
};

export function AlertList({ alerts }: { alerts: Alert[] }) {
  return (
    <Card title="Alertas" aside={alerts.length > 0 ? `${alerts.length} recentes` : undefined} className="card--alerts">
      {alerts.length === 0 ? (
        <p className="empty empty--ok">Nenhum alerta. Tudo normal por aqui.</p>
      ) : (
        <ul className="alerts">
          {alerts.map((alert) => (
            <li key={alert.alertId} className={`alert alert--${alert.severity}`}>
              <span className="alert__tag">{SEVERITY_LABELS[alert.severity]}</span>
              <div className="alert__body">
                <span className="alert__message">{alert.message}</span>
                <time className="alert__time" dateTime={alert.raisedAt}>
                  {formatTime(alert.raisedAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
