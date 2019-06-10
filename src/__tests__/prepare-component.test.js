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
	
	it('should prepare a nested component', () => {
		const state = prepareState({
			one: 1,
			parent: {
				two: 2,
				child: {
					three: 3
				}
			}
		});

		const actual = {};

		const component = prepareComponent({
			attribute: 'one && three || two'
		}, state, 'parent', 'child');

		component(actual);
		expect(actual).toEqual({ attribute: 3 });

		state.parent.child.three = 9;

		expect(actual).toEqual({ attribute: 9 });
	});
});
