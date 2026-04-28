export function formatMAD(value: number): string {
  return `${(value / 100).toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`;
}
