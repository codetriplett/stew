import compile, { parse, Program } from './program';

function mock (object, callbackNames, constantNames) {
	for (const name of callbackNames) {
		object[name] = jest.fn();
	}

	for (const name of constantNames) {
		object[name] = name;
	}

	return object;
}

const canvas = mock({
	parentElement: {},
}, [
	'getContext',
], []);

const gl = mock({
	canvas,
}, [
	'getAttribLocation',
	'createBuffer',
	'bindBuffer',
	'bufferData',
	'vertexAttribPointer',
	'enableVertexAttribArray',
	'getUniformLocation',
	'uniform1u',
	'uniform1i',
	'uniform1f',
	'uniform2uv',
	'uniform3uv',
	'uniform4uv',
	'uniform2iv',
	'uniform3iv',
	'uniform4iv',
	'uniform2fv',
	'uniform3fv',
	'uniform4fv',
	'uniformMatrix2fv',
	'uniformMatrix3fv',
	'uniformMatrix4fv',
	'bindTexture',
	'createTexture',
	'texImage2D',
	'createProgram',
	'createShader',
	'shaderSource',
	'compileShader',
	'attachShader',
	'linkProgram',
	'useProgram',
	'getShaderSource',
	'getShaderParameter',
	'getShaderInfoLog',
	'getProgramParameter',
	'getProgramInfoLog',
], [
	'RGBA',
	'UNSIGNED_BYTE',
	'TEXTURE_MIN_FILTER',
	'TEXTURE_MAG_FILTER',
	'LINEAR',
	'NEAREST',
	'TEXTURE_2D',
	'TEXTURE_WRAP_S',
	'TEXTURE_WRAP_T',
	'CLAMP_TO_EDGE',
	'SHADER_TYPE',
	'VERTEX_SHADER',
	'FRAGMENT_SHADER',
	'ARRAY_BUFFER',
	'ELEMENT_ARRAY_BUFFER',
]);

const programMap = new WeakMap();
const requestAnimationFrame = jest.fn();
const convert = jest.fn();
let context;

beforeEach(() => {
	jest.clearAllMocks();
	let location = 0;
	gl.getAttribLocation.mockImplementation(() => location++);
	gl.getUniformLocation.mockImplementation(() => location++);
	gl.createShader.mockImplementation(SHADER_TYPE => ({ SHADER_TYPE }));
	gl.createProgram.mockImplementation(() => ({ id: Math.random() }));
	gl.getShaderParameter.mockReturnValue(true);
	gl.getProgramParameter.mockReturnValue(true);
	gl.shaderSource.mockImplementation((shader, code) => shader.code = code);
	gl.getShaderSource.mockImplementation(shader => shader.code);

	gl.attachShader.mockImplementation((program, shader) => {
		if (!programMap.has(program)) {
			programMap.set(program, {});
		}

		const { SHADER_TYPE } = shader;
		programMap.get(program)[SHADER_TYPE] = shader;
	});

	convert.mockReturnValue(gl);
	canvas.getContext.mockReturnValue(gl);
	context = { '': convert };
	requestAnimationFrame.mockImplementation((...params) => [triggerFrame] = params);
	globalThis.requestAnimationFrame = requestAnimationFrame;
	globalThis.window = {};
});

describe('parse', () => {
	it('standalone callbacks', () => {
		const actual = parse`${() => {}}`;

		expect(actual).toEqual([
			[expect.any(Array), []],
			[[''], []],
		]);
	});

	it('empty edges', () => {
		const actual = parse`
			${() => {}}
		`;

		expect(actual).toEqual([
			[expect.any(Array), []],
			[[''], []],
		]);
	});

	it('variables and statements', () => {
		const actual = parse`
			type vertex ${[]}
			position;
			${() => {}}
			type color ${[]}
			fragColor;
		`;

		expect(actual).toEqual([
			[expect.any(Array), ['position;'], ['', 'vertex', 'type']],
			[[''], ['fragColor;'], ['', 'color', 'type']],
		]);
	});

	it('allows indentation', () => {
		const actual = parse`
			type vertex ${[]}
			position;
			${() => {}}
			type color ${[]}
				fragColor;
		`;

		expect(actual).toEqual([
			[expect.any(Array), ['position;'], ['', 'vertex', 'type']],
			[[''], ['    fragColor;'], ['', 'color', 'type']],
		]);
	});

	it('empty vertex shader', () => {
		const actual = parse`
			${() => {}}
			type color ${[]}
			fragColor;
		`;

		expect(actual).toEqual([
			[expect.any(Array), []],
			[[''], ['fragColor;'], ['', 'color', 'type']],
		]);
	});

	it('empty fragment shader', () => {
		const actual = parse`
			type vertex ${[]}
			position;
			${() => {}}
		`;

		expect(actual).toEqual([
			[expect.any(Array), ['position;'], ['', 'vertex', 'type']],
			[[''], []],
		]);
	});

	it('multiple programs', () => {
		const actual = parse`
			type vertex ${[]}
			position;
			${() => {}}
			type color ${[]}
			fragColor;
			${() => {}}
			type color2 ${[]}
			fragColor2;
		`;

		expect(actual).toEqual([
			[expect.any(Array), ['position;'], ['', 'vertex', 'type']],
			[[''], ['fragColor;'], ['', 'color', 'type']],
			[[''], ['fragColor2;'], ['', 'color2', 'type']],
		]);
	});

	it('variables with properties', () => {
		const actual = parse`
			type first ${[]} abc
			${() => {}} lmno
			type second ${[]} xyz
		`;

		expect(actual).toEqual([
			[expect.any(Array), [], ['abc', 'first', 'type']],
			[['lmno'], [], ['xyz', 'second', 'type']],
		]);
	});
});

