import { impulses } from './impulse';
import { createState } from './state';

jest.mock('./document', () => ({ isServer: false }));

describe('createState', () => {
	it('creates state', () => {
		const actual = createState({ lmno: 456 });
		expect(actual).toEqual({ lmno: 456 });
	});
	
	it('subscribes impulse', async () => {
		const actual = createState({ lmno: 123 });
		const subscriptions = new Set();
		const impulse = jest.fn();
		const unsubscribe = jest.fn();
		impulses.unshift([impulse, [unsubscribe], subscriptions]);
		actual.lmno;
		impulses.shift();
		expect(subscriptions).toEqual(new Set([expect.any(Set)]));
		actual.lmno = 789;
		await new Promise(resolve => setTimeout(resolve, 10));
		expect(unsubscribe).toHaveBeenCalled();
		expect(impulse).toHaveBeenCalled();
	});
});
