/**
 * localStorage that never throws: private windows, blocked site data and
 * quota errors fall back to the default instead of breaking the app.
 */
export const readJSON = <T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T => {
	try {
		const raw = localStorage.getItem(key);
		if (raw === null) return fallback;
		const value: unknown = JSON.parse(raw);
		return isValid(value) ? value : fallback;
	} catch {
		return fallback;
	}
};

export const writeJSON = (key: string, value: unknown) => {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage is a convenience here; the in-memory state is still correct.
	}
};
