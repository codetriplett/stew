import { render } from './render';
import { evaluate } from './evaluate';
import { modify } from './modify';

export function traverse (values, ...parameters) {
	const children = values.map(child => {
		if (!Array.isArray(child)) {
			return render(child, ...parameters);
		}

		const values = evaluate(child, ...parameters);
		return modify(values, '', ...parameters);
	});

	return children.join('');
}
