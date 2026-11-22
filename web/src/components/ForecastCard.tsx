import { useEffect, useState, type FormEvent } from "react";
import type { Forecast, Goal } from "../api";
import { formatCurrency, formatMonth, formatNumber } from "../format";
import { Card } from "./Card";

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
    <Card
      title="Previsão do mês"
      aside={forecast ? formatMonth(forecast.month) : undefined}
      className="card--forecast"
    >
      {forecast ? (
        <>
          <p className="forecast__cost" data-testid="forecast-cost">
            {formatCurrency(forecast.projectedCost)}
          </p>
          <p className="forecast__facts">
            {formatNumber(forecast.projectedKwh, 1)} kWh previstos · {formatNumber(forecast.consumedSoFarKwh, 2)} kWh
            até agora · {formatCurrency(forecast.tariffPerKwh)}/kWh
          </p>
          {goal && <GoalStatus projectedKwh={forecast.projectedKwh} goalKwh={goal.monthlyGoalKwh} />}
        </>
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
          <button type="submit" className="button">
            Salvar meta
          </button>
        </div>
      </form>
    </Card>
  );
}

function GoalStatus({ projectedKwh, goalKwh }: { projectedKwh: number; goalKwh: number }) {
  const percent = formatNumber((projectedKwh / goalKwh) * 100);
  const over = projectedKwh > goalKwh;

  return (
    <p className={over ? "goal-status goal-status--over" : "goal-status"} role="status">
      <span className="goal-status__mark" aria-hidden="true">
        {over ? "!" : "✓"}
      </span>
      {over ? "Previsão acima da meta" : "Previsão dentro da meta"}: {percent}% de {formatNumber(goalKwh)} kWh
    </p>
  );
}
