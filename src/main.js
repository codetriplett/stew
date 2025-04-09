import stew, { createState, onUpdate, onRender, virtualDocument } from './module';
import { isServer } from './document';

Object.assign(stew, {
	createState,
	onUpdate,
	onRender,
	virtualDocument,
});

if (!isServer) {
	window.stew = stew;
}

if (typeof module === 'object') {
	module.exports = stew;
}

export default stew;
