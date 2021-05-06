import { parse } from '../markup';

export function normalize (it, params, i, prev, props) {
	if (typeof it === 'function') {
		const active = i !== undefined;
		if (!active && !params) return;
		it = active && params || props ? it({ ...props, '': prev }) : it();
		if (typeof it === 'function') return active ? it : undefined;
		else if (!params) return;
	}

	if (!it && it !== 0 || it === true) {
		return;
	} else if (params && typeof it === 'string') {
		it = prev && it === params[i] ? prev : parse(it);
	}

	if (typeof it !== 'object') return { '': [String(it)] };
	else if (Array.isArray(it)) return { '': [it,, ''] };
	return it;
}
