import { processMemo } from './impulse';
import { animations, schedule } from './state';

const shaderTypes = ['VERTEX_SHADER', 'FRAGMENT_SHADER'];
export const sequenceMap = new WeakMap();
export const rootMap = new WeakMap();
const varyingMap = new Map();

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
			? 'gl2_FragColor = vec4(1.0, 1.0, 1.0, 1.0);'
			: 'gl_Position = vec4(0.0, 0.0, 0.0, 1.0);\ngl_PointSize = 16.0;'
		);
	}
	
	if (index && precisionCode.size === 0) {
		precisionCode.add('precision mediump float;');
	}

	const varyingType = index ? 'in' : 'out';
	headerCode.unshift('#version 300 es', ...precisionCode);
	
	const indentation = Math.min(...allCode.map(line => {
		return line.match(/^\s*/)[0].replace(/\t/, '    ').length;
	}));

	const processedCode = allCode.map(line => {
		line = line.replace(/\t/, '    ').slice(indentation);
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

export function parse (strings) {
	let shader = [[], []];
	const sequence = [shader];
	let comment, definition;

	for (let [i, string] of strings.entries()) {
		const lines = string.replace(/^[ \t]|[ \t]$/g, '').split(/(?:\s*[\r\n])+/);
		comment = lines.length > 1 || i === strings.length - 1 ? lines.shift().trim() : '';

		if (definition) {
			shader.push([comment, ...definition.split(/\s+/).reverse()]);
		} else if (shader.length > 2 || shader[1].length) {
			shader = [[comment], []];
			sequence.push(shader);
		} else if (i) {
			shader[0].push(comment);
		}

		definition = lines.pop()?.trim?.();
		shader[1].push(...lines.filter(line => line));
	}

	if (definition) {
		shader[1].push(definition);
	} else if (shader.length === 2 && !shader[1].length) {
		shader.pop();
	}

	return sequence;
}

function updateProgram (gl, prevPrograms = [], programs = []) {
	const allPrograms = getStored(animations, gl, () => [undefined, 0]);

	for (const program of prevPrograms) {
		const index = allPrograms.indexOf(program);

		if (index === -1) {
			continue;
		}

		allPrograms.splice(index, 1);
	}

	allPrograms.push(...programs);

	if (allPrograms.length < 3) {
		animations.delete(gl);
	}
}

export function Program ({ gl }, ...programs) {
	processMemo(prevObjects => {
		updateProgram(gl, prevObjects, programs);
		schedule();
		return programs;
	}, [gl, programs]);

	const shaderMap = processMemo(() => {
		const shaderMap = new Map();

		for (const [program] of programs) {
			if (!program) {
				continue;
			}

			const shaders = gl.getAttachedShaders(program);
			const index = shaders.findIndex(shader => gl.getShaderParameter(shader, gl.SHADER_TYPE) === gl.VERTEX_SHADER);
			const [shader] = shaders.splice(index, 1);
			shaders.unshift(shader);
			shaderMap.set(program, shaders.map(shader => gl.getShaderSource(shader)));
		}

		return shaderMap;
	}, [gl, programs]);

	processMemo(null, [gl, programs], () => () => updateProgram(gl, programs));

	return ['', null, programs.map(([program]) => {
		const shaders = shaderMap.get(program);
		return shaders?.join?.('\n');
	}).join('\n')];
}

export default function compile (strings, ...values) {
	if (typeof window !== 'object') {
		return;
	}

	const sequence = getStored(sequenceMap, strings, () => parse(strings));
	const [vertexInfo, ...fragmentInfos] = sequence;

	return (canvas, parentMap, ...stack) => {
		const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
		const isRoot = !parentMap;

		if (isRoot) {
			parentMap = getStored(rootMap, gl, () => new WeakMap());
		}

		const [resolverNames] = vertexInfo;
		const resolvers = values.splice(0, resolverNames.length);
		const vertexValues = values.splice(0, vertexInfo.length - 2);
		const stackEntry = [vertexInfo];
		const map = getStored(parentMap, strings, () => new WeakMap());
		const programs = resolvers.length ? [[, ...resolvers]] : [];
		let vertexShader = map.get(vertexInfo);
		stack = [stackEntry, ...stack];

		for (const fragmentInfo of fragmentInfos) {
			const [resolverNames] = fragmentInfo;
			const resolvers = values.splice(0, resolverNames.length);

			if (fragmentInfo.length < 2) {
				if (resolvers.length) {
					programs.push([null, ...resolvers]);
				}

				continue;
			}

			const fragmentValues = values.splice(0, fragmentInfo.length - 2);
			const programMap = new Map();
			const programSet = new Set();
			stackEntry[1] = fragmentInfo;

			if (resolvers.some(resolver => typeof resolver !== 'function')) {
				for (const [i, resolver] of resolvers.entries()) {
					// TODO: create unique label from vertex and fragment labels in stack
					// const label = stackEntry.slice(2).filter(name => name).join(' < ');
					// stackEntry[2] = resolverNames[i];
					
					if (typeof resolver === 'function') {
						programs.push([null, resolver]);
						programMap.clear();
						continue;
					} else if (!Array.isArray(resolver)) {
						continue;
					}
					
					const subprograms = [];
					
					for (const prepare of resolver) {
						const newSubprograms = prepare(canvas, map, ...stack);
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
				const program = getStored(map, fragmentInfo, () => {
					if (!vertexShader) {
						vertexShader = createShader(gl, 0, stack);
						map.set(vertexInfo, vertexShader);
					}

					const varyings = varyingMap.get(vertexShader);
					const fragmentShader = createShader(gl, 1, stack, varyings);
					const program = gl.createProgram();
					gl.attachShader(program, vertexShader);
					gl.attachShader(program, fragmentShader);
					gl.linkProgram(program);

					if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
						console.error(gl.getProgramInfoLog(program));
					}

					return program;
				});

				const entry = [program, ...resolvers];
				programSet.add(entry);
				programs.push(entry);
			}

			for (const entry of programSet) {
				const [program] = entry;

				const setters = getStored(map, program, () => {
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

		// TODO: pass in labels of all active programs as children for Program to print
		// - these are just to help with debugging the state of the scene
		return !isRoot ? programs : [Program, { gl }, ...programs];
	};
}
