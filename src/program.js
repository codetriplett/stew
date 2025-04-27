import { isServer } from './document';
import { processMemo } from './impulse';

const shaderTypes = ['VERTEX_SHADER', 'FRAGMENT_SHADER'];
export const sequenceMap = new WeakMap();
export const rootMap = new WeakMap();
export const nodeMap = new WeakMap();
const instanceMap = new WeakMap();

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

export function createShader (gl, index, stack) {
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
		return;
	} else if (allCode[0].startsWith('precision ')) {
		headerCode.unshift(allCode.shift());
	} else if (index === 1) {
		headerCode.unshift('precision mediump float;');
	}

	const code = [
		...headerCode,
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

export function parse (strings) {
	const sequence = [];
	let comment, definition, shader;

	for (const string of strings) {
		const lines = string.split(/\s*[\n\r]+\s*/);
		comment = lines.shift().trim();

		if (definition) {
			shader.push([comment, ...definition.trim().split(/\s+/).reverse()]);
		} else if (!shader || shader.length > 2 || shader[1].length) {
			shader = [[comment], []];
			sequence.push(shader);
		} else {
			shader[0].push(comment);
		}

		definition = lines.pop();
		shader[1].push(...lines.map(line => line.replace(/;?$/, ';')));
	}

	if (shader.length < 3 && !shader[1].length) {
		sequence.pop();
	}

	sequence[0]?.[0]?.shift?.();
	return sequence;
}

export function compile (strings, ...values) {
	if (isServer) {
		return;
	}

	const sequence = getStored(sequenceMap, strings, () => parse(strings));
	const [vertexInfo = [[], []], ...fragmentInfos] = sequence;
	const [setupNames = []] = vertexInfo;

	return (context, canvas, parentMap, ...stack) => {
		const gl = canvas.getContext('webgl');
		const isRoot = !parentMap;

		if (isRoot) {
			parentMap = getStored(rootMap, gl, () => new WeakMap());
		}

		const setups = values.splice(0, setupNames.length);
		const vertexValues = values.splice(0, vertexInfo.length - 2);
		const labels = stack.length ? stack[0].slice(2) : [];
		const stackEntry = [vertexInfo,,, ...labels];
		const map = getStored(parentMap, strings, () => new WeakMap());
		const programMap = new Map();
		let vertexShader = map.get(vertexInfo);
		stack = [stackEntry, ...stack];

		for (const fragmentInfo of fragmentInfos) {
			const [resolverNames] = fragmentInfo;
			const resolvers = values.splice(0, resolverNames.length);
			const fragmentValues = values.splice(0, fragmentInfo.length - 2);
			const subprograms = [];
			stackEntry[1] = fragmentInfo;

			for (const [i, resolver] of resolvers.entries()) {
				stackEntry[2] = resolverNames[i];

				if (Array.isArray(resolver)) {
					for (const prepare of resolver) {
						const childPrograms = prepare(context, canvas, map, ...stack);
						subprograms.push(...childPrograms);
					}

					continue;
				}

				const program = getStored(map, fragmentInfo, () => {
					if (!vertexShader) {
						vertexShader = createShader(gl, 0, stack);
						map.set(vertexInfo, vertexShader);
					}

					const fragmentShader = createShader(gl, 1, stack);

					if (!vertexShader || !fragmentShader) {
						return;
					}

					const program = gl.createProgram();
					gl.attachShader(program, vertexShader);
					gl.attachShader(program, fragmentShader);
					gl.linkProgram(program);

					if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
						console.error(gl.getProgramInfoLog(program));
					}

					return program;
				});

				const label = stackEntry.slice(2).filter(name => name).join(' < ');
				subprograms.push([program, new Set([label]), resolver]);
			}

			for (const entry of subprograms) {
				const [program, labels, ...callbacks] = entry;

				if (programMap.has(program)) {
					const entry = programMap.get(program);
					entry.push(...callbacks);

					for (const label of labels) {
						entry[1].add(label);
					}

					continue;
				}

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
					const values = [...vertexValues, ...fragmentValues];

					entry.splice(2, 0, () => {
						for (const [i, setter] of setters.entries()) {
							setter(values[i]);
						}
					});
				}

				programMap.set(program, entry);
			}
		}

		const programs = [...programMap.values()];

		if (setups.length) {
			programs.unshift([, [], ...setups]);
		}

		if (values.length) {
			programs.push([, [], ...values]);
		}

		if (!isRoot) {
			return programs;
		}

		const objects = programs.map(([program, labels, ...callbacks]) => {
			return { program, callbacks, label: [...labels].join(', ') };
		});

		return ['', {}, ...objects];
	};
}

const animations = new Map();
const queue = new Set();

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
				param = callback(gl, duration, param);
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
	}
}

function schedule (gl, child, props) {
	if (props) {
		instanceMap.set(child, props);
	} else {
		instanceMap.delete(child);
	}

	if (!queue.size) {
		requestAnimationFrame(timestamp => {
			const prevSize = animations.size;

			for (const gl of queue) {
				const programs = getStored(animations, gl, () => [timestamp, 0]);
				programs.splice(2);

				for (const childNode of gl.canvas.childNodes) {
					if (instanceMap.has(childNode)) {
						const props = instanceMap.get(childNode);
						programs.push(props);
					}
				}

				if (!programs.length) {
					animations.delete(gl);
				}
			}
			
			queue.clear();

			if (animations.size && !prevSize) {
				draw(timestamp);	
			}
		});
	}

	queue.add(gl);
}

export default function renderProgram (props, canvas) {
	const { label } = props;
	const gl = canvas.getContext('webgl');
	const ref = [];

	return [() => {
		processMemo(null, [props], () => {
			const [child] = ref[0];
			schedule(gl, child, props);
			return () => schedule(gl, child);
		});

		return label;
	}, { ref }];
}
