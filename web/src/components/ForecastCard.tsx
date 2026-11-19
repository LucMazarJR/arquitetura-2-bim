import type { Forecast } from "../api";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ForecastCard({ forecast }: { forecast: Forecast | null }) {
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
    </div>
  );
}
