import carousel from './carousel';
import accordion from './accordion';

stew(carousel, {
	slidePrev: state => state.index = (state.index || state.slides.length) - 1,
	slideNext: state => state.index = (state.index + 1) % state.slides.length
});

stew(accordion);
