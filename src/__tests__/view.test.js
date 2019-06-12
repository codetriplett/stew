import { view } from '../view';

describe('view', () => {
	it.skip('should prepare a component', () => {
		const object = {
			one: 1,
			parent: {
				two: 2,
				child: {
					three: 3
				}
			}
		};

		const actual = view({
			attribute: 'one && three || two'
		}, object, 'parent', 'child');

		const attributes = {};
		const instance = actual({ attributes });

		instance();
		expect(attributes).toEqual({ attribute: 3 });

		object.parent.child.three = 9;
		instance();
		expect(attributes).toEqual({ attribute: 9 });
	});
});
