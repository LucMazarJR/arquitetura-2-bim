#include <WiFi.h>
#include <MQTT.h>
#include <time.h>

const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASSWORD = "";

const char* MQTT_HOST = "broker.emqx.io";
const int MQTT_PORT = 1883;

const char* HOME_ID = "home-wokwi";
const char* METER_ID = "meter-wokwi";

const int LOAD_PIN = 34;
const int SHOWER_PIN = 27;
const int VOLTAGE_DROP_PIN = 26;

const unsigned long PUBLISH_INTERVAL_MS = 2000;
const float SHOWER_POWER_W = 5500;
const int MQTT_QOS = 1;

struct MeterReading {
  float voltage;
  float current;
  float power;
  double energyWh;
  float frequency;
  float powerFactor;
};

WiFiClient wifiClient;
MQTTClient mqtt(256);

char topic[96];
double energyWh = 1250000;
unsigned long lastPublishAt = 0;

MeterReading readMeter(float seconds) {
  float loadW = map(analogRead(LOAD_PIN), 0, 4095, 80, 3000);
  bool showerOn = digitalRead(SHOWER_PIN) == LOW;
  bool voltageDrop = digitalRead(VOLTAGE_DROP_PIN) == LOW;

  float power = loadW + (showerOn ? SHOWER_POWER_W : 0);
  float voltage = voltageDrop
    ? random(1930, 1990) / 10.0
    : 220.0 + random(-15, 15) / 10.0 - power / 1000.0 * 0.6;
  float powerFactor = random(93, 99) / 100.0;
  float frequency = 60.0 + random(-5, 5) / 100.0;

  energyWh += power * seconds / 3600.0;

  return { voltage, power / (voltage * powerFactor), power, energyWh, frequency, powerFactor };
}

void connectWifi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.println(" connected");
}

void syncClock() {
  Serial.print("Syncing clock");
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  while (time(nullptr) < 1700000000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println(" done");
}

void connectMqtt() {
  while (!mqtt.connected()) {
    String clientId = String("esp32-") + METER_ID + "-" + String(random(0xffff), HEX);
    Serial.printf("Connecting to MQTT %s:%d... ", MQTT_HOST, MQTT_PORT);
    if (mqtt.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.printf("failed (error %d), retrying\n", mqtt.lastError());
      delay(2000);
    }
  }
}

void publishReading(const MeterReading& r) {
  char payload[192];
  snprintf(payload, sizeof(payload),
    "{\"v\":%.1f,\"i\":%.2f,\"p\":%.1f,\"e\":%.0f,\"f\":%.2f,\"pf\":%.2f,\"ts\":%ld}",
    r.voltage, r.current, r.power, r.energyWh, r.frequency, r.powerFactor, (long) time(nullptr));

  bool delivered = mqtt.publish(topic, payload, false, MQTT_QOS);
  Serial.printf("%s %s %s\n", delivered ? "sent" : "FAILED", topic, payload);
}

void setup() {
  Serial.begin(115200);
  pinMode(SHOWER_PIN, INPUT_PULLUP);
  pinMode(VOLTAGE_DROP_PIN, INPUT_PULLUP);
  randomSeed(esp_random());
  snprintf(topic, sizeof(topic), "energy/%s/%s/reading", HOME_ID, METER_ID);

  connectWifi();
  syncClock();
  mqtt.begin(MQTT_HOST, MQTT_PORT, wifiClient);
  connectMqtt();
}

void loop() {
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastPublishAt >= PUBLISH_INTERVAL_MS) {
    float seconds = lastPublishAt == 0 ? PUBLISH_INTERVAL_MS / 1000.0 : (now - lastPublishAt) / 1000.0;
    lastPublishAt = now;
    publishReading(readMeter(seconds));
  }
}
