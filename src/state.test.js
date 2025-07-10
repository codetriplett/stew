import { stack } from './impulse';
import createState from './state';

jest.mock('./document', () => ({ isServer: false }));

beforeEach(() => {
	globalThis.requestAnimationFrame = setTimeout;
});

describe('createState', () => {
	it('creates state', () => {
		const actual = createState({ lmno: 456 });
		expect(actual).toEqual({ lmno: 456 });
	});
	
	it('callbacks are bound', () => {
		const actual = createState({
			callback: function () {
				context = this;
			},
		});

		let context;
		actual.callback();
		expect(actual).toEqual(context);
	});
	
	it('subscribes impulse', async () => {
		const actual = createState({ lmno: 123 });
		const subscriptions = new Set();
		const update = jest.fn();
		stack.unshift([, [update, subscriptions]]);
		actual.lmno;
		stack.shift();
		expect(subscriptions).toEqual(new Set([expect.any(Set)]));
		actual.lmno = 789;
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(update).toHaveBeenCalled();
	});
});
