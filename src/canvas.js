import { isServer } from './document';

export const sequenceMap = new WeakMap();
export const rootMap = new WeakMap();
const pauseMap = new WeakMap();

// how should it end previous loop?
// - otherwise it would need to store callbacks somewhere that the initialized loop can access, along with context (aslo complicates subsequent paused renders)
// - maybe allow WeakMap here, since shaders will need it to process template literals
function animate (gl, callbackSet) {
	const render = timestamp => {
		if (!canvas.parentElement) {
			return;
		}

		for (const [program, ...callbacks] of callbackSet) {
			if (program) {
				gl.useProgram(program);
			}

			for (const callback of callbacks) {
				callback(gl, timestamp);
			}
		}

		if (!pauseMap.get(canvas)) {
			requestAnimationFrame(render);
		}
	};

	const { canvas } = gl;
	requestAnimationFrame(render);
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
			shader = [count, []];
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
				shader[1].push(line.trim().replace(/;?$/, ';'));
			}
		}
	}

	if (sequence[0][0] > 0) {
		sequence.unshift([0, []]);
	}

	if (count) {
		sequence.push([count, []]);
	}

	return sequence;
}

function get (map, key, callback) {
	if (map.has(key)) {
		return map.get(key);
	}

	const value = callback();
	map.set(key, value);
	return value;
}

export function createShader (gl, type, index, stack) {
	const allCode = [];
	const allVars = [];

	for (const pair of stack) {
		const [, code, ...vars] = pair[index];
		allCode.push(...code);
		allVars.push(...vars);
	}

	if (allCode.length === 0) {
		return;
	}

	const code = [
		...allVars.map(([, name, type, subtype]) => {
			const category = !subtype || type === 'sampler2D' ? 'uniform' : 'attribute';
			return `${category} ${type} ${name};`;
		}),
		'void main() {', ...allCode, '}',
	].join('\n');

	const shader = gl.createShader(gl[type]);
	gl.shaderSource(shader, code);
	gl.compileShader(shader);
	return shader;
}

// TODO: return empty function if isServer is true
export function compileProgram (strings, ...values) {
	if (isServer) {
		return;
	}

	// creates and stores parsed template
	const sequence = get(sequenceMap, strings, () => parse(strings));
	const [vertexInfo, ...fragmentInfos] = sequence;

	return (gl, parentMap = rootMap, allCallbackSet = new Set(), ...stack) => {
		const vertexValues = values.splice(0, vertexInfo.length - 2);
		const map = get(parentMap, strings, () => new WeakMap());
		let vertexShader = map.get(vertexInfo);

		for (const fragmentInfo of fragmentInfos) {
			const [resolverCount] = fragmentInfo;
			const resolvers = values.splice(0, resolverCount);
			const fragmentValues = values.splice(0, fragmentInfo.length - 2);
			const fullStack = [[vertexInfo, fragmentInfo], ...stack];
			const callbackSet = new Set();

			for (const resolver of resolvers) {
				if (Array.isArray(resolver)) {
					for (const prepare of resolver.reverse()) {
						prepare(gl, map, callbackSet, ...fullStack);
					}

					continue;
				} else if (typeof resolver !== 'function') {
					continue;
				}

				// creates and stores a program for each unique subprogram chain
				const programCallbacks = get(map, fragmentInfo, () => {
					if (!vertexShader) {
						vertexShader = createShader(gl, 'VERTEX_SHADER', 0, fullStack);
						map.set(vertexInfo, vertexShader);
					}

					const fragmentShader = createShader(gl, 'FRAGMENT_SHADER', 1, fullStack);
					let program;

					if (vertexShader && fragmentShader) {
						program = gl.createProgram();
						gl.attachShader(program, vertexShader);
						gl.attachShader(program, fragmentShader);
						gl.linkProgram(program);
					}

					return [program];
				});

				// TODO: maybe only store program in map with fragmentInfo
				// - it should store all resolvers for vertex/fragment pair in this array, but only during this prepare iteration
				programCallbacks.push(resolver);
				callbackSet.add(programCallbacks);
			}

			for (const programCallbacks of callbackSet) {
				const [program] = programCallbacks;
				const values = [...vertexValues, ...fragmentValues];
				allCallbackSet.add(programCallbacks);

				// creates and stores setters for each layer in each unique subprogram chain
				const setters = !program ? [] : get(map, program, () => {
					const [,, ...vertexVars] = vertexInfo;
					const [,, ...fragmentVars] = fragmentInfo;

					return [...vertexVars, ...fragmentVars].map(definition => {
						const [subname, name, type, subtype] = definition;
						const setter = !subtype || subtype === 'TEXTURE' ? createUniformSetter : createAttributeSetter;
						return setter(gl, program, subname, name, type, subtype);
					});
				});

				programCallbacks.splice(1, 0, () => {
					// TODO: see these only need to be set once before animation loop or if they are needed on each draw
					// - what happesn when programs are switched and then switched back?
					// - maybe only need to set the ones that have subnames on each draw
					// - if not needed on every draw, they could be iterated over here and this callback could just process the subname setters
					for (const [i, setter] of setters.entries()) {
						setter(values[i]);
					}
				});
			}
		}

		if (parentMap === rootMap) {
			animate(gl, allCallbackSet);
		}
	};
}

export default function renderCanvas (ref, props, children, type, paused) {
	const [,, node] = ref;
	const { width, height } = props;
	context = node.getContext(type);
	
	if (width !== node.width || height !== node.height) {
		context.viewport(0, 0, width, height);
	}

	pauseMap.set(node, paused);
	return context;
}
