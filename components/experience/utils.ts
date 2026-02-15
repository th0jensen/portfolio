export function getBentoSize(index: number): 'large' | 'wide' | 'default' {
	if (index === 0) return 'large'
	if (index === 3) return 'wide'
	return 'default'
}
