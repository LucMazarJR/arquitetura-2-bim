export interface DeviceReading {
  v: number;
  i: number;
  p: number;
  e: number;
  f: number;
  pf: number;
  ts: number;
}

interface Appliance {
  name: string;
  powerW: number;
  chancePerSecond: number;
  minSeconds: number;
  maxSeconds: number;
  secondsLeft: number;
}

const noise = () => Math.random() + Math.random() + Math.random() - 1.5;
const between = (min: number, max: number) => min + Math.random() * (max - min);
const round = (value: number, decimals: number) => Math.round(value * 10 ** decimals) / 10 ** decimals;

export class Home {
  private energyWh = between(1_200_000, 1_300_000);
  private fridgeOn = false;
  private fridgeSecondsLeft = 0;
  private voltageDropSecondsLeft = 0;

  private appliances: Appliance[] = [
    { name: "shower", powerW: 5500, chancePerSecond: 1 / 120, minSeconds: 30, maxSeconds: 90, secondsLeft: 0 },
    { name: "microwave", powerW: 1200, chancePerSecond: 1 / 150, minSeconds: 20, maxSeconds: 60, secondsLeft: 0 },
    { name: "air conditioner", powerW: 1400, chancePerSecond: 1 / 400, minSeconds: 120, maxSeconds: 300, secondsLeft: 0 },
    { name: "tv", powerW: 120, chancePerSecond: 1 / 90, minSeconds: 120, maxSeconds: 600, secondsLeft: 0 },
  ];

  constructor(private log: (message: string) => void) {}

  next(seconds: number): DeviceReading {
    const powerW = this.updateLoad(seconds);
    const voltageV = this.updateVoltage(seconds, powerW);
    const powerFactor = between(0.93, 0.99);

    this.energyWh += (powerW * seconds) / 3600;

    return {
      v: round(voltageV, 1),
      i: round(powerW / (voltageV * powerFactor), 2),
      p: round(powerW, 1),
      e: Math.round(this.energyWh),
      f: round(60 + noise() * 0.05, 2),
      pf: round(powerFactor, 2),
      ts: Math.floor(Date.now() / 1000),
    };
  }

  private updateLoad(seconds: number): number {
    let powerW = between(90, 120);

    this.fridgeSecondsLeft -= seconds;
    if (this.fridgeSecondsLeft <= 0) {
      this.fridgeOn = !this.fridgeOn;
      this.fridgeSecondsLeft = this.fridgeOn ? 40 : 60;
    }
    if (this.fridgeOn) powerW += 150;

    for (const appliance of this.appliances) {
      if (appliance.secondsLeft > 0) {
        appliance.secondsLeft -= seconds;
        if (appliance.secondsLeft <= 0) this.log(`${appliance.name} turned off`);
      } else if (Math.random() < appliance.chancePerSecond * seconds) {
        appliance.secondsLeft = between(appliance.minSeconds, appliance.maxSeconds);
        this.log(`${appliance.name} turned on (${appliance.powerW} W)`);
      }
      if (appliance.secondsLeft > 0) powerW += appliance.powerW * between(0.97, 1.03);
    }

    return powerW;
  }

  private updateVoltage(seconds: number, powerW: number): number {
    if (this.voltageDropSecondsLeft > 0) {
      this.voltageDropSecondsLeft -= seconds;
      return between(193, 199);
    }
    if (Math.random() < seconds / 300) {
      this.voltageDropSecondsLeft = between(6, 12);
      this.log("voltage drop on the grid");
    }
    return 220 + noise() * 1.2 - (powerW / 1000) * 0.6;
  }
}
