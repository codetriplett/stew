import { queue } from '../manage';
import { compare } from './compare';

export function transform (memory, props, content) {
	const { '': core, ...prev } = memory;
	const [, { '': state }, type] = core;

	if (props) {
		if (compare(prev, props) && compare(core[3], content)) return;
		const map = queue[state['']()];
		if (map) map.delete(memory);
		core[3] = content;
	}

	const result = type({ ...(props || memory), '': state }, core[3]);
	if (Array.isArray(result)) return result;
	return result === undefined ? [] : [result];
}
