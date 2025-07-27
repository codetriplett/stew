import { isServer } from './document';
import { processMemo } from './impulse';

const shaderTypes = ['VERTEX_SHADER', 'FRAGMENT_SHADER'];
export const sequenceMap = new WeakMap();
export const rootMap = new WeakMap();
export const nodeMap = new WeakMap();
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
	
	if (!/^vec[2-4]$/.test(type)) {
		console.error('Invalid attribute type: ', type);
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

export function createShader (gl, index, stack, varyings = []) {
	const type = shaderTypes[index];
	const allCode = [];
	const allVars = [];
	let headerCode = [];

	for (const pair of stack) {
		const [, code, ...vars] = pair[index];
		allCode.push(...code);
		allVars.push(...vars.filter(definition => definition.length > 2));
	}

	if (allCode.length === 0) {
		allCode.push(index
			? 'gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);'
			: 'gl_Position = vec4(0.0, 0.0, 0.0, 1.0);\ngl_PointSize = 16.0;'
		);
	} else if (allCode[0].startsWith('precision ')) {
		headerCode.unshift(allCode.shift());
	} else if (index) {
		headerCode.unshift('precision mediump float;');
	}

	const processedCode = allCode.map(line => {
		const match = line.match(/^varying\s+(\S+)\s+(\S+)(\s*=\s*.*)$/);

		if (!match) {
			return line;
		}

		const [, type, name, remainder] = match;
		varyings.push(`varying ${type} ${name};`);
		return `${name}${remainder}`;
	});

	const code = [
		...headerCode,
		...allVars.map(([, name, type, subtype]) => {
			const category = !subtype || type === 'sampler2D' ? 'uniform' : 'attribute';
			return `${category} ${type} ${name};`;
		}),
		...varyings,
		'void main() {', ...processedCode, '}',
	].join('\n');

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
		const lines = string.replace(/^[ \t]|[ \t]$/g, '').split(/\s*(?:[\r\n]\s*)+/);
		comment = lines.length > 1 || i === strings.length - 1 ? lines.shift() : '';

		if (definition) {
			shader.push([comment, ...definition.split(/\s+/).reverse()]);
		} else if (shader.length > 2 || shader[1].length || i && sequence.length < 2) {
			shader = [[comment], []];
			sequence.push(shader);
		} else {
			shader[0].push(comment);
		}

		definition = lines.pop();
		shader[1].push(...lines.filter(line => line));
	}

	if (definition) {
		shader[1].push(definition);
	}

	return sequence;
}

const animations = new Map();
let animationActive = false;
// const queue = new Set();

function draw (timestamp) {
	for (const [gl, array] of animations) {
		const [prevTimestamp, nextTimestamp, ...programs] = array;
		let param;

		if (nextTimestamp > timestamp) {
			continue;
		}

		const duration = prevTimestamp === undefined ? 0 : timestamp - prevTimestamp;
		array[0] = timestamp;

		for (const { program, callbacks } of programs) {
			if (program) {
				gl.useProgram(program);
			}

			for (const callback of callbacks) {
				param = callback(gl, duration, param) ?? param;
			}
		}

		if (param > 0) {
			array[1] += param;
		} else {
			animations.delete(gl);
		}
	}

	if (animations.size) {
		requestAnimationFrame(draw);
	} else {
		animationActive = false;
	}
}

export function Program ({ gl }, ...objects) {
	processMemo(null, [objects], () => {
		const programs = getStored(animations, gl, () => [undefined, 0]);
		programs.push(...objects);

		if (!animationActive) {
			animationActive = true;
			requestAnimationFrame(draw);
		}

		return () => {
			for (const object of objects) {
				const index = programs.indexOf(object);

				if (index === -1) {
					continue;
				}

				programs.splice(index, 1);
				
				if (programs.length < 3) {
					animations.delete(gl);
				}
			}
		};
	});

	return ['', null, objects.map(({ label }) => label).join(', ')];
}

export default function compile (strings, ...values) {
	if (isServer) {
		return;
	}

	const sequence = getStored(sequenceMap, strings, () => parse(strings));
	const [vertexInfo, ...fragmentInfos] = sequence;

	return (context, canvas, parentMap, ...stack) => {
		const gl = canvas.getContext('webgl');
		const isRoot = !parentMap;

		if (isRoot) {
			parentMap = getStored(rootMap, gl, () => new WeakMap());
		}

		const vertexValues = values.splice(0, vertexInfo.length - 2);
		const stackEntry = [vertexInfo];
		const map = getStored(parentMap, strings, () => new WeakMap());
		const programs = [];
		let vertexShader = map.get(vertexInfo);
		stack = [stackEntry, ...stack];

		for (const fragmentInfo of fragmentInfos) {
			const [resolverNames] = fragmentInfo;
			const resolvers = values.splice(0, resolverNames.length);
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
						programs.push([null, new Set(), resolver]);
						programMap.clear();
						continue;
					} else if (!Array.isArray(resolver)) {
						continue;
					}
					
					const subprograms = [];
					
					for (const prepare of resolver) {
						subprograms.push(...prepare(context, canvas, map, ...stack));
					}

					for (const subprogram of subprograms) {
						const [program,, ...callbacks] = subprogram;

						if (!programMap.has(program)) {
							const group = [program, new Set()];
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

				const entry = [program, new Set(), ...resolvers];
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

						const subtype = definition[3];
						const setter = !subtype || subtype === 'TEXTURE' ? createUniformSetter : createAttributeSetter;
						return setter(gl, program, ...definition);
					});
				});

				if (!setters.length) {
					continue;
				}

				const values = [...vertexValues, ...fragmentValues];

				entry.splice(2, 0, () => {
					for (const [i, setter] of setters.entries()) {
						setter(values[i]);
					}
				});
			}
		}

		// TODO: pass in labels of all active programs as children for Program to print
		// - these are just to help with debugging the state of the scene
		return !isRoot ? programs : [Program, { gl }, ...programs.map(([program, labels, ...callbacks]) => {
			return { program, callbacks, label: [...labels].join(', ') };
		})];
	};
}
