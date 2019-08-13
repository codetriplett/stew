import { parse } from './parse';
import { traverse } from './traverse';

export default function stew (template, state) {
	if (typeof template === 'string') {
		return parse(template);
	} else if (typeof template !== 'object') {
		return;
	}
	
	if (typeof state === 'object' && !Array.isArray(state)) {
		return traverse(template, state);
	} else if (state !== undefined) {
		return;
	}
}
