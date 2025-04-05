// how should it end previous loop?
// - otherwise it would need to store callbacks somewhere that the initialized loop can access, along with context (aslo complicates subsequent paused renders)
// - maybe allow WeakMap here, since shaders will need it to process template literals
function animate (program) {

}

function createAttributeSetter (gl, program, subname, name, type, subtype) {
	const location = gl.getAttribLocation(program, name);
	const buffer = gl.createBuffer();
	
	if (!/^vec[2-4]$/.test(type)) {
		throw new Error('Invalid attribute type: ', type);
	}

	return value => {
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, subname ? value[subname] : value, gl.STATIC_DRAW);
		gl.vertexAttribPointer(location, type[3], gl[subtype], false, 0, 0);
		gl.enableVertexAttribArray(location);
	}
}

const setterNames = {
	uint: 'uniform1u',
	int: 'uniform1i',
	float: 'uniform1f',
	uvec2: 'uniform2uv',
	uvec3: 'uniform3uv',
	uvec4: 'uniform4uv',
	ivec2: 'uniform2iv',
	ivec3: 'uniform3iv',
	ivec4: 'uniform4iv',
	vec2: 'uniform2fv',
	vec3: 'uniform3fv',
	vec4: 'uniform4fv',
	mat2: 'uniformMatrix2fv',
	mat3: 'uniformMatrix3fv',
	mat4: 'uniformMatrix4fv',
};

function createUniformSetter (gl, program, subname, name, type, subtype) {
	const location = gl.getUniformLocation(program, name);

	if (type === 'sampler2D') {
		const textureMap = new WeakMap;
		const index = subtype?.startsWith('TEXTURE') && Number(subtype.slice(7)) || 0;

		return image => {
			if (subname) {
				image = image[subname];
			}

			let texture = textureMap.get(image);

			if (texture) {
				gl.bindTexture(gl.TEXTURE_2D, texture);
				return;
			}

			texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, index, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			textureMap.set(image, texture);
		}
	}
	
	const setterName = setterNames[type];
	
	if (/^mat[2-4]$/.test(type)) {
		return value => gl[setterName](location, false, subname ? value[subname] : value);
	} else if (setterName) {
		return value => gl[setterName](location, subname ? value[subname] : value);
	}

	throw new Error('Invalid uniform type: ', type);
}

export function parse (strings) {
	const lastIndex = strings.length - 1;
	const sequence = [];
	let count = 0;
	let shader, variable;

	for (const [i, string] of strings.entries()) {
		const lines = string.split(/\n+/);
		const comment = lines.shift();

		if (variable) {
			const [subname] = comment.trim().split(' ');
			variable.unshift(subname);
		} else if (/\S/.test(string)) {
			shader = [count, ''];
			sequence.push(shader);
			count = 0;
		}

		if (i < lastIndex) {
			const definition = lines.pop().trim();

			if (definition) {
				variable = definition.split(/\s+/).reverse();
				shader.push(variable);
			} else {
				count += 1;
				variable = undefined;
			}
		}

		for (const line of lines) {
			if (/\S/.test(line)) {
				shader[1] += `${shader[1] ? '\n' : ''}${line.trim().replace(/;?$/, ';')}`;
			}
		}
	}

	if (sequence[0][0] > 0) {
		sequence.unshift([0, '']);
	}

	sequence[0][0] = count;
	return sequence;
}

const prepareMap = new WeakMap();
const renderStack = [new WeakMap()];
const vertexStack = [];
const fragmentStack = [];

function get (map, key, callback) {
	if (map.has(key)) {
		return map.get(key);
	}

	const value = callback();
	map.set(key, value);
	return value;
}

// function createAnimation (gl, values) {


// 	const stack = type === 'VERTEX_SHADER' ? vertexStack : fragmentStack;
// 	const allVariables = [];
// 	const allCodes = [];

// 	for (const info of stack.entries()) {
// 		const [, code, ...variables] = info;
// 		allVariables.unshift(...variables);
// 		allCodes.unshift(code);
// 	}

// 	const code = [
// 		...allVariables.map(([, name, type, subtype]) => {
// 			const category = !subtype || type === 'sampler2D' ? 'uniform' : 'attribute';
// 			return `${category} ${type} ${name};`;
// 		}),
// 		'void main() {', ...allCode, '}',
// 	].join('\n');

