import { prepareState } from '../prepare-state';
import { prepareComponent } from '../prepare-component';

describe('prepare-component', () => {
	it('should prepare a component', () => {
		const state = prepareState({ one: 1, two: 2, three: 3 });
		const actual = {};

		const component = prepareComponent({
			attribute: 'one && two || three'
		}, state);

		component(actual);
		expect(actual).toEqual({ attribute: 2 });

		state.two = 4;

		expect(actual).toEqual({ attribute: 4 });
	});
});
