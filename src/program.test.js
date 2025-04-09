import compile, { resetId, parse } from './program';

jest.mock('./document', () => ({ isServer: false }));
const canvas = {};
let stringsArray;

function stew (...params) {
	const strings = params.shift();
	stringsArray.push(strings);
	return compile(strings, ...params);
}

function mock (object, callbackNames, constantNames) {
	for (const name of callbackNames) {
		object[name] = jest.fn();
	}

	for (const name of constantNames) {
		object[name] = name;
	}

	return object;
}

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
let context, triggerFrame;

beforeEach(() => {
	jest.clearAllMocks();
	let location = 0;
	gl.getAttribLocation.mockImplementation(() => location++);
	gl.getUniformLocation.mockImplementation(() => location++);
	gl.createShader.mockReturnValue({});
	gl.createProgram.mockReturnValue({});
	gl.getProgramParameter.mockReturnValue(true);
	convert.mockReturnValue(gl);
	canvas.parentElement = {};
	context = { '': convert };
	stringsArray = [];
	requestAnimationFrame.mockImplementation((...params) => [triggerFrame] = params);
	globalThis.requestAnimationFrame = requestAnimationFrame;
	resetId();
});

describe('parse', () => {
	it('standalone callback', () => {
		const actual = parse`${() => {}}`;

		expect(actual).toEqual([
			[0, []],
			[[''], []],
		]);
	});

	it('variables', () => {
		const actual = parse`
			type first ${[]}
			type second ${[]}
		`;

		expect(actual).toEqual([
			[0, [], ['', 'first', 'type'], ['', 'second', 'type']],
		]);
	});

	it('statements', () => {
		const actual = parse`
			first
			second
		`;

		expect(actual).toEqual([
			[0, ['first;', 'second;']],
		]);
	});

	it('variables and statements', () => {
		const actual = parse`
			type first ${[]}
			second
			type third ${[]}
			fourth
		`;

		expect(actual).toEqual([
			[0, ['second;', 'fourth;'], ['', 'first', 'type'], ['', 'third', 'type']],
		]);
	});

	it('sequence', () => {
		const actual = parse`
			type first ${[]}
			second
			${() => {}}
			type third ${[]}
			fourth
		`;

		expect(actual).toEqual([
			[0, ['second;'], ['', 'first', 'type']],
			[[''], ['fourth;'], ['', 'third', 'type']],
		]);
	});

	it('edge callbacks', () => {
		const actual = parse`
			${() => {}}
			${() => {}}
			type first ${[]}
			second
			${() => {}}
			${() => {}}
			type third ${[]}
			fourth
			${() => {}}
			${() => {}}
		`;

		expect(actual).toEqual([
			[0, []],
			[['', ''], ['second;'], ['', 'first', 'type']],
			[['', ''], ['fourth;'], ['', 'third', 'type']],
			[['', ''], []],
		]);
	});

	it('variables with properties', () => {
		const actual = parse`
			type first ${[]} abc
			${() => {}} lmno
			type second ${[]} xyz
		`;

		expect(actual).toEqual([
			[0, [], ['abc', 'first', 'type']],
			[['lmno'], [], ['xyz', 'second', 'type']],
		]);
	});
});

describe('compileProgram', () => {
	it('creates program', () => {
		const draw = jest.fn();
		const vector = [123, 456, 789];
		const color = [0.123, 0.456, 0.789];
		
		const prepare = stew`
			vec3 uVector ${vector}
			gl_Position = vec4(uVector, 1.0)
			${draw} main
			vec3 uColor ${color}
			gl_FragColor = vec4(uColor, 1.0)
		`;

		expect(prepare).toEqual(expect.any(Function));
		const actual = prepare(context);
		expect(actual).toEqual(['', {}, expect.any(Object)]);
		const { callbacks } = actual[2];
		expect(callbacks).toEqual([expect.any(Function), draw]);
		callbacks[0]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, vector],
			[1, color],
		]);
	});

	it('creates nested program', () => {
		const draw = jest.fn();

		const array = [
			{ vector: [123, 456, 789], color: [0.123, 0.456, 0.789] },
			{ vector: [987, 654, 321], color: [0.987, 0.654, 0.321] },
		];
		
		const prepare = stew`
			gl_Position = vec4(uVector, 1.0)
			${array.map(({ vector, color }) => stew`
				vec3 uVector ${vector}
				${draw}
				vec3 uColor ${color}
			`)}
			gl_FragColor = vec4(uColor, 1.0)
		`;

		expect(prepare).toEqual(expect.any(Function));
		const actual = prepare(context);
		expect(actual).toEqual(['', {}, expect.any(Object)]);
		const { callbacks } = actual[2];
		expect(callbacks).toEqual([expect.any(Function), draw, expect.any(Function), draw]);
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
			return stew`
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

		previous(context);
		jest.clearAllMocks();

		const prepare = render({
			vector: [987, 654, 321],
			color: [0.987, 0.654, 0.321],
		});

		expect(prepare).toEqual(expect.any(Function));
		const actual = prepare(context);
		expect(actual).toEqual(['', {}, expect.any(Object)]);
		const { callbacks } = actual[2];
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
