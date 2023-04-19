import stew, { createState, onRender } from './module';

Object.assign(stew, {
	createState,
	onRender,
});

if (typeof window === 'object') {
	window.stew = stew;
} else if (typeof module === 'object') {
	module.exports = stew;
}

export default stew;
