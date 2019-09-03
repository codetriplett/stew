import { parse } from './parse';
import { render } from './render';

export default function (input, state) {
	if (typeof input === 'string') {
		return parse(input);
	}

	return render(input, state);
}
