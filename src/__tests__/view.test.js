import { view } from '../view';

describe('view', () => {
	it('should prepare a component', () => {
		const object = { one: 1, two: 2, three: 3 };

		const actual = view({
			attribute: 'one && two || three'
		}, object);

		const attributes = {};
		const instance = actual({ attributes });

		instance();
		expect(attributes).toEqual({ attribute: 2 });

		object.two = 4;
		instance();
		expect(attributes).toEqual({ attribute: 4 });
	});
	
	it('should prepare a nested component', () => {
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
