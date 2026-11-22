import { useEffect, useState, type FormEvent } from "react";
import type { Forecast, Goal } from "../api";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

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
    const value = Number(goalInput);
    if (value > 0) onSaveGoal(value);
  }

  const overGoal = forecast && goal && forecast.projectedKwh > goal.monthlyGoalKwh;

  return (
    <div className="card forecast">
      <span className="stat__label">Forecast for {forecast?.month ?? "this month"}</span>
      {forecast ? (
        <>
          <span className="forecast__cost">{currency.format(forecast.projectedCost)}</span>
          <span className="muted">
            {forecast.projectedKwh.toFixed(1)} kWh projected · {forecast.consumedSoFarKwh.toFixed(2)} kWh so far ·{" "}
            {currency.format(forecast.tariffPerKwh)}/kWh
          </span>
        </>
      ) : (
        <span className="muted">Calculating...</span>
      )}

      <form className="goal" onSubmit={submit}>
        <label htmlFor="goal-input">Monthly goal (kWh)</label>
        <div className="goal__row">
          <input
            id="goal-input"
            type="number"
            min="1"
            step="any"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            placeholder="e.g. 150"
          />
          <button type="submit">Save goal</button>
        </div>
        {goal && (
          <span className={overGoal ? "goal__status goal__status--over" : "goal__status"}>
            {overGoal ? "Projection is above the goal" : "Projection is within the goal"}
          </span>
        )}
      </form>
    </div>
  );
}
