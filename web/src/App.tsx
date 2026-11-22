import { useEffect, useState } from "react";
import { api, type Alert, type Forecast, type Goal, type Meter, type MinuteConsumption, type Reading } from "./api";
import { AlertList } from "./components/AlertList";
import { ForecastCard } from "./components/ForecastCard";
import { HistoryBars } from "./components/HistoryBars";
import { LiveChart, type PowerPoint } from "./components/LiveChart";
import { StatCard } from "./components/StatCard";
import { useLiveFeed } from "./useLiveFeed";

const MAX_LIVE_POINTS = 90;

export function App() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [meterId, setMeterId] = useState<string>();
  const [reading, setReading] = useState<Reading | null>(null);
  const [livePower, setLivePower] = useState<PowerPoint[]>([]);
  const [history, setHistory] = useState<MinuteConsumption[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

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
    setReading(meters.find((m) => m.meterId === meterId)?.lastReading ?? null);
    setLivePower([]);

    const loadHistory = async () => setHistory((await api.consumption(meterId)) ?? []);
    api.alerts(meterId).then((list) => setAlerts(list ?? []));
    api.forecast(meterId).then(setForecast);
    api.goal(meterId).then(setGoal);
    loadHistory();

    const timer = window.setInterval(loadHistory, 30_000);
    return () => window.clearInterval(timer);
  }, [meterId]);

  const connected = useLiveFeed((message) => {
    if (message.data.meterId !== meterId) return;

    if (message.type === "reading") {
      setReading(message.data);
      const point = { time: new Date(message.data.measuredAt).getTime(), powerW: message.data.powerW };
      setLivePower((points) => [...points, point].slice(-MAX_LIVE_POINTS));
    }
    if (message.type === "alert") setAlerts((list) => [message.data, ...list].slice(0, 20));
    if (message.type === "forecast") setForecast(message.data);
  });

  return (
    <main className="layout">
      <header className="header">
        <div>
          <h1>Energy Monitor</h1>
          <span className={`status ${connected ? "status--on" : ""}`}>{connected ? "live" : "offline"}</span>
        </div>
        <select value={meterId ?? ""} onChange={(e) => setMeterId(e.target.value)} aria-label="Meter">
          {meters.length === 0 && <option value="">No meters yet</option>}
          {meters.map((m) => (
            <option key={m.meterId} value={m.meterId}>
              {m.homeId} / {m.meterId}
            </option>
          ))}
        </select>
      </header>

      <section className="stats">
        <StatCard label="Power" value={reading ? Math.round(reading.powerW).toLocaleString() : "-"} unit="W" highlight />
        <StatCard label="Voltage" value={reading ? reading.voltageV.toFixed(1) : "-"} unit="V" />
        <StatCard label="Current" value={reading ? reading.currentA.toFixed(2) : "-"} unit="A" />
        <StatCard label="Power factor" value={reading ? reading.powerFactor.toFixed(2) : "-"} />
      </section>

      <LiveChart points={livePower} />

      <section className="grid">
        <ForecastCard
          forecast={forecast}
          goal={goal}
          onSaveGoal={(kwh) => meterId && api.setGoal(meterId, kwh).then(setGoal)}
        />
        <AlertList alerts={alerts} />
      </section>

      <HistoryBars history={history} />
    </main>
  );
}
