export type Level = "green" | "yellow" | "red";

export const YELLOW_FROM_W = 2000;
export const RED_FROM_W = 4500;
export const SCALE_MAX_W = 8000;

export const LEVEL_LABELS: Record<Level, { name: string; headline: string }> = {
  green: { name: "Verde", headline: "Nível verde · consumo baixo agora" },
  yellow: { name: "Amarelo", headline: "Nível amarelo · consumo moderado agora" },
  red: { name: "Vermelho", headline: "Nível vermelho · consumo alto agora" },
};

export function levelOf(powerW: number): Level {
  if (powerW >= RED_FROM_W) return "red";
  if (powerW >= YELLOW_FROM_W) return "yellow";
  return "green";
}
