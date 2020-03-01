import { locate } from './locate';
import { render } from '.';

export function traverse (children, container) {
	if (!container) {
		return children.map(it => render(it));
	}

	let element;

	for (let i = children.length - 1; i >= 0; i--) {
		const it = children[i];
		
		element = locate(it, container, element);
		render(it, element);
	}
}
