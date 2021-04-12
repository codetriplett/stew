import { trigger } from '../manage';

export function createCtx (callback, elm, ctx) {
	if (callback === undefined) return [[]];

	function state (input) {
		switch (typeof input) {
			case 'string': {
				if (!input) return ctx && ctx[''][1][''];
				const [, node, type] = refs[input] || [];
				return typeof type === 'function' ? node[''] : node;
			}
			case 'undefined': return object;
			case 'object': break;
			default: return;
		}

		Object.assign(object, input);
		trigger(memory, elm);
	}

	const object = {};
	const refs = { '': state };
	const memory = { '': [, refs, callback] };

	return memory;
}
