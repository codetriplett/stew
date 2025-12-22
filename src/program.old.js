import { processMemo } from './impulse';
import { animations, schedule } from './state';

const shaderTypes = ['VERTEX_SHADER', 'FRAGMENT_SHADER'];
export const sequenceMap = new WeakMap();
export const rootMap = new WeakMap();
const varyingMap = new Map();
const shaderMap = new Map();

function getStored (map, key, callback) {
	if (map.has(key)) {
		return map.get(key);
	}

	const value = callback();
	map.set(key, value);
	return value;
}

function createAttributeSetter (gl, program, subname, name, type, subtype) {
	const location = gl.getAttribLocation(program, name);
	const buffer = gl.createBuffer();
	let isInt, size;

	if (location === -1) {
		return () => {};
	}
	
	if (/^u?int$/.test(type)) {
		isInt = true;
		size = 1;
	} else if (type === 'float') {
		size = 1;
	} else if (/^[ui]vec[2-4]$/.test(type)) {
		isInt = true;
		size = type[4];
	} else if (/^vec[2-4]$/.test(type)) {
		size = type[3];
	} else {
		console.error('Invalid attribute type: ', type);
	}

	return value => {
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, subname ? value[subname] : value, gl.STATIC_DRAW);

		if (isInt) {
			gl.vertexAttribIPointer(location, size, gl[subtype], 0, 0);
		} else {
			gl.vertexAttribPointer(location, size, gl[subtype], false, 0, 0);
		}

		gl.enableVertexAttribArray(location);
	};
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

	if (location === -1) {
		return () => {};
	}

	if (/^u?sampler2D$/.test(type)) {
		const textureMap = new WeakMap();
		const index = subtype?.startsWith('TEXTURE') && parseInt(subtype.slice(7)) || 0;
		let internalFormat = subtype.slice(7 + String(index).length) || 'RGBA';
		let format = internalFormat;

		if (type.startsWith('u')) {
			internalFormat += '8UI';
			format += '_Integer';
		}

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
			gl.texImage2D(gl.TEXTURE_2D, index, gl[internalFormat], gl[format], gl.UNSIGNED_BYTE, image);
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

	console.error('Invalid uniform type: ', type);
}

function createOtherSetter (gl, subname, name) {
	switch (name) {
		case 'elements': {
			const buffer = gl.createBuffer();
			
			return value => {
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, subname ? value[subname] : value, gl.STATIC_DRAW);
			};
		}
	}
}

function createCode (index, stack, varyings) {
	const precisionCode = new Set();
	const allCode = [];
	const allVars = [];
	const headerCode = index ? ['out vec4 gl2_FragColor;'] : [];

	for (const pair of stack) {
		const [, [...code], ...vars] = pair[index];

		while (code[0]?.startsWith?.('precision ')) {
			precisionCode.add(code.shift());
		}

		allCode.push(...code);
		allVars.push(...vars.filter(definition => definition.length > 2));
	}

	if (allCode.length === 0) {
		allCode.push(index
			? 'gl2_FragColor = vec4(1, 1, 1, 1);'
			: 'gl_Position = vec4(0, 0, 0, 1);\n    gl_PointSize = 16.0;'
		);
	}
	
	if (index && precisionCode.size === 0) {
		precisionCode.add('precision mediump float;');
	}

	const varyingType = index ? 'in' : 'out';
	headerCode.unshift('#version 300 es', ...precisionCode);

	const processedCode = allCode.map(line => {
		const match = line.match(/^\s*\*\s*(\S+)\s+(\S+)(\s*=\s*.*)$/);

		if (!match) {
			return `    ${line.replace(/^\s*gl_FragColor\s*=/, 'gl2_FragColor =')}`;
		}

		const [, type, name, remainder] = match;
		varyings.push(`${type} ${name};`);
		return `    ${name}${remainder}`;
	});

	return [
		...headerCode,
		...allVars.map(([, name, type, subtype]) => {
			const category = !subtype || /^u?sampler2D$/.test(type) ? 'uniform' : 'in';
			return `${category} ${type} ${name};`;
		}),
		...varyings.map(varying => `${/^\s*(u?int|[iu]vec\d)\s+/.test(varying) ? 'flat ' : ''}${varyingType} ${varying}`),
		'void main() {', ...processedCode, '}',
	].join('\n');
}

export function createShader (gl, index, stack, varyings = []) {
	const code = createCode(index, stack, varyings);
	const type = shaderTypes[index];
	const shader = gl.createShader(gl[type]);
	gl.shaderSource(shader, code);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error(gl.getShaderInfoLog(shader));
	}
	
	if (!index) {
		varyingMap.set(shader, varyings);
	}

	return shader;
}

// function updateProgram (gl, prevPrograms = [], programs = []) {
// 	const allPrograms = getStored(animations, gl, () => [undefined, 0]);

// 	for (const program of prevPrograms) {
// 		const index = allPrograms.indexOf(program);

