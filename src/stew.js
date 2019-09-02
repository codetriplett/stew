import { parse } from './parse';
import { dynamo } from './dynamo';

export default function (input, state) {
	if (typeof input === 'string') {
		return parse(input);
	}

	return dynamo(input, state);
}
