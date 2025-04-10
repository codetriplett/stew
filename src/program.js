import { isServer } from './document';
import { onUpdate, onRender } from './impulse';

const shaderTypes = ['VERTEX_SHADER', 'FRAGMENT_SHADER'];
export const sequenceMap = new WeakMap();
export const rootMap = new WeakMap();
const convertMap = new WeakMap();
let id = 0;

export function resetId (newId = 0) {
	id = newId;
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

export function parse (strings) {
	const lastIndex = strings.length - 1;
	const sequence = [];
	let names = [];
	let shader, variable;

	for (const [i, string] of strings.entries()) {
		const lines = string.split(/\n+/);
		const comment = lines.shift().trim();

		if (variable) {
			const [subname] = comment.split(' ');
			variable.unshift(subname);
		} else {
			if (names.length) {
				names[names.length - 1] = comment;
			}

			if (/\S/.test(string)) {
				shader = [names, []];
				sequence.push(shader);
				names = [];
			}
		}

		if (i < lastIndex) {
			const definition = lines.pop()?.trim?.();

			if (definition) {
				variable = definition.split(/\s+/).reverse();
				shader.push(variable);
			} else {
				names.push('');
				variable = undefined;
			}
		}

		for (const line of lines) {
			if (/\S/.test(line)) {
				shader[1].push(line.trim().replace(/;?$/, ';'));
			}
		}
	}

	if (!sequence.length || sequence[0][0].length > 0) {
		sequence.unshift([[], []]);
	}

	if (names.length) {
		sequence.push([names, []]);
	}

	sequence[0][0] = id++;
	return sequence;
}

function getStored (map, key, callback) {
	if (map.has(key)) {
		return map.get(key);
	}

	const value = callback();
	map.set(key, value);
	return value;
}

export function createShader (gl, index, stack) {
	const type = shaderTypes[index];
	const allCode = [];
	const allVars = [];

	for (const pair of stack) {
		const [, code, ...vars] = pair[index];
		allCode.push(...code);
		allVars.push(...vars.filter(definition => definition.length > 2));
	}

	if (allCode.length === 0) {
		return;
	} else if (index === 1 && !allCode[0].startsWith('precision ')) {
		allCode.unshift('precision mediump float;');
	}

	const code = [
		...allCode.splice(0, allCode[0].startsWith('precision') ? 1 : 0),
		...allVars.map(([, name, type, subtype]) => {
			const category = !subtype || type === 'sampler2D' ? 'uniform' : 'attribute';
			return `${category} ${type} ${name};`;
		}),
		'void main() {', ...allCode, '}',
	].join('\n');

	const shader = gl.createShader(gl[type]);
	gl.shaderSource(shader, code);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error(gl.getShaderInfoLog(shader));
	}

	return shader;
}

export function setupCanvas (node, props) {
	const gl = node.getContext('webgl');
	const { width, height } = props;
	
	if (width !== node.width || height !== node.height) {
		gl.viewport(0, 0, width, height);
	}
	
	return getStored(convertMap, node, () => props => {
		if (!props) {
			return gl;
		}

		onRender(() => {
			let prevTimestamp;

			const draw = timestamp => {
				if (!isActive) {
					return;
				}
				
				const duration = prevTimestamp === undefined ? 0 : timestamp - prevTimestamp;
				const { program, callbacks } = memo;
				window.requestAnimationFrame(draw);
				prevTimestamp = timestamp;

				if (program) {
					gl.useProgram(program);
				}

				for (const callback of callbacks) {
					callback(gl, duration);
				}

			};

			let isActive = true;
			draw();
			return () => isActive = false;
		}, []);

		const { key, program, callbacks } = props;
		const memo = onUpdate(() => ({ program, callbacks }));
		return key;
	});
}

