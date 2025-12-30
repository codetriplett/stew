import { execute, processMemo } from './impulse';
import { animations, schedule } from './state';

const rootMap = new WeakMap();
const setterMap = new WeakMap();
const vertexRoot = [new WeakMap()];
const fragmentRoot = [new WeakMap()];

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

function getStored (map, key, callback, ...params) {
	if (map.has(key)) {
		return map.get(key);
	}

	const value = callback(key, ...params);
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

function createCode (stack, varyings, type) {
	const isFragment = type === 'FRAGMENT_SHADER';
	const precisionCode = new Set();
	const allCode = [];
	const allVars = [];
	const headerCode = isFragment ? ['out vec4 gl2_FragColor;'] : [];

	for (const [info] of stack.slice(1)) {
		const [, [...code], ...vars] = info;

		while (code[0]?.startsWith?.('precision ')) {
			precisionCode.add(code.shift());
		}

		allCode.push(...code);
		allVars.push(...vars.filter(definition => definition.length > 2));
	}

	if (allCode.length === 0) {
		allCode.push(isFragment
			? 'gl2_FragColor = vec4(1, 1, 1, 1);'
			: 'gl_Position = vec4(0, 0, 0, 1);\n    gl_PointSize = 16.0;'
		);
	}
	
	if (isFragment && precisionCode.size === 0) {
		precisionCode.add('precision mediump float;');
	}

	const varyingType = isFragment ? 'in' : 'out';
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

export function createShader (gl, stack, varyings, type) {
	return getStored(stack[0], gl, () => {
		const code = createCode(stack, varyings, type);
		const shader = gl.createShader(gl[type]);
		gl.shaderSource(shader, code);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
		}

		return shader;
	});
}

function createSetter (gl, program, variables, values) {
	const scopedSetterMap = getStored(setterMap, gl, () => new WeakMap());

	const setters = variables.map(variable => {
		return getStored(scopedSetterMap, variable, () => {
			if (variable.length < 3) {
				return createOtherSetter(gl, ...variable);
			}

			const type = variable[2];
			const subtype = variable[3];
			const create = !subtype || type === 'sampler2D' ? createUniformSetter : createAttributeSetter;
			return create(gl, program, ...variable);
		});
	});

	return (gl, duration) => {
		for (const [i, setter] of setters.entries()) {
			let value = values[i];

			if (typeof value === 'function') {
				value = value(duration);
			}

			setter(value);
		}
	};
}

function getGl (canvas) {
	return canvas.getContext('webgl2', {
		premultipliedAlpha: /^(transparent)?$/.test(canvas.style.background),
		antialias: !/^(crisp-edges|pixelated)$/.test(canvas.style.imageRendering),
	});
}

function createProgram (canvas, vertexStack, fragmentStack, siblingMap, ...callbacks) {
	const gl = getStored(rootMap, canvas, getGl);

	const program = getStored(vertexStack[0], fragmentStack, () => {
		const varyings = getStored(fragmentStack[0], vertexStack, () => []);
		const vertexShader = createShader(gl, vertexStack, varyings, 'VERTEX_SHADER');
		const fragmentShader = createShader(gl, fragmentStack, varyings, 'FRAGMENT_SHADER');
		const program = gl.createProgram();
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(program));
		}

		return program;
	});

	const isNew = !siblingMap.has(program);
	const entry = getStored(siblingMap, program, () => [program]);
	const composite = [...vertexStack.slice(1), ...fragmentStack.slice(1)];
	const allVariables = [];
	const allValues = [];

	for (const [info, set, values] of composite) {
		if (set.has(entry)) {
			continue;
		}

		set.add(entry);
		allVariables.push(...info.slice(2));
		allValues.push(...values);
	}

	if (allVariables.length) {
		const setter = createSetter(gl, program, allVariables, allValues);
		entry.push(setter);
	}

	entry.push(...callbacks);

	if (isNew) {
		return entry;
	}
}

export function parse (strings) {
	let shader = [[], []];
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
		const indentation = [];
		let codeLines = info[1];

		codeLines = info[1].map(line => {
			line = line.replace(/\t/g, '    ');
			indentation.push(line.match(/^\s*/)[0].length);
			return line;
		});
		
		// const stack = i ? fragmentStack : vertexStack;
		const minIndentation = Math.min(...indentation);
		info[1] = codeLines.map(line => line.slice(minIndentation));
		// return createSetup(stack, info);
	}

	return sequence;
}

export function extract (canvas, stack, info, values, vertexStack, siblingMap) {
	const [labels, code, ...variables] = info;
	const resolvers = values.splice(0, labels.length);
	const chain = [];
	let callbacks = [];

	if (code.length || variables.length) {
		stack = getStored(stack[0], info, () => [new WeakMap(), [info], ...stack.slice(1)]);
		stack[1].splice(1, 2, new WeakSet(), values.splice(0, variables.length));
	}

	if (!vertexStack) {
		return stack;
	}

	for (const resolver of resolvers) {
		if (typeof resolver === 'function') {
			callbacks.push(resolver);
			continue;
		} else if (!Array.isArray(resolver)) {
			continue;
		} else if (callbacks.length) {
			chain.push([null, ...callbacks]);
			siblingMap.clear();
			callbacks = [];
		}

		for (const callback of resolver) {
			chain.push(...execute(callback, canvas, vertexStack, stack, siblingMap));
		}
	}

	if (!chain.length) {
		const entry = createProgram(canvas, vertexStack, stack, siblingMap, ...callbacks);

		if (entry) {
			chain.push(entry)
		}
	} else if (callbacks.length) {
		chain.push([null, ...callbacks]);
	}

	return chain;
}

function Program ({ canvas, chain }) {
	const gl = getStored(rootMap, canvas, getGl);
	const chainReference = processMemo(() => [], []);
	chainReference.splice(0, chainReference.length, ...chain);

	processMemo(null, [], () => {
		const referenceArray = getStored(animations, gl, () => [undefined, 0]);
		referenceArray.push(chainReference);
		schedule();

		return () => {
			const index = referenceArray.indexOf(chainReference);

			if (index !== -1) {
				referenceArray.splice(index, 1);
			}
		};
	});

	// TODO: print string of all unique programs that are active
	// - print each unique vertex shader with each unique fragment shader under it
	return '';
}

export default function compile (strings, ...values) {
	if (typeof window !== 'object') {
		return;
	}

	const [vertexInfo, ...fragmentInfos] = getStored(rootMap, strings, parse);

	return (canvas, vertexStack = vertexRoot, fragmentStack = fragmentRoot, siblingMap = new Map()) => {
		const chain = [];
		values = [...values];
		vertexStack = extract(canvas, vertexStack, vertexInfo, values);

		for (const fragmentInfo of fragmentInfos) {
			chain.push(...extract(canvas, fragmentStack, fragmentInfo, values, vertexStack, siblingMap));
		}

		return vertexStack.length > 2 ? chain : [Program, { canvas, chain }];
	};
}
