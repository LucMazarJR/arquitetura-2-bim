import { useEffect, useState } from "react";
import { api, type Alert, type Forecast, type Goal, type Meter, type MinuteConsumption, type Reading } from "./api";
import { AlertList } from "./components/AlertList";
import { ForecastCard } from "./components/ForecastCard";
import { HistoryBars } from "./components/HistoryBars";
import { LiveChart, type PowerPoint } from "./components/LiveChart";
import { LevelBanner } from "./components/LevelBanner";
import { Measurements } from "./components/Measurements";
import { useHighContrast } from "./useHighContrast";
import { useLiveFeed } from "./useLiveFeed";

const MAX_LIVE_POINTS = 90;
const MAX_ALERTS = 20;

function mergeAlerts(current: Alert[], incoming: Alert[]): Alert[] {
  const byId = new Map([...current, ...incoming].map((alert) => [alert.alertId, alert]));
  return [...byId.values()].sort((a, b) => b.raisedAt.localeCompare(a.raisedAt)).slice(0, MAX_ALERTS);
}

function newest<T>(current: T | null, incoming: T | null, timeField: keyof T): T | null {
  if (!incoming) return current;
  if (!current) return incoming;
  return String(incoming[timeField]) >= String(current[timeField]) ? incoming : current;
}

export function App() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [meterId, setMeterId] = useState<string>();
  const [reading, setReading] = useState<Reading | null>(null);
  const [livePower, setLivePower] = useState<PowerPoint[]>([]);
  const [history, setHistory] = useState<MinuteConsumption[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [highContrast, toggleHighContrast] = useHighContrast();

  useEffect(() => {
    const loadMeters = async () => {
      const list = (await api.meters()) ?? [];
      setMeters(list);
      setMeterId((current) => current ?? list[0]?.meterId);
    };
    loadMeters();
    const timer = window.setInterval(loadMeters, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!meterId) return;
    let active = true;
    const ifActive = <T,>(apply: (value: T) => void) => (value: T) => {
      if (active) apply(value);
    };

    setReading(meters.find((m) => m.meterId === meterId)?.lastReading ?? null);
    setLivePower([]);
    setAlerts([]);
    setForecast(null);
    setGoal(null);
    setHistory([]);

    const loadHistory = () => api.consumption(meterId).then(ifActive((list) => setHistory(list ?? [])));
    api.alerts(meterId).then(ifActive((list) => setAlerts((current) => mergeAlerts(current, list ?? []))));
    api.forecast(meterId).then(ifActive((latest) => setForecast((current) => newest(current, latest, "calculatedAt"))));
    api.goal(meterId).then(ifActive((latest) => setGoal((current) => newest(current, latest, "updatedAt"))));
    loadHistory();

    const timer = window.setInterval(loadHistory, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [meterId]);

  const connected = useLiveFeed((message) => {
    if (message.data.meterId !== meterId) return;

    if (message.type === "reading") {
      const reading = message.data;
      setReading((current) => newest(current, reading, "measuredAt"));
      const point = { time: new Date(reading.measuredAt).getTime(), powerW: reading.powerW };
      setLivePower((points) => [...points, point].slice(-MAX_LIVE_POINTS));
    }
    if (message.type === "alert") setAlerts((current) => mergeAlerts(current, [message.data]));
    if (message.type === "forecast") setForecast((current) => newest(current, message.data, "calculatedAt"));
  });

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              <span className="brand__flag brand__flag--green" />
              <span className="brand__flag brand__flag--yellow" />
              <span className="brand__flag brand__flag--red" />
            </span>
            <div>
              <h1 className="brand__name">Monitor de Energia</h1>
              <p className="brand__sub">Saiba em que nível está o consumo da sua casa</p>
            </div>
          </div>

          <div className="topbar__controls">
            <label className="field">
              <span>Medidor</span>
              <select value={meterId ?? ""} onChange={(e) => setMeterId(e.target.value)}>
                {meters.length === 0 && <option value="">Nenhum medidor ainda</option>}
                {meters.map((m) => (
                  <option key={m.meterId} value={m.meterId}>
                    {m.homeId} · {m.meterId}
                  </option>
                ))}
              </select>
            </label>
            <span className={connected ? "status status--on" : "status"} role="status">
              {connected ? "Ao vivo" : "Desconectado"}
            </span>
            <button type="button" className="toggle" aria-pressed={highContrast} onClick={toggleHighContrast}>
              Alto contraste: {highContrast ? "ligado" : "desligado"}
            </button>
          </div>
        </div>
      </header>

      <main className="layout">
        <LevelBanner reading={reading} />
        <Measurements reading={reading} />
        <LiveChart points={livePower} />
        <ForecastCard
          forecast={forecast}
          goal={goal}
          onSaveGoal={(kwh) => meterId && api.setGoal(meterId, kwh).then(setGoal)}
        />
        <AlertList alerts={alerts} />
        <HistoryBars history={history} />
      </main>
    </div>
  );
}