// 	const shader = get(renderStack[lowestIndex], lowestInfo, () => {
// 		const shader = gl.createShader(gl[type]);
// 		gl.shaderSource(shader, code);
// 		gl.compileShader(shader);
// 		return shader;
// 	});

// 	return [shader, ...allVariables];
// }

export function createShader (gl, type, codeArray, ...vars) {
	const code = [
		...vars.map(([, name, type, subtype]) => {
			const category = !subtype || type === 'sampler2D' ? 'uniform' : 'attribute';
			return `${category} ${type} ${name};`;
		}),
		'void main() {', ...codeArray, '}',
	].join('\n');

	const shader = gl.createShader(gl[type]);
	gl.shaderSource(shader, code);
	gl.compileShader(shader);
	return shader;
}

export function compileProgram (strings, ...values) {
	const prepare = get(prepareMap, strings, () => {
		const sequence = parse(strings);
		const [vertexInfo, ...fragmentInfos] = sequence;

		// [callbackCount, code, ...definitions]: agnostic info
		// - store in stack as prepare functions are called

		// [totalSetupCount, shader, ...allSetters]: linked info
		// - shader is created whenever a function resolver is encountered for the first time
		// - it merges everything from stack and stores it
		// - need to maintain a weakMap at each level of prepare chain to store it

		// prepare function also needs to merge the values at each level
		// - store setups at the beginning and make sure the rest match up with the order the setters will be in

		// don't deal with setup
		// - have callback lines always preceed fragment code
		// - have string prefix always be vertexCode
		// - followup callbacks are still allowed
		// - setup code can be included in the first resolver anyway
		prepare = (gl, values, ...parentValues) => {
			const renderMap = get(renderStack[0], strings, () => new WeakMap());
			const [followupCount] = vertexInfo;
			const followups = followupCount ? values.splice(-followupCount) : [];
			const renders = [];
			parentValues.push(values.splice(vertexInfo.length - 2));
			vertexStack.unshift(vertexInfo);
			renderStack.ushift(renderMap);

			for (const fragmentInfo of fragmentInfos) {
				const [resolverCount] = fragmentInfo;
				const resolvers = values.splice(resolverCount);
				const allValues = [...parentValues, ...values.splice(fragmentInfo.length - 2)];
				fragmentStack.unshift(fragmentInfo);

				for (const resolver of resolvers) {
					if (Array.isArray(resolver)) {
						for (const prepare of resolvers) {
							const childRender = prepare(gl, ...allValues);
							renders.push(childRender);
						}

						// TOOD: have prepare functions return their entry to the tree that wille eventlly be passed to animate function
						// - it is only passed to animate function if stack is empty 

						continue;
					} else if (typeof resolver !== 'function') {
						continue;
					}

					const render = get(renderMap, fragmentInfo, () => {
						let allVertexCode = [];
						let allFragmentCode = [];
						let allVertexVars = [];
						let allFragmentVars = [];
						let allVars = [];

						for (const [i, fragmentInfo] of fragmentStack) {
							const [, vertexCode, ...vertexVars] = vertexStack[i];
							const [, fragmentCode, ...fragmentVars] = fragmentInfo;
							allVertexCode.push(vertexCode);
							allFragmentCode.push(fragmentCode);
							allVertexVars.push(...vertexVars);
							allFragmentVars.push(...fragmentVars);
							allVars.push(...vertexVars, ...fragmentVars);
						}

						const vertexShader = createShader(gl, 'VERTEX_SHADER', allVertexCode, ...allVertexVars);
						const fragmentShader = createShader(gl, 'FRAGMENT_SHADER', allFragmentCode, ...allFragmentVars);
						const program = gl.createProgram();
			
						gl.attachShader(program, vertexShader);
						gl.attachShader(program, fragmentShader);
						gl.linkProgram(program);

						const setters = allVars.push(definition => {
							const [subname, name, type, subtype] = definition;

							return !subtype || subtype === 'TEXTURE'
								? createUniformSetter(gl, program, subname, name, type, subtype)
								: createAttributeSetter(gl, program, subname, name, type, subtype);
						});

						return values => {
							gl.attachShader(program, vertexShader);
							gl.attachShader(program, fragmentShader);
							gl.linkProgram(program);

							// TODO: see if all values need to be set before each render or just the ones with subnames
							// - also check for multiple programs
							for (const [i, setter] of setters.entries()) {
								setter(values[i]);
							}

							resolver(gl);
						};
					});

					renders.push([render, allValues]);



					// register animation using (program, vertexShader, fragmentShader, allValues);
					// - this means each array item that was prepared will have its own animation instance, but this is needed since they have their own allValues
					// - shaders are shared whenever possible, and parent shaders should be used if lower levels added no code of their own
					// - use vertex/fragment stack to get keys to read from shaderStack to get a parent shader
					// - group animations by vertexShader, and attach/link them to the common program (use gl as key for common program)
				}

				// TODO: register render function to loop, tied to allValues values

				fragmentStack.shift();
			}

			renders.push(...followups.map(followup => [followup, gl]));
			renderStack.shift();
			vertexStack.shift();

			if (renderStack.length > 0) {
				return renders;
			}

			// TODO: deregister all previous 
			animate(gl, renders);

			// the remainder of values will be followups



			// TODO: prepare animation here
			// - adds to parent of stack if one exists, otherwise registers in animation loop
			// - gl can be used to unsubscribe previous animations as well

			// create a fragmentShader whenever a function resolver is found in sequence
			// create a vertexShader if any fragmentShaders were created in the sequence
			// store a single program for each gl, and swap out the shaders, then link them, as needed
			// use stack to merge code and setters to create shaders
		};

		prepareMap.set(strings, prepare);
	});

	return (gl, ...rest) => prepare(gl, values, ...rest);

	



	// simplify: link these as they are processed
	// - the array resolver item won't change after the fact, unless it is referenced by some outside array that has already been mapped over (bad pattern)
	// - see if this could be simplified even more by assuming template literals are inlined
	// - when encountering an array of children functions

	return (gl, vertexStack, fragmentStack) => {
		let resolvers = resolve.get(strings);
		
		if (!resolvers) {
			const vertexShader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vertexShader, `${vertexCode}${sequence[0][1]}`);
			gl.compileShader(vertexShader);
			resolvers = [];

			for (let i = 1; i < sequence.length - 1; i++) {
				const fragmentShader = gl.createShader(gl.VERTEX_SHADER);
				gl.shaderSource(fragmentShader, `${fragmentCode}${sequence[i][1]}`);
				gl.compileShader(fragmentShader);
				
				const program = gl.createProgram();
				gl.attachShader(program, vertexShader);
				gl.attachShader(program, fragmentShader);
				gl.linkProgram();

				// TODO: create setters using program and store as array [resolveCount, program, ...setters]
				resolvers.push(program);
			}
		}

		let valueIndex = 0;

		for (const program of resolvers) {
			const [resolveCount,, ...setters] = program;
			valueIndex
		}

		return resolvers;
	};






	// TODO: create agnostic tree here (things that don't need gl or program to set up)
	// - [vertexCode, setters, [fragmentCode, setters, resolverCount], ...]
	// - becomes: [vertexShader, values, [fragmentShader, values, ...resolvers], ...] when linked
	// - setups and followups can be handled without the shaders being linked, so they don't need to be included

	/*
[
	[map, vertexShader, ...values], // values includes all fragment resolvers and values as well
	[resolverCount, fragmentShader],
]
	*/




	// have this return an array of vert and frag shaders?
	// resolver: [
	//   vertexShader, (store as code when compiling and replace with shader when hydrating if not yet done)
	//   values, (these are replaced whenever prepare is called)
	//   ...setups,
	//   [fragmentShader, values, ...resolvers],
	//   ...fragmentVariations, (these are replace whenever prepare is called)
	//   ...followups,
	// ] (for each template literal)
	// - resolvers can be functions as well
	// - if vertexShader or fragmentShader is undefined, it didn't have additional code to contribute, so use parent one instead
	// - shaders are only created and added to array if there is a function resolver at that level
	prepare = (gl, ...values) => {
		let program = programMap.get(gl);

		if (!program) {
			program = gl.createProgram();
			programMap.set(gl, program);
		}

		const resolve = (...parentValues) => { 
			const [setupCount, vertexCode, ...vertexSetters] = vertexInfo;
			let valueIndex = 0;

			for (const setup of values.slice(valueIndex, valueIndex += setupCount)) {
				setup(gl);
			}

			const vertexValues = values.slice(valueIndex, valueIndex += vertexSetters.length);

			for (const fragmentInfo of fragmentInfos) {
				const [resolveCount, fragmentCode, ...fragmentSetters] = fragmentInfo;

				for (const resolve of values.slice(valueIndex, valueIndex += resolveCount)) {
					if (Array.isArray(resolve)) {
						for (const render of resolve) {
							render(gl, program, )
						}

						continue;
					} else if (typeof resolve !== 'function') {
						continue;
					}

					// create shader or use previous one
				}
			}
		};

		if (vertexInfo) {
			return resolve();
		}

		// useProgram, set variables call resolvers
		// - maybe have nested compile calls return a tree of shaders that were ultimately set up
		// - [vert, frag, [vertOverride, frag, etc], etc] (arry with vert override only if vertex )
	};

	prepareMap.set(strings, prepare);
	return prepare;



	// TODO: create program map
	// - parse strings when compile is called
	// - return function to process setters and callbacks
	// - maintain a tree of weakmaps that set either a program or another weakmap depending on if resolver is function or not
	// - there should be a unique program for each resolver, regardless of if that resolver is referenced elsewhere
	// - setters are processed at bottom layer, so parent renders need to be passed down

	// return (gl, resolve = rootMap, vertexCode = '', fragmentCode = '') => {
	// 	let resolvers = resolve.get(strings);
		
	// 	if (!resolvers) {
	// 		const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	// 		gl.shaderSource(vertexShader, `${vertexCode}${sequence[0][1]}`);
	// 		gl.compileShader(vertexShader);
	// 		resolvers = [];

	// 		for (let i = 1; i < sequence.length - 1; i++) {
	// 			const fragmentShader = gl.createShader(gl.VERTEX_SHADER);
	// 			gl.shaderSource(fragmentShader, `${fragmentCode}${sequence[i][1]}`);
	// 			gl.compileShader(fragmentShader);
				
	// 			const program = gl.createProgram();
	// 			gl.attachShader(program, vertexShader);
	// 			gl.attachShader(program, fragmentShader);
	// 			gl.linkProgram();

	// 			// TODO: create setters using program and store as array [resolveCount, program, ...setters]
	// 			resolvers.push(program);
	// 		}
	// 	}

	// 	let valueIndex = 0;

	// 	for (const program of resolvers) {
	// 		const [resolveCount,, ...setters] = program;
	// 		valueIndex
	// 	}

	// 	return resolvers;

		// for (const render of renders) {
		// 	render(gl);
		// }







		// then for each resolver encountered
		// const resolverIndex = 0;
		// const resolver = () => {};
		// let render = renders[resolverIndex];

		// if (Array.isArray(resolver)) {
		// 	if (!(render instanceof WeakMap)) {
		// 		render = new WeakMap();
		// 		renders[resolverIndex] = render;
		// 	}

		// 	for (const child of resolver) {
		// 		const shaders = [sequence[0], sequence[resolverIndex + 1]];
		// 		child(gl, render, shaders, ...stack);
		// 	}

		// 	return;
		// } else if (typeof resolver !== 'function') {
		// 	return;
		// }

		// if (typeof render !== 'function') {
		// 	program = gl.createProgram();
		// 	// merge all vertex and fragment shader vars and code to create program
		// 	// - see if later it would be more efficient to have one program per vertex shader and link each fragment one as they are processed

		// 	render = () => {};
		// 	renders[resolverIndex] = render;
		// }

		// render(gl);


		

		// const program = ownProgram || parentProgram;
		// let setters = settersMap.get(program);

		// // this needs to be here, since nested stew calls need the parent program passed in
		// if (!setters) {
		// 	setters = strings.slice(setterStart, resolverStart).map(string => {
		// 		const [name, type, subtype] = string.trim().split(/\s+/).reverse();

		// 		return !subtype || subtype === 'TEXTURE'
		// 			? createUniformSetter(gl, program, name, type, subtype)
		// 			: createAttributeSetter(gl, program, name, type, subtype);
		// 	});

		// 	settersMap.set(program, setters);
		// }

		// for (const [i, setter] of setters.entries()) {
		// 	setter(values[i + setterStart]);
		// }


		// const program = gl.createProgram();
		// const vertexShader = gl.createShader(gl.VERTEX_SHADER);
		// const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		// let vertexInfo = ['gl_Position = vec4(1.0, 1.0, 1.0, 1.0);'];
		// let fragmentInfo = ['gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);'];

		// for (let i = 0; i < sequence.length; i += 2) {
		// 	vertexInfo = sequence[i] || vertexInfo;
		// 	fragmentInfo = sequence[i + 1] || fragmentInfo;
		// 	vertexCode = format(vertexInfo, vertexInfo);
		// 	fragmentCode = format(fragmentInfo, fragmentCode);
			
		// 	gl.shaderSource(vertexShader, vertexCode);
		// 	gl.shaderSource(fragmentShader, fragmentCode);
		// 	gl.compileShader(vertexShader);
		// 	gl.compileShader(fragmentShader);
		// 	gl.attachShader(program, vertexShader);
		// 	gl.attachShader(program, fragmentShader);
		// 	gl.linkProgram(program);
		// }
	// }; 








	// // this should cover both the main program and fragments
	// // - have it always return a function that accepts gl
	// // - calling render will set the 
	// // - if standalone array is encountered, call each of its functions to 

	// const setterStart = strings.findIndex(string => /\S/.test(string));
	// const resolverStart = strings.findIndex((string, i) => i > setterStart && !/\S/.test(string));

	// if (resolverStart === -1) {
	// 	return;
	// }

	// const settersMap = new WeakMap();
	// // const sequence = [];
	// let shaderStart = strings.findIndex((string, i) => i > resolverStart && /\S/.test(string));
	// let rootProgram;

	// if (shaderStart === -1) {
	// 	shaderStart = values.length;
	// } else {
	// 	// 1) add lines that have value as definitions array (to be made variables)
	// 	// 2) add lines that don't have value as statement (to be added to code)
	// 	// - nested ones will replace parent (useful for using custom fragment shaders for sepecific objects)



	// 	// const vertexVars = [];
	// 	// const fragmentVars = [];

	// 	// for (const [name, value] of Object.entries(definitions)) {
	// 	// 	if (fragmentUniforms.has(name)) {
	// 	// 		fragmentVars.push(value)
	// 	// 	} else {
	// 	// 		vertexVars.push(value);
	// 	// 	}
	// 	// }

	// 	// vertexVars.push(...varyings);
	// 	// fragmentVars.push(...varyings);
		
	// 	// const vertexCode = wrap(vertexBody, vertexVars);
	// 	// const fragmentCode = wrap(fragmentBody, fragmentVars, 'precision mediump float;\n\n');

	// 	// const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	// 	// const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	// 	// rootProgram = gl.createProgram();

	// 	// gl.shaderSource(vertexShader, vertexCode);
	// 	// gl.shaderSource(fragmentShader, fragmentCode);
	// 	// gl.compileShader(vertexShader);
	// 	// gl.compileShader(fragmentShader);
	// 	// gl.attachShader(rootProgram, vertexShader);
	// 	// gl.attachShader(rootProgram, fragmentShader);
	// 	// gl.linkProgram(rootProgram);
	// }

	// render = (gl, program = rootProgram) => {
	// 	for (let i = 0; i < setterStart; i++) {
	// 		values[i](gl);
	// 	}

	// 	let setters = settersMap.get(program);

	// 	// this needs to be here, since nested stew calls need the parent program passed in
	// 	if (!setters) {
	// 		setters = strings.slice(setterStart, resolverStart).map(string => {
	// 			const [name, type, subtype] = string.trim().split(/\s+/).reverse();

	// 			return !subtype || subtype === 'TEXTURE'
	// 				? createUniformSetter(gl, program, name, type, subtype)
	// 				: createAttributeSetter(gl, program, name, type, subtype);
	// 		});

	// 		settersMap.set(program, setters);
	// 	}

	// 	for (const [i, setter] of setters.entries()) {
	// 		setter(values[i + setterStart]);
	// 	}

	// 	for (let i = resolverStart; i < shaderStart; i++) {
	// 		const resolver = values[i];
			
	// 		if (typeof resolver === 'function') {
	// 			resolver(gl);
	// 		} else if (Array.isArray(resolver)) {
	// 			for (const callback of resolver) {
	// 				callback(gl);
	// 			}
	// 		}
	// 	}
	// };

	// programMap.set(strings, render);
	// return render;
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
