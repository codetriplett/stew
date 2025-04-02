// how should it end previous loop?
// - otherwise it would need to store callbacks somewhere that the initialized loop can access, along with context (aslo complicates subsequent paused renders)
// - maybe allow WeakMap here, since shaders will need it to process template literals
function animate (context, callbacks) {

}

function createAttributeSetter (gl, program, name, type, subtype) {
	const location = gl.getAttribLocation(program, name);
	const buffer = gl.createBuffer();
	
	if (!/^vec[2-4]$/.test(type)) {
		throw new Error('Invalid attribute type: ', type);
	}

	return value => {
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, value, gl.STATIC_DRAW);
		gl.vertexAttribPointer(location, type[3], gl[subtype], false, 0, 0);
		gl.enableVertexAttribArray(location);
	}
}

function createUniformSetter (gl, program, name, type, subtype) {
	const location = gl.getUniformLocation(program, name);

	switch (type) {
		case 'uint': return value => gl.uniform1u(location, value);
		case 'int': return value => gl.uniform1i(location, value);
		case 'float': return value => gl.uniform1f(location, value);
		case 'uvec2': return value => gl.uniform2uv(location, value);
		case 'uvec3': return value => gl.uniform3uv(location, value);
		case 'uvec4': return value => gl.uniform4uv(location, value);
		case 'ivec2': return value => gl.uniform2iv(location, value);
		case 'ivec3': return value => gl.uniform3iv(location, value);
		case 'ivec4': return value => gl.uniform4iv(location, value);
		case 'vec2': return value => gl.uniform2fv(location, value);
		case 'vec3': return value => gl.uniform3fv(location, value);
		case 'vec4': return value => gl.uniform4fv(location, value);
		case 'mat2': return value => gl.uniformMatrix2fv(location, false, value);
		case 'mat3': return value => gl.uniformMatrix3fv(location, false, value);
		case 'mat4': return value => gl.uniformMatrix4fv(location, false, value);
		case 'sampler2D': {
			const textureMap = new WeakMap;
			const index = subtype?.startsWith('TEXTURE') && Number(subtype.slice(7)) || 0;

			return image => {
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
	}

	throw new Error('Invalid uniform type: ', type);
}

function wrap (code, vars, prefix = '') {
	return `${prefix}${vars.join('\n')}\n\nvoid main() {\n${code}\n}`;
}

export function parse (strings) {
	const lastIndex = strings.length - 1;
	const sequence = [];
	var shader, varLine;

	for (const [i, string] of strings.entries()) {
		if (varLine) {
			shader.push(varLine.split(/\s+/).reverse());
		} else {
			shader = [''];
			sequence.push(shader);
		}

		const lines = string.split(/\n+/);

		if (i > 0) {
			lines.shift();
		}

		if (i < lastIndex) {
			varLine = lines.pop().trim();
		}

		for (const line of lines) {
			if (/\S/.test(line)) {
				shader[0] += `${shader[0] ? '\n' : ''}${line.trim().replace(/;?$/, ';')}`;
			}
		}
	}

	return sequence;
}

const renderMap = new WeakMap();
const rootMap = new WeakMap();

// 1) have each one store their parsed info to a weakmap
// 2) look to that same weakmap to link child subprograms to parent program
// 3) it should end up with a 

export function compileProgram (strings, ...values) {
	let render = renderMap.get(strings);

	if (render) {
		return render;
	}

	const sequence = parse(strings);

	// TODO: create program map
	// - parse strings when compile is called
	// - return function to process setters and callbacks
	// - maintain a tree of weakmaps that set either a program or another weakmap depending on if resolver is function or not
	// - there should be a unique program for each resolver, regardless of if that resolver is referenced elsewhere
	// - setters are processed at bottom layer, so parent renders need to be passed down

	return (gl, parentMap = rootMap, ...parentShaders) => {
		let renders = parentMap.get(strings);
		
		if (!renders) {
			renders = [];
			parentMap.set(strings, renders);
		}

		// then for each resolver encountered
		const resolverIndex = 0;
		const resolver = () => {};
		let render = renders[resolverIndex];

		if (Array.isArray(resolver)) {
			if (!(render instanceof WeakMap)) {
				render = new WeakMap();
				renders[resolverIndex] = render;
			}

			for (const child of resovler) {
				const shaders = [sequence[0], sequence[resolverIndex + 1]];
				child(gl, render, shaders, ...parentShaders);
			}

			return;
		} else if (typeof resolver !== 'function') {
			return;
		}

		if (typeof render !== 'function') {
			program = gl.createProgram();
			// merge all vertex and fragment shader vars and code to create program
			// - see if later it would be more efficient to have one program per vertex shader and link each fragment one as they are processed

			render = () => {};
			renders[resolverIndex] = render;
		}

		render(gl);


		

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
	}; 








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
