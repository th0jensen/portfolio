/**
 * Smooth scrolls to an element by its ID with an offset for the fixed header
 * @param id - The ID of the element to scroll to
 * @param headerHeight - The height of the fixed header (default: 64px for h-16)
 */
export function smoothScrollTo(id: string, headerHeight = 64): void {
	const element = document.getElementById(id)
	if (element) {
		const topPosition = element.getBoundingClientRect().top +
			globalThis.pageYOffset - headerHeight
		globalThis.scrollTo({
			top: topPosition,
			behavior: 'smooth',
		})
	}
}
