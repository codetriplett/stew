// how should it end previous loop?
// - otherwise it would need to store callbacks somewhere that the initialized loop can access, along with context (aslo complicates subsequent paused renders)
// - maybe allow WeakMap here, since shaders will need it to process template literals
function animate (context, callbacks) {

}

const programMap = new WeakMap();

export function compileProgram (strings, ...values) {
	const render = programMap.get(strings);

	if (render) {
		return render;
	}

	// this should cover both the main program and fragments
	// - have it always return a function that accepts gl
	// - calling render will set the 
	// - if standalone array is encountered, call each of its functions to 

	const hasSetup = /\S/.test(strings[0]);
	const count = strings.find(string => /\S/.test(string));
	const locationMap = new WeakMap();
	let hasLinked = false;

	// TODO: get count of strings that are for setting variables

	return (gl, rootProgram = program) => {
		let locations = locationMap(rootProgram);

		if (!locations) {
			// store locations to use when setting values
		}

		if (hasSetup) {
			const setup = values.shift();
			setup(gl);
		}

		const variables = values.slice(0, count);
	};
}

export default function renderCanvas (ref, props, children, type, paused) {
	const [,, node] = ref;
	const { width, height } = props;
	context = node.getContext(type);
	
	if (width !== node.width || height !== node.height) {
		context.viewport(0, 0, width, height);
	}

	if (!paused) {
		const callbacks = [];

		for (const [i, child] of children.entries()) {
			if (typeof child === 'function') {
				callbacks.push(child);
				children[i] = undefined;
			}
		}

		animate(context, callbacks);
	}

	return context;
}
