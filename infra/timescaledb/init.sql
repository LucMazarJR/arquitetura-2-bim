CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE SCHEMA ingestion;
CREATE SCHEMA analysis;
CREATE SCHEMA forecast;
CREATE SCHEMA notification;
CREATE SCHEMA monitoring;

CREATE TABLE ingestion.readings (
  reading_id    TEXT             NOT NULL,
  home_id       TEXT             NOT NULL,
  meter_id      TEXT             NOT NULL,
  measured_at   TIMESTAMPTZ      NOT NULL,
  voltage_v     DOUBLE PRECISION NOT NULL,
  current_a     DOUBLE PRECISION NOT NULL,
  power_w       DOUBLE PRECISION NOT NULL,
  energy_kwh    DOUBLE PRECISION NOT NULL,
  frequency_hz  DOUBLE PRECISION NOT NULL,
  power_factor  DOUBLE PRECISION NOT NULL,
  received_at   TIMESTAMPTZ      NOT NULL DEFAULT now(),
  PRIMARY KEY (meter_id, measured_at)
);
SELECT create_hypertable('ingestion.readings', 'measured_at');
SELECT add_retention_policy('ingestion.readings', INTERVAL '90 days');

CREATE TABLE analysis.alerts (
  alert_id        UUID             PRIMARY KEY,
  home_id         TEXT             NOT NULL,
  meter_id        TEXT             NOT NULL,
  rule            TEXT             NOT NULL,
  severity        TEXT             NOT NULL,
  message         TEXT             NOT NULL,
  measured_value  DOUBLE PRECISION NOT NULL,
  limit_value     DOUBLE PRECISION NOT NULL,
  raised_at       TIMESTAMPTZ      NOT NULL
);

CREATE TABLE forecast.month_start (
  meter_id          TEXT             NOT NULL,
  month             TEXT             NOT NULL,
  home_id           TEXT             NOT NULL,
  start_energy_kwh  DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (meter_id, month)
);

CREATE TABLE forecast.forecasts (
  id                   BIGSERIAL        PRIMARY KEY,
  home_id              TEXT             NOT NULL,
  meter_id             TEXT             NOT NULL,
  month                TEXT             NOT NULL,
  consumed_so_far_kwh  DOUBLE PRECISION NOT NULL,
  projected_kwh        DOUBLE PRECISION NOT NULL,
  projected_cost       DOUBLE PRECISION NOT NULL,
  tariff_per_kwh       DOUBLE PRECISION NOT NULL,
  calculated_at        TIMESTAMPTZ      NOT NULL
);

CREATE TABLE notification.deliveries (
  alert_id  UUID        NOT NULL,
  channel   TEXT        NOT NULL,
  success   BOOLEAN     NOT NULL,
  detail    TEXT,
  sent_at   TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (alert_id, channel)
);

CREATE TABLE monitoring.consumption_per_minute (
  meter_id        TEXT             NOT NULL,
  home_id         TEXT             NOT NULL,
  minute          TIMESTAMPTZ      NOT NULL,
  energy_min_kwh  DOUBLE PRECISION NOT NULL,
  energy_max_kwh  DOUBLE PRECISION NOT NULL,
  power_min_w     DOUBLE PRECISION NOT NULL,
  power_max_w     DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (meter_id, minute)
);
SELECT create_hypertable('monitoring.consumption_per_minute', 'minute');

CREATE TABLE monitoring.alerts (
  alert_id   UUID        PRIMARY KEY,
  home_id    TEXT        NOT NULL,
  meter_id   TEXT        NOT NULL,
  rule       TEXT        NOT NULL,
  severity   TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  raised_at  TIMESTAMPTZ NOT NULL
);
