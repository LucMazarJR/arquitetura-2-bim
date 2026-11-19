import mqtt from "mqtt";
import { Home } from "./home";

const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const HOMES = Number(process.env.HOMES ?? 2);
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 2000);
const INVALID_RATE = Number(process.env.INVALID_RATE ?? 0.01);

function startMeter(homeId: string, meterId: string) {
  const log = (message: string) => console.log(`${new Date().toISOString().slice(11, 19)} [${meterId}] ${message}`);
  const home = new Home(log);
  const topic = `energy/${homeId}/${meterId}/reading`;
  const client = mqtt.connect(MQTT_URL, { clientId: `esp32-${meterId}`, reconnectPeriod: 2000 });

  client.on("connect", () => log(`connected to ${MQTT_URL}, publishing to ${topic}`));
  client.on("error", (error) => log(`MQTT error: ${error.message}`));

  setInterval(() => {
    if (!client.connected) return;

    const reading = home.next(INTERVAL_MS / 1000);
    const sendInvalid = Math.random() < INVALID_RATE;
    const payload = sendInvalid ? { ...reading, pf: 1.7 } : reading;
    if (sendInvalid) log("sending an invalid reading on purpose (pf=1.7)");

    client.publish(topic, JSON.stringify(payload), { qos: 1 });
  }, INTERVAL_MS);
}

for (let n = 1; n <= HOMES; n++) {
  const id = String(n).padStart(2, "0");
  startMeter(`home-${id}`, `meter-${id}`);
}
