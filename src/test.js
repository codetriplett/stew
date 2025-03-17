let currentRefRoot, prevRefRoot;

export function print (ref) {
	if (!Array.isArray(ref)) {
		return String(ref || '');
	}

	const node = ref[2];

	if (!node) {
		return ref.slice(3).map(print).join('');
	}

	return Array.isArray(node) ? print(node) : String(node);
}

function checkStep (expectations, prevRef, currentRef) {
	expect(expectations.length).toBeGreaterThanOrEqual(prevRef.length);

	return expectations.map((expected, i) => {
		const prevValue = prevRef[i];
		const currentValue = currentRef[i];

		if (Array.isArray(expected)) {
			return check(expected, prevValue, currentValue);
		} else if (expected === false) {
			expect(currentValue).not.toBe(prevValue);
		} else if (expected === true) {
			expect(currentValue).toBe(prevValue);
		} else {
			expect(currentValue).toEqual(expected);
		}

		return currentValue;
	});
}

export function check (expectedString, refExpectations) {
	const actualString = print(currentRefRoot); 
	expect(actualString).toEqual(expectedString);

	if (refExpectations) {
		prevRefRoot = checkStep(refExpectations, prevRefRoot, currentRefRoot);
	}
}

export function track (ref) {
	currentRefRoot = ref;
	prevRefRoot = checkStep(Array(ref.length).fill(true), ref, ref);
	return ref;
}