// 		if (index === -1) {
// 			continue;
// 		}

// 		allPrograms.splice(index, 1);
// 	}

// 	allPrograms.push(...programs);

// 	if (allPrograms.length < 3) {
// 		animations.delete(gl);
// 	}
// }

// export function Program ({ gl }, ...programs) {
// 	processMemo(prevObjects => {
// 		updateProgram(gl, prevObjects, programs);
// 		schedule();
// 		return programs;
// 	}, [gl, programs]);

// 	processMemo(null, [gl, programs], () => () => updateProgram(gl, programs));

// 	return processMemo(() => {
// 		const array = [];
// 		let prevVertexShader;

// 		for (const [program] of programs) {
// 			const shaders = shaderMap.get(program);

// 			if (!shaders) {
// 				continue;
// 			}
			
// 			const [vertexShader, fragmentShader] = shaders;

// 			if (vertexShader !== prevVertexShader) {
// 				array.push(vertexShader);
// 				prevVertexShader = vertexShader;
// 			}

// 			array.push(fragmentShader);
// 		}

// 		return array.map(shader => gl.getShaderSource(shader)).join('\n');
// 	}, [gl, programs]);
// }

// would this be easier if each compile returned its own Program call?
// - each one would have a function that is called to set its own variables
//   - this function would need to accept a gl and program param and build/set setter function in WeakMap
// - it would then iterate through its own resovlers
// - maybe detaced impulses can be used to manage the setup/teardown automatically

// - should compile just return a stew layout?







// TODO: create setter function the first time this is called
// - use program as key to get the scoped map, and then info to get the setter
function link (gl, program, info, values) {

}

export function parse (strings) {
	let shader = [strings, []];
	const sequence = [shader];
	let comment, definition;

	for (let [i, string] of strings.entries()) {
		const lines = string.replace(/^[ \t]|[ \t]$/g, '').split(/(?:\s*[\r\n])+/);
		comment = lines.length > 1 || i === strings.length - 1 ? lines.shift().trim() : '';

		if (i) {
			if (definition) {
				shader.push([comment, ...definition.split(/\s+/).reverse()]);
			} else if (sequence.length > 1 && shader.length < 3 && !shader[1].length) {
				shader[0].push(comment);
			} else {
				shader = [[comment], []];
				sequence.push(shader);
			}
		}

		if (i < strings.length - 1) {
			definition = lines.pop()?.trim?.();
		}
		
		shader[1].push(...lines.filter(line => /\S/.test(line)));
	}

	for (const info of sequence) {
		let [resolverCount, codeLines] = info;
		const indentation = [];

		codeLines = codeLines.map(line => {
			line = line.replace(/\t/g, '    ');
			indentation.push(line.match(/^\s*/)[0].length);
			return line;
		});
		
		const minIndentation = Math.min(...indentation);

		info.splice(0, 2,
			values => {
				const resolvers = values.splice(0, resolverCount);
				values = values.splice(0, info.length - 2);
				return [(gl, program) => link(gl, program, info, values), ...resolvers];
			},
			codeLines.map(line => line.slice(minIndentation)),
		);
	}

	return sequence;
}

const stackSet = new Set();

function Program ({ '': context, fragmentInfo }, vertexSetter, fragmentSetter, ...resolvers) {
	let { gl, stack, vertexInfo } = context;

	// Something like this is needed to make sure stack for context is actually form previously compiled program and not something random stew put on context before canvas
	if (!stackSet.has(stack)) {
		stack = [[vertexInfo]];
	}

	if (resolvers.every(resolver => !Array.isArray(resolver))) {
		processMemo(null, [], () => {
			// have parent Program2 instances pass down their initializer functions
			// - gl and program are passed into those to create the setter to add to callbacks

			// register [program, ...callbacks]
			
			return () => {
				// clean [program, ...callbacks]
			};
		});
	}

	return ['', { stack }, ...resolvers];

	// 1) check if new stack needs to be created (and stored) for vertex and or fragment additions
	// 2) use stack as id to get program and setter function, or create and store if not yet created
	// 3) use effect to register [program, ...calbacks] to queue, and remove on teardown
}

