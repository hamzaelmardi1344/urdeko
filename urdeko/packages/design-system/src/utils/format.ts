const madFormatter = new Intl.NumberFormat("fr-MA", {
  style: "decimal",
  maximumFractionDigits: 0,
});

export function formatMad(value: number): string {
  return `${madFormatter.format(value)} MAD`;
}
