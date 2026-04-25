const CO2_KEY = "carboncart_co2saved_v1";
const DEMO_SEED_KG = 40;

export function readTotalCO2Saved(): number {
  const raw = localStorage.getItem(CO2_KEY);
  if (raw === null) {
    localStorage.setItem(CO2_KEY, String(DEMO_SEED_KG));
    return DEMO_SEED_KG;
  }
  return Math.max(0, parseFloat(raw) || 0);
}

export function addCO2Saved(kg: number): number {
  const next = readTotalCO2Saved() + kg;
  localStorage.setItem(CO2_KEY, String(next));
  return next;
}

export function getMonsterStage(co2Saved: number): 1 | 2 | 3 | 4 | 5 {
  if (co2Saved < 5) return 1;
  if (co2Saved < 15) return 2;
  if (co2Saved < 30) return 3;
  if (co2Saved < 50) return 4;
  return 5;
}
