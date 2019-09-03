import { traverse } from '../traverse';

describe('traverse', () => {
	it('joins children', () => {
		const actual = traverse([['('], { '': ['img'] }, [')']], {});
		expect(actual).toBe('(<img>)');
	});
});