// TODO: return empty function if isServer is true
// - have this return an object and process them when they are about to be appended
// - store in WeakSet to know that they aren't regular DOM nodes
export default function compile (strings, ...values) {
	if (isServer) {
		return;
	}

	// TODO: have this return function to pass gl to
	// - have renderCanvas swap out context for 'webgl' (no type override or paused flag)
	// - have it return its 


	// creates and stores parsed template
	const sequence = getStored(sequenceMap, strings, () => parse(strings));
	const [vertexInfo, ...fragmentInfos] = sequence;

	return (context, parentMap = rootMap, ...stack) => {
		const { '': convert } = context;
		const gl = convert();
		const vertexValues = values.splice(0, vertexInfo.length - 2);
		const map = getStored(parentMap, strings, () => new WeakMap());
		const programs = [];
		let vertexShader = map.get(vertexInfo);

		for (const [i, fragmentInfo] of fragmentInfos.entries()) {
			const [resolverNames] = fragmentInfo;
			const resolvers = values.splice(0, resolverNames.length);
			const fragmentValues = values.splice(0, fragmentInfo.length - 2);
			const fullStack = [[vertexInfo, fragmentInfo, i], ...stack];
			const subprograms = [];

			for (const resolver of resolvers) {
				if (Array.isArray(resolver)) {
					for (const prepare of resolver) {
						const childPrograms = prepare(context, map, ...fullStack);
						subprograms.push(...childPrograms);
						// TODO: merge into existing programs if they exist
					}

					continue;
				} else if (typeof resolver !== 'function') {
					continue;
				}

				// creates and stores a program for each unique subprogram chain
				const [program, key] = getStored(map, fragmentInfo, () => {
					if (!vertexShader) {
						vertexShader = createShader(gl, 0, fullStack);
						map.set(vertexInfo, vertexShader);
					}

					const fragmentShader = createShader(gl, 1, fullStack);
					
					const key = fullStack.map(([vertexInfo,, fragmentIndex]) => {
						return `${vertexInfo[0]}.${fragmentIndex}`;
					}).join('-');

					if (!vertexShader || !fragmentShader) {
						return [, key];
					}

					const program = gl.createProgram();
					gl.attachShader(program, vertexShader);
					gl.attachShader(program, fragmentShader);
					gl.linkProgram(program);

					if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
						console.error(gl.getProgramInfoLog(program));
					}

					return [program, key];
				});

				subprograms.push([program, key, resolver]);
			}

			const programMap = new Map();

			for (const [program, key, ...callbacks] of subprograms) {
				if (programMap.has(program)) {
					programMap.get(program).push(...callbacks);
					continue;
				}

				// creates and stores setters for each layer in each unique subprogram chain
				const setters = !program ? [] : getStored(map, program, () => {
					const [,, ...vertexVars] = vertexInfo;
					const [,, ...fragmentVars] = fragmentInfo;

					return [...vertexVars, ...fragmentVars].map(definition => {
						if (definition.length < 3) {
							return createOtherSetter(gl, ...definition);
						}

						const subtype = definition[3];
						const setter = !subtype || subtype === 'TEXTURE' ? createUniformSetter : createAttributeSetter;
						return setter(gl, program, ...definition);
					});
				});

				if (setters.length) {
					callbacks.unshift(() => {
						// TODO: see these only need to be set once before animation loop or if they are needed on each draw
						// - what happesn when programs are switched and then switched back?
						// - maybe only need to set the ones that have subnames on each draw
						// - if not needed on every draw, they could be iterated over here and this callback could just process the subname setters
						for (const [i, setter] of setters.entries()) {
							setter(values[i]);
						}
					});
				}

				const values = [...vertexValues, ...fragmentValues];
				const entry = [program, key, ...callbacks];
				programMap.set(program, entry);
				programs.push(entry)
			}
		}

		if (parentMap !== rootMap) {
			return programs;
		}

		// TODO: append iteration id to the end of all these ids to make them unique
		// - need to differentiate between subprograms added by different stew`...` calls
		// - this will allow impulse to update its own controlled nodes without processing full layout again
		// - do we need the dot/dash ids anymore? each stew call takes care of merging things by program, and there is no sharing beyond that
		const objects = programs.map(([program, key, ...callbacks]) => ({ key, program, callbacks }));
		return ['', {}, ...objects];
	};
}
