import carousel from './carousel.min';

const state = stew(state => ({
	add: () => state.array = [...state.array, state.array.length + 1]
}));

state(carousel);
