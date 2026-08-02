export function formatCompact(value: number | bigint): string {
  if (value >= 1_000_000) return `${(Number(value) / 1_000_000).toFixed(1)}m`;
  else if (value >= 1_000) return `${(Number(value) / 1_000).toFixed(1)}k`;
  else return String(value);
}
