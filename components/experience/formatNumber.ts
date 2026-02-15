export function formatNumber(num: number): string {
	const abs = Math.abs(num)

	if (abs >= 1_000_000_000) {
		return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'b'
	}
	if (abs >= 1_000_000) {
		return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm'
	}
	if (abs >= 1000) {
		return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
	}
	return num.toString()
}