export default function compile (strings, ...values) {
	if (typeof window !== 'object') {
		return;
	}

	const sequence = getStored(sequenceMap, strings, () => parse(strings));
	const [vertexSetter, ...fragmentSetters] = sequence.map(info => info[0](value));
	const [vertexInfo, ...fragmentInfos] = sequence;

	// use a child for each vertex/fragment pair
	// - vertex and fragment are only set if they have code or variables to add
	// - vertex and fragment are parsed and stored using strings key to be reused
	// - need to extract resolvers and values
	return canvas => ['', {
		gl: getStored(rootMap, canvas, () => canvas.getContext('webgl2', {
			premultipliedAlpha: /^(transparent)?$/.test(canvas.style.background),
			antialias: !/^(crisp-edges|pixelated)$/.test(canvas.style.imageRendering),
		})),
		vertexInfo,
	},
		...fragmentInfos.map((fragmentInfo, i) => {
			return [Program2, { fragmentInfo }, vertexSetter, ...fragmentSetters[i]];
		}),
	];





	



	// const sequence = getStored(sequenceMap, strings, () => parse(strings));
	// const [vertexInfo, ...fragmentInfos] = sequence;

	// vertexStack, fragmentStack
	// - rebuild stacks when new entries are added (only ones that have code or variables to add)
	// - maps hold both the info stacks (on info keys) and shaders (on gl key)
	return (canvas, vertexStack, fragmentStack) => {
		const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
		const isRoot = !vertexStack;

		if (isRoot) {
			vertexStack = [rootMap];
			fragmentStack = [rootMap];
		}

		if (vertexInfo.length > 2 || vertexInfo[1].length) {
			vertexStack = getStored(vertexStack[0], vertexInfo, () => [new WeakMap()]);
		}





		let [vertexMap, fragmentMap, parentSetterMap] = parentMaps;
		const setterMap = getStored(parentSetterMap, vertexInfo, () => new WeakMap());
		const remainingValues = [...values];
		const vertexValues = remainingValues.splice(0, vertexInfo.length - 2);
		const stackEntry = [vertexInfo];

		if (vertexInfo.length > 2 || vertexInfo[1].length) {
			vertexMap = getStored(vertexMap, vertexInfo, () => new WeakMap());
		}

		const programs = [];
		let vertexShader = vertexMap.get(gl);
		stack = [stackEntry, ...stack];

		for (const fragmentInfo of fragmentInfos) {
			const [resolverNames] = fragmentInfo;
			const resolvers = remainingValues.splice(0, resolverNames.length);

			if (fragmentInfo.length < 2) {
				if (resolvers.length) {
					programs.push([null, ...resolvers]);
				}

				continue;
			} else if (fragmentInfo.lenth > 2 || fragmentInfo[1].length) {
				fragmentMap = getStored(fragmentMap, fragmentInfo, () => new WeakMap());
			}

			const fragmentValues = remainingValues.splice(0, fragmentInfo.length - 2);
			const programMap = new Map();
			const programSet = new Set();
			stackEntry[1] = fragmentInfo;

			if (resolvers.some(resolver => typeof resolver !== 'function')) {
				for (const [i, resolver] of resolvers.entries()) {
					if (typeof resolver === 'function') {
						programs.push([null, resolver]);
						programMap.clear();
						continue;
					} else if (!Array.isArray(resolver)) {
						continue;
					}
					
					const subprograms = [];
					
					for (const prepare of resolver) {
						const newSubprograms = prepare(canvas, [vertexMap, fragmentMap, setterMap], ...stack);
						subprograms.push(...newSubprograms);
					}

					for (const subprogram of subprograms) {
						const [program, ...callbacks] = subprogram;

						if (!programMap.has(program)) {
							const group = [program];
							programMap.set(program, group);
							programSet.add(group);
							programs.push(group);
						}

						programMap.get(program).push(...callbacks);
					}
				}
			} else {
				vertexShader ||= getStored(vertexMap, gl, () => {
					return createShader(gl, 0, stack);
				});

				// program also needs to use a map that is created whenever vertex or fragment change
				// maps should be [vertexMap, fragmentMap, programMap]

				const program = getStored(fragmentMap, gl, () => {
					console.log('=======', vertexShader);
					const varyings = varyingMap.get(vertexShader);
					const fragmentShader = createShader(gl, 1, stack, varyings);
					const program = gl.createProgram();
					gl.attachShader(program, vertexShader);
					gl.attachShader(program, fragmentShader);
					gl.linkProgram(program);

					if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
						console.error(gl.getProgramInfoLog(program));
					}

					shaderMap.set(program, [vertexShader, fragmentShader]);
					return program;
				});

				const entry = [program, ...resolvers];
				programSet.add(entry);
				programs.push(entry);
			}

			for (const entry of programSet) {
				const [program] = entry;

				const setters = getStored(parentSetterMap, program, () => {
					const [,, ...vertexVars] = vertexInfo;
					const [,, ...fragmentVars] = fragmentInfo;

					return [...vertexVars, ...fragmentVars].map(definition => {
						if (definition.length < 3) {
							return createOtherSetter(gl, ...definition);
						}

						const type = definition[2];
						const subtype = definition[3];
						const setter = !subtype || type === 'sampler2D' ? createUniformSetter : createAttributeSetter;
						return setter(gl, program, ...definition);
					});
				});

				if (!setters.length) {
					continue;
				}

				const values = [...vertexValues, ...fragmentValues];
				
				entry.splice(1, 0, (gl, duration) => {
					for (const [i, setter] of setters.entries()) {
						let value = values[i];

						if (typeof value === 'function') {
							value = value(duration);
						}

						setter(value);
					}
				});
			}
		}

		return !isRoot ? programs : [Program, { gl }, ...programs];
	};
}
