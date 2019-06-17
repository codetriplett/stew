import { State } from '../State';

describe('State', () => {
	describe('constuctor', () => {
		it('should initialize with given props and store', () => {
			const props = {};
			const store = {};
			const actual = new State(props, store);

			expect(actual).toEqual({ props, store });
		});

		it('should initialize with new store', () => {
			const props = {};
			const actual = new State(props);

			expect(actual).toEqual({ props, store: {} });
		});
	});

	describe('traverse', () => {
		const resolve = jest.fn();
		let store;
		let state;

		beforeEach(() => {
			store = {};
			state = new State({}, store);
			state.resolve = resolve.mockClear();
			state.active = true;
			state.traverse({ one: 1, two: 2 }, store);
		});

		it('should immediately return a non object', () => {
			const actual = state.traverse('value', store);
			expect(actual).toBe('value');
		});

		it('should add new props to store', () => {
			expect(store).toEqual({ one: 1, two: 2 });
		});

		it('should share existing props', () => {
			state = new State({}, store);
			state.resolve = () => {};
			state.active = true;

			const actual = state.traverse({ two: 4, three: 9 }, store);

			expect(store).toEqual({ one: 1, two: 2, three: 9 });
			expect(actual).toBe(store);
		});
		
		it('should remove unnecessary props', () => {
			state.active = false;
			state.traverse({ one: 1, two: 2 }, store);

			expect(store).toEqual({});
		});
		
		it('should trigger resolve when value has changed', () => {
			store.two = 4;

			expect(resolve).toHaveBeenCalled();
			expect(store).toEqual({ one: 1, two: 4 });
		});
	});

	describe('prepare', () => {
		function resolve () {}
		let set;
		let store;
		let state;

		beforeEach(() => {
			set = new Set();
			store = {};
			state = new State({ one: 1, two: 2 }, store);
		});

		it('should activate', () => {
			state.prepare(resolve, set);

			expect(store).toEqual({ one: 1, two: 2 });

			expect(state).toMatchObject({
				resolve: expect.any(Function),
				active: true
			});
			
			state.resolve();

			expect(set).toEqual(new Set([resolve]));
		});

		it('should deactivate', () => {
			state.prepare(resolve, set);
			state.prepare();

			expect(store).toEqual({});

			expect(state).toMatchObject({
				resolve: undefined,
				active: false
			});
		});
	});
});
