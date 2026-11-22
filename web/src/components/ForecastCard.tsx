import { useEffect, useState, type FormEvent } from "react";
import type { Forecast, Goal } from "../api";
import { formatCurrency, formatMonth, formatNumber } from "../format";
import { Panel } from "./Panel";

interface ForecastCardProps {
  forecast: Forecast | null;
  goal: Goal | null;
  onSaveGoal: (monthlyGoalKwh: number) => void;
}

export function ForecastCard({ forecast, goal, onSaveGoal }: ForecastCardProps) {
  const [goalInput, setGoalInput] = useState("");

  useEffect(() => {
    setGoalInput(goal ? String(goal.monthlyGoalKwh) : "");
  }, [goal]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(goalInput.replace(",", "."));
    if (value > 0) onSaveGoal(value);
  }

  return (
    <Panel
      number="03"
      title="Previsão do mês"
      aside={forecast ? formatMonth(forecast.month) : undefined}
      className="panel--forecast"
    >
      {forecast ? (
        <div className="forecast">
          <p className="forecast__cost" data-testid="forecast-cost">
            {formatCurrency(forecast.projectedCost)}
          </p>
          <dl className="forecast__facts">
            <div>
              <dt>Previsto no mês</dt>
              <dd>{formatNumber(forecast.projectedKwh, 1)} kWh</dd>
            </div>
            <div>
              <dt>Consumido até agora</dt>
              <dd>{formatNumber(forecast.consumedSoFarKwh, 2)} kWh</dd>
            </div>
            <div>
              <dt>Tarifa</dt>
              <dd>{formatCurrency(forecast.tariffPerKwh)}/kWh</dd>
            </div>
          </dl>
          {goal && <GoalMeter projectedKwh={forecast.projectedKwh} goalKwh={goal.monthlyGoalKwh} />}
        </div>
      ) : (
        <p className="empty">Calculando a previsão…</p>
      )}

      <form className="goal" onSubmit={submit}>
        <label htmlFor="goal-input">Meta mensal (kWh)</label>
        <div className="goal__row">
          <input
            id="goal-input"
            type="text"
            inputMode="decimal"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="ex.: 150"
          />
          <button type="submit">Salvar meta</button>
        </div>
      </form>
    </Panel>
  );
}

function GoalMeter({ projectedKwh, goalKwh }: { projectedKwh: number; goalKwh: number }) {
  const ratio = projectedKwh / goalKwh;
  const over = ratio > 1;

  return (
    <div className={over ? "goal-meter goal-meter--over" : "goal-meter"}>
      <div className="goal-meter__track" aria-hidden="true">
        <div className="goal-meter__fill" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
      <p className="goal-meter__status" role="status">
        {over
          ? `Previsão acima da meta: ${formatNumber(ratio * 100)}% de ${formatNumber(goalKwh)} kWh`
          : `Previsão dentro da meta: ${formatNumber(ratio * 100)}% de ${formatNumber(goalKwh)} kWh`}
      </p>
    </div>
  );
}
