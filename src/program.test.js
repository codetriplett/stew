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
	'VERTEX_SHADER',
	'FRAGMENT_SHADER',
	'ARRAY_BUFFER',
	'ELEMENT_ARRAY_BUFFER',
]);

const requestAnimationFrame = jest.fn();
const convert = jest.fn();
let context;

beforeEach(() => {
	jest.clearAllMocks();
	let location = 0;
	gl.getAttribLocation.mockImplementation(() => location++);
	gl.getUniformLocation.mockImplementation(() => location++);
	gl.createShader.mockReturnValue({});
	gl.createProgram.mockReturnValue({});
	gl.getShaderParameter.mockReturnValue(true);
	gl.getProgramParameter.mockReturnValue(true);
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
			[['']],
		]);
	});

	it('empty edges', () => {
		const actual = parse`
			${() => {}}
		`;

		expect(actual).toEqual([
			[['']],
		]);
	});
	
	it('no callback', () => {
		const actual = parse
`type vertex ${[]}
position;`;

		expect(actual).toEqual([
			[[], ['position;'], ['', 'vertex', 'type']],
		]);
	});

	it('variables and statements', () => {
		const actual = parse
`type vertex ${[]}
position;
${() => {}}
type color ${[]}
fragColor;`;

		expect(actual).toEqual([
			[[], ['position;'], ['', 'vertex', 'type']],
			[[''], ['fragColor;'], ['', 'color', 'type']],
		]);
	});

	it('edge callbacks', () => {
		const actual = parse
`${() => {}}
type vertex ${[]}
position;
${() => {}}
type color ${[]}
fragColor;
${() => {}}`;

		expect(actual).toEqual([
			[[''], ['position;'], ['', 'vertex', 'type']],
			[[''], ['fragColor;'], ['', 'color', 'type']],
			[['']],
		]);
	});

	it('chained callbacks', () => {
		const actual = parse
`${() => {}}
${() => {}}
type vertex ${[]}
position;
${() => {}}
${() => {}}
type color ${[]}
fragColor;
${() => {}}
${() => {}}`;

		expect(actual).toEqual([
			[['', ''], ['position;'], ['', 'vertex', 'type']],
			[['', ''], ['fragColor;'], ['', 'color', 'type']],
			[['', '']],
		]);
	});

	it('multiple shaders', () => {
		const actual = parse
`type vertex ${[]}
position;
${() => {}}
type color ${[]}
fragColor;
${() => {}}
type color2 ${[]}
fragColor2;`;

		expect(actual).toEqual([
			[[], ['position;'], ['', 'vertex', 'type']],
			[[''], ['fragColor;'], ['', 'color', 'type']],
			[[''], ['fragColor2;'], ['', 'color2', 'type']],
		]);
	});

	it('variables with properties', () => {
		const actual = parse
`type first ${[]} abc
${() => {}} lmno
type second ${[]} xyz`;

		expect(actual).toEqual([
			[[], [], ['abc', 'first', 'type']],
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

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), draw],
		]);

		const callbacks = actual[2].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, vector],
			[1, color],
		]);
	});

	it('included edge callbacks', () => {
		const first = jest.fn();
		const draw = jest.fn();
		const last = jest.fn();
		const vector = [123, 456, 789];
		const color = [0.123, 0.456, 0.789];

		const callback = compile`
			${first}
			vec3 uVector ${vector}
			gl_Position = vec4(uVector, 1.0);
			${draw}
			vec3 uColor ${color}
			gl_FragColor = vec4(uColor, 1.0);
			${last}
		`;

		const actual = callback(canvas);

		expect(actual).toEqual([Program, { gl },
			[, first],
			[expect.any(Object), expect.any(Function), draw],
			[, last],
		]);

		const callbacks = actual[3].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, vector],
			[1, color],
		]);
	});

	// TODO: change edge callbacks to setup and teardown
	// - only run once each tied to Programs effect callback
	// - callbacks can already be set up to run before and after each render by placing them by the array of children
	it('included chained callbacks', () => {
		const first = jest.fn();
		const draw = jest.fn();
		const last = jest.fn();
		const vector = [123, 456, 789];
		const color = [0.123, 0.456, 0.789];

		const callback = compile`
			${first}
			${first}
			vec3 uVector ${vector}
			gl_Position = vec4(uVector, 1.0);
			${draw}
			${draw}
			vec3 uColor ${color}
			gl_FragColor = vec4(uColor, 1.0);
			${last}
			${last}
		`;

		const actual = callback(canvas);

		expect(actual).toEqual([Program, { gl },
			[, first, first],
			[expect.any(Object), expect.any(Function), draw, draw],
			[, last, last],
		]);

		const callbacks = actual[3].slice(1);
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

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), draw],
			[expect.any(Object), expect.any(Function), draw],
		]);

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
			[0, vector],
			[1, color2],
		]);
	});

	it('creates nested program', () => {
		const draw = jest.fn();

		const array = [
			{ vector: [123, 456, 789], color: [0.123, 0.456, 0.789] },
			{ vector: [987, 654, 321], color: [0.987, 0.654, 0.321] },
		];
		
		const callback = compile`
			gl_Position = vec4(uVector, 1.0);
			${array.map(({ vector, color }) => compile`
				vec3 uVector ${vector}
				${draw}
				vec3 uColor ${color}
			`)}
			gl_FragColor = vec4(uColor, 1.0);
		`;

		const actual = callback(canvas);

		expect(actual).toEqual([Program, { gl },
			[expect.any(Object), expect.any(Function), draw, expect.any(Function), draw],
		]);

		const callbacks = actual[2].slice(1);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, array[0].vector],
			[1, array[0].color],
		]);

		gl.uniform3fv.mockClear();
		callbacks[2]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, array[1].vector],
			[1, array[1].color],
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
