let currentRefRoot, prevRefRoot;

export function print (ref) {
	if (!Array.isArray(ref)) {
		return String(ref || '');
	}

	const [tagName,, node, ...children] = ref;

	if (!node) {
		return children.map(print).join('');
	} else if (tagName === node) {
		return '';
	} else if (!Array.isArray(node)) {
		return String(node);
	}

	return print(node[2]);
}

function checkStep (prevRef, currentRef, expectations) {
	expect(expectations?.length).toEqual(currentRef?.length);

	return currentRef.map((currentValue, i) => {
		const prevValue = prevRef[i];
		const expected = expectations[i];

		if (Array.isArray(expected)) {
			return checkStep(prevValue, currentValue, expected);
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
		prevRefRoot = checkStep(prevRefRoot, currentRefRoot, refExpectations);
	}

	return actualString;
}

function clone (ref) {
	return Array.isArray(ref) ? ref.map(clone) : ref;
}

export function track (ref) {
	currentRefRoot = ref;
	prevRefRoot = clone(ref);
	return ref;
}

export const text = {
	nextSibling: null,
	toString: expect.any(Function),
};

export const fragment = {
	...text,
	appendChild: expect.any(Function),
	insertBefore: expect.any(Function),
	removeChild: expect.any(Function),
	querySelector: expect.any(Function),
	querySelectorAll: expect.any(Function),
};

export const element = {
	...fragment,
	nextSibling: null,
	style: expect.any(Object),
	dataset: expect.any(Object),
};
