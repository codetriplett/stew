import stew, { createState, onRender, virtualDocument } from './module';

Object.assign(stew, {
	createState,
	onRender,
	virtualDocument,
});

if (typeof window === 'object') {
	window.stew = stew;
} else if (typeof module === 'object') {
	module.exports = stew;
}

export default stew;
