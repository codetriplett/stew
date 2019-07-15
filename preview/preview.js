import carousel from './carousel.min';

const state = stew(state => ({
	slidePrev: () => state.index = (state.index || state.slides.length) - 1,
	slideNext: () => state.index = (state.index + 1) % state.slides.length
}));

state(carousel);
