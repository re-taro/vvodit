export type WeakCache<T> = WeakMap<object, [WeakCache<T>, T] | [WeakCache<T>]>;

function getWeakCacheItem<T>(
	cache: WeakCache<T>,
	deps: readonly object[],
): T | undefined {
	while (true) {
		const [dep, ...rest] = deps;
		const entry = cache.get(dep as object);
		if (typeof entry === "undefined")
			return;

		if (rest.length === 0)
			return entry[1];

		cache = entry[0];
		deps = rest;
	}
}

function setWeakCacheItem<T>(
	cache: WeakCache<T>,
	deps: readonly object[],
	item: T,
): void {
	while (true) {
		const [dep, ...rest] = deps;
		let entry = cache.get(dep as object);
		if (typeof entry === "undefined") {
			entry = [new WeakMap()];
			cache.set(dep as object, entry);
		}
		if (rest.length === 0) {
			entry[1] = item;
			return;
		}
		cache = entry[0];
		deps = rest;
	}
}

export function createWeakCache(): <T extends object, Deps extends readonly object[]>(createCache: () => T, deps: Deps) => T {
	const cache: WeakCache<unknown> = new WeakMap();
	const weakCache = <T extends object, Deps extends readonly object[]>(
		createCache: () => T,
		deps: Deps,
	) => {
		const cached = getWeakCacheItem(cache, deps);
		if (typeof cached !== "undefined")
			return cached as T;

		const created = createCache();
		setWeakCacheItem(cache, deps, created);

		return created;
	};

	return weakCache;
}

if (import.meta.vitest) {
	const { describe, expect, test } = import.meta.vitest;

	describe("WeakCache", () => {
		test("order matters", () => {
			const weakCache = createWeakCache();

			const first = {};
			const second = {};
			let i = 0;
			const fn = () => ({
				value: i++,
			});

			const firstValue = weakCache(fn, [first, second]);
			const secondValue = weakCache(fn, [first, second]);
			const thirdValue = weakCache(fn, [second, first]);

			expect(secondValue).toBe(firstValue);
			expect(thirdValue).not.toBe(firstValue);
		});
	});
}