describe('compileProgram', () => {
	it('creates program', () => {
		const draw = jest.fn();
		const vector = [123, 456, 789];
		const color = [0.123, 0.456, 0.789];

		const callback = compile`
			vec3 uVector ${vector}
			gl_Position = vec4(uVector, 1.0);
			${draw}
			vec3 uColor ${color}
			gl_FragColor = vec4(uColor, 1.0);
		`;

		const actual = callback(canvas);
		const layout = actual[0](...actual.slice(1));

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), draw],
		]);

		expect(layout).toEqual(
`#version 300 es
uniform vec3 uVector;
void main() {
    gl_Position = vec4(uVector, 1.0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor;
void main() {
    gl2_FragColor = vec4(uColor, 1.0);
}`
		);

		const callbacks = actual[2].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, vector],
			[1, color],
		]);
	});

	it('empty vertex shader', () => {
		const draw = jest.fn();
		const color = [0.123, 0.456, 0.789];

		const callback = compile`
			${draw}
			vec3 uColor ${color}
			gl_FragColor = vec4(uColor, 1.0);
		`;

		const actual = callback(canvas);
		const layout = actual[0](...actual.slice(1));

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), draw],
		]);

		expect(layout).toEqual(
`#version 300 es
void main() {
    gl_Position = vec4(0, 0, 0, 1);
    gl_PointSize = 16.0;
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor;
void main() {
    gl2_FragColor = vec4(uColor, 1.0);
}`
		);

		const callbacks = actual[2].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, color],
		]);
	});
	
	it('empty fragment shader', () => {
		const draw = jest.fn();
		const vector = [123, 456, 789];

		const callback = compile`
			vec3 uVector ${vector}
			gl_Position = vec4(uVector, 1.0);
			${draw}
		`;

		const actual = callback(canvas);
		const layout = actual[0](...actual.slice(1));

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), draw],
		]);

		expect(layout).toEqual(
`#version 300 es
uniform vec3 uVector;
void main() {
    gl_Position = vec4(uVector, 1.0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
void main() {
    gl2_FragColor = vec4(1, 1, 1, 1);
}`
		);

		const callbacks = actual[2].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, vector],
		]);
	});

	it('included chained callbacks', () => {
		const draw = jest.fn();
		const vector = [123, 456, 789];
		const color = [0.123, 0.456, 0.789];

		const callback = compile`
			vec3 uVector ${vector}
			gl_Position = vec4(uVector, 1.0);
			${draw}
			${draw}
			vec3 uColor ${color}
			gl_FragColor = vec4(uColor, 1.0);
		`;

		const actual = callback(canvas);

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), draw, draw],
		]);

		const callbacks = actual[2].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, vector],
			[1, color],
		]);
	});

	it('includes multiple shaders', () => {
		const draw = jest.fn();
		const vector = [123, 456, 789];
		const color = [0.123, 0.456, 0.789];
		const color2 = [0.789, 0.456, 0.123];

		const callback = compile`
			vec3 uVector ${vector}
			gl_Position = vec4(uVector, 1.0);
			${draw}
			vec3 uColor ${color}
			gl_FragColor = vec4(uColor, 1.0);
			${draw}
			vec3 uColor2 ${color2}
			gl_FragColor = vec4(uColor2, 1.0);
		`;

		const actual = callback(canvas);
		const layout = actual[0](...actual.slice(1));

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), draw],
			[expect.any(Object), expect.any(Function), draw],
		]);
		
		expect(layout).toEqual(
`#version 300 es
uniform vec3 uVector;
void main() {
    gl_Position = vec4(uVector, 1.0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor;
void main() {
    gl2_FragColor = vec4(uColor, 1.0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor2;
void main() {
    gl2_FragColor = vec4(uColor2, 1.0);
}`
		);

		let callbacks = actual[2].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, vector],
			[1, color],
		]);
		
		gl.uniform3fv.mockClear();
		callbacks = actual[3].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[2, vector],
			[3, color2],
		]);
	});

	it('creates nested program', () => {
		const draw = jest.fn();
		const matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

		const array = [
			{ vector: [123, 456, 789], color: [0.123, 0.456, 0.789] },
			{ vector: [987, 654, 321], color: [0.987, 0.654, 0.321] },
		];
		
		const callback = compile`
			mat3 uMatrix ${matrix}
			gl_Position = vec4(uVector, 1.0);
			${array.map(({ vector, color }) => compile`
				vec3 uVector ${vector}
				${draw}
				vec3 uColor ${color}
			`)}
			gl_FragColor = vec4(uColor, 1.0);
		`;

		const actual = callback(canvas);
		const layout = actual[0](...actual.slice(1));

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), expect.any(Function), draw, expect.any(Function), draw],
		]);
		
		expect(layout).toEqual(
`#version 300 es
uniform vec3 uVector;
uniform mat3 uMatrix;
void main() {
    gl_Position = vec4(uVector, 1.0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor;
void main() {
    gl2_FragColor = vec4(uColor, 1.0);
}`
		);

		const callbacks = actual[2].slice(1);
		callbacks[0]();

		expect(gl.uniformMatrix3fv.mock.calls).toEqual([
			[2, false, matrix],
		]);

		callbacks[1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, array[0].vector],
			[1, array[0].color],
		]);

		gl.uniform3fv.mockClear();
		callbacks[3]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, array[1].vector],
			[1, array[1].color],
		]);
	});

	it.only('allows mix of subprograms', () => {
		const draw = jest.fn();
		const matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

		const array = [
			{ vector: [123, 456, 789], color: [0.123, 0.456, 0.789] },
			{ vector: [987, 654, 321], color: [0.987, 0.654, 0.321] },
		];
		
		const callback = compile`
			mat3 uMatrix ${matrix}
			gl_Position = vec4(uVector, 1.0);
			${array.map(({ vector, color }, i) => !i ? compile`
				vec3 uVector ${vector}
				*float intensity = 1.0;
				${draw}
				vec3 uColor ${color}
			` : compile`
				vec3 uVector ${vector}
				*float intensity = 0.5;
				${draw}
				vec3 uColor ${color}
			`)}
			gl_FragColor = vec4(uColor * intensity, 1.0);
		`;

		const actual = callback(canvas);
		const layout = actual[0](...actual.slice(1));

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), expect.any(Function), draw, expect.any(Function), draw],
		]);
		
		expect(layout).toEqual(
`#version 300 es
uniform vec3 uVector;
uniform mat3 uMatrix;
out float intensity;
void main() {
    intensity = 1.0;
    gl_Position = vec4(uVector, 1.0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor;
in float intensity;
void main() {
    gl2_FragColor = vec4(uColor * intensity, 1.0);
}`
		);

		const callbacks = actual[2].slice(1);
		callbacks[0]();

		expect(gl.uniformMatrix3fv.mock.calls).toEqual([
			[2, false, matrix],
		]);

		callbacks[1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, array[0].vector],
			[1, array[0].color],
		]);

		gl.uniform3fv.mockClear();
		callbacks[3]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, array[1].vector],
			[1, array[1].color],
		]);
	});

	it('creates reuses subprogram', () => {
		const draw = jest.fn();
		const vector = [123, 456, 789];
		const color = [0.123, 0.456, 0.789];

		const child = compile`
			vec3 uVector ${vector}
			${draw}
			vec3 uColor ${color}
		`;
		
		const callback = compile`
			gl_Position = vec4(uVector, 1.0);
			${[child]}
			gl_FragColor = vec4(uColor, 1.0);
			${[child]}
			gl_FragColor = vec4(uColor, 0.5);
		`;

		const actual = callback(canvas);
		const layout = actual[0](...actual.slice(1));

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), draw],
			[expect.any(Object), expect.any(Function), draw],
		]);
		
		expect(layout).toEqual(
`#version 300 es
uniform vec3 uVector;
void main() {
    gl_Position = vec4(uVector, 1.0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor;
void main() {
    gl2_FragColor = vec4(uColor, 1.0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor;
void main() {
    gl2_FragColor = vec4(uColor, 0.5);
}`
		);

		let callbacks = actual[2].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, vector],
			[1, color],
		]);

		gl.uniform3fv.mockClear();
		callbacks = actual[3].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[2, vector],
			[3, color],
		]);
	});

	it('uses previous shaders and program', () => {
		const draw = jest.fn();

		function render ({ vector, color }) {
			return compile`
				vec3 uVector ${vector}
				gl_Position = vec4(uVector, 1.0)
				${draw}
				vec3 uColor ${color}
				gl_FragColor = vec4(uColor, 1.0)
			`;
		}
		
		const previous = render({
			vector: [123, 456, 789],
			color: [0.123, 0.456, 0.789],
		});

		previous(canvas);
		jest.clearAllMocks();

		const prepare = render({
			vector: [987, 654, 321],
			color: [0.987, 0.654, 0.321],
		});

		expect(prepare).toEqual(expect.any(Function));
		const actual = prepare(canvas);
		expect(actual).toEqual([Program, { gl }, expect.any(Array)]);
		const callbacks = actual[2].slice(1);
		expect(callbacks).toEqual([expect.any(Function), draw]);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, [987, 654, 321]],
			[1, [0.987, 0.654, 0.321]],
		]);

		expect(gl.createShader).not.toHaveBeenCalled();
		expect(gl.createProgram).not.toHaveBeenCalled();
	});
});
