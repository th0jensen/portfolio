export const calculateAge = (birthday: string): number => {
	const [month, day, year] = birthday.split('-').map(Number)
	const [birthDate, today] = [new Date(year, month - 1, day), new Date()]
	const [age, monthDiff] = [
		today.getFullYear() - birthDate.getFullYear(),
		today.getMonth() - birthDate.getMonth(),
	]

	if (
		monthDiff < 0 ||
		(monthDiff === 0 && today.getDate() < birthDate.getDate())
	) {
		return age - 1
	}
	return age
}
