import { parse, compileProgram } from './canvas';

function stew (strings, ...values) {
	return compileProgram(strings, ...values);
} 

function mock (callbackNames, constantNames) {
	const object = {};

	for (const name of callbackNames) {
		object[name] = jest.fn();
	}

	for (const name of constantNames) {
		object[name] = name;
	}

	return object;
}

const gl = mock([
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
]);

let program;

beforeEach(() => {
	jest.clearAllMocks();
	let location = 0;
	gl.getAttribLocation.mockImplementation(() => location++);
	gl.getUniformLocation.mockImplementation(() => location++);
	program = {};
});

describe.only('parse', () => {
	it('variables', () => {
		const actual = parse`
			type first ${[]}
			type second ${[]}
		`;

		expect(actual).toEqual([
			[0, '', ['', 'first', 'type'], ['', 'second', 'type']],
		]);
	});

	it('statements', () => {
		const actual = parse`
			first
			second
		`;

		expect(actual).toEqual([
			[0, 'first;\nsecond;'],
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
			[0, 'second;\nfourth;', ['', 'first', 'type'], ['', 'third', 'type']],
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
			[0, 'second;', ['', 'first', 'type']],
			[1, 'fourth;', ['', 'third', 'type']],
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
			[2, ''],
			[2, 'second;', ['', 'first', 'type']],
			[2, 'fourth;', ['', 'third', 'type']],
		]);
	});

	it('variables with properties', () => {
		const actual = parse`
			type first ${[]} abc
			${() => {}} lmno
			type second ${[]} xyz
		`;

		expect(actual).toEqual([
			[0, '', ['abc', 'first', 'type']],
			[1, '', ['xyz', 'second', 'type']],
		]);
	});
});

describe('compileProgram', () => {
	it('sets variable', () => {
		const vector = [123, 456, 789];
		
		const actual = stew`
			vec3 uVector ${vector}
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl, program);
		expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	});

	it('sets multiple variables', () => {
		const vector = [123, 456, 789];
		const matrix = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		
		const actual = stew`
			vec3 uVector ${vector}
			mat3 uMatrix ${matrix}
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl, program);
		expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
		expect(gl.uniformMatrix3fv).toHaveBeenCalledWith(1, false, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it('calls setup', () => {
		const array = [123, 456, 789];
		const setup = jest.fn();
		
		const actual = stew`
			${setup}
			vec3 uVector ${array}
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl, program);
		expect(setup.mock.calls).toEqual([[gl]]);
		expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	});

	it('calls resolver', () => {
		const array = [123, 456, 789];
		const draw = jest.fn();
		
		const actual = stew`
			vec3 uVector ${array}
			${draw}
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl, program);
		expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
		expect(draw.mock.calls).toEqual([[gl]]);
	});

	it('calls array of resolvers', () => {
		const array = [123, 456, 789];
		const drawFirst = jest.fn();
		const drawSecond = jest.fn();
		
		const actual = stew`
			vec3 uVector ${array}
			${[drawFirst, drawSecond]}
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl, program);
		expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
		expect(drawFirst.mock.calls).toEqual([[gl]]);
		expect(drawSecond.mock.calls).toEqual([[gl]]);
	});

	it('calls setup and resolver', () => {
		const array = [123, 456, 789];
		const setup = jest.fn();
		const draw = jest.fn();
		
		const actual = stew`
			${setup}
			vec3 uVector ${array}
			${draw}
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl, program);
		expect(setup.mock.calls).toEqual([[gl]]);
		expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
		expect(draw.mock.calls).toEqual([[gl]]);
	});

	it('calls multiple setups', () => {
		const array = [123, 456, 789];
		const setup = jest.fn();
		
		const actual = stew`
			${setup}
			${setup}
			vec3 uVector ${array}
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl, program);
		expect(setup.mock.calls).toEqual([[gl], [gl]]);
		expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	});

	it('calls multiple resolvers', () => {
		const array = [123, 456, 789];
		const draw = jest.fn();
		
		const actual = stew`
			vec3 uVector ${array}
			${draw}
			${draw}
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl, program);
		expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
		expect(draw.mock.calls).toEqual([[gl], [gl]]);
	});

	// needs to keep of stack of active calls to compileProgram to gather all unique names
	// - store each one to map, using render callback as key
	// - parent will add the parse child info to itself
	it.skip('creates program', () => {
		const array = [123, 456, 789];
		const setup = jest.fn();
		const draw = jest.fn();
		const followup = jest.fn();
		
		const actual = stew`
			${setup}
			vec3 uPosition ${array}
			gl_Position = vec4(uPosition, 1.0);
			${draw}
			vec3 uColor ${array}
			gl_FragColor = vec4(uColor, 1.0);
			${followup}
		`;
		// have it default to gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); if not provided

		expect(actual).toEqual(expect.any(Function));
		actual(gl, program);
		expect(setup.mock.calls).toEqual([[gl]]);
		expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
		expect(draw.mock.calls).toEqual([[gl]]);
	});
});
