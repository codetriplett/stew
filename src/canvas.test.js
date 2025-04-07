import { parse, compileProgram } from './canvas';

jest.mock('./document', () => ({ isServer: false }));
const canvas = {};
let stringsArray;

function stew (...params) {
	const strings = params.shift();
	stringsArray.push(strings);
	return compileProgram(strings, ...params);
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

const requestAnimationFrame = jest.fn();
let program, triggerFrame;

beforeEach(() => {
	jest.clearAllMocks();
	let location = 0;
	gl.getAttribLocation.mockImplementation(() => location++);
	gl.getUniformLocation.mockImplementation(() => location++);
	gl.createShader.mockReturnValue({});
	gl.createProgram.mockReturnValue({});
	canvas.parentElement = {};
	program = {};
	stringsArray = [];
	requestAnimationFrame.mockImplementation((...params) => [triggerFrame] = params);
	globalThis.requestAnimationFrame = requestAnimationFrame;
});

describe('parse', () => {
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
			[1, ['fourth;'], ['', 'third', 'type']],
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
			[2, ['second;'], ['', 'first', 'type']],
			[2, ['fourth;'], ['', 'third', 'type']],
			[2, []],
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
			[1, [], ['xyz', 'second', 'type']],
		]);
	});
});

describe.only('compileProgram', () => {
	it('creates program', () => {
		const draw = jest.fn();
		const vector = [123, 456, 789];
		const color = [0.123, 0.456, 0.789];
		
		const actual = stew`
			vec3 uVector ${vector}
			gl_Position = vec4(uVector, 1.0)
			${draw}
			vec3 uColor ${color}
			gl_FragColor = vec4(uColor, 1.0)
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl);
		triggerFrame();
		expect(draw).toHaveBeenCalledWith(gl, undefined);

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
		
		const actual = stew`
			gl_Position = vec4(uVector, 1.0)
			${array.map(({ vector, color }) => stew`
				vec3 uVector ${vector}
				${draw}
				vec3 uColor ${color}
			`)}
			gl_FragColor = vec4(uColor, 1.0)
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl);
		triggerFrame();
		expect(draw).toHaveBeenCalledWith(gl, undefined);

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, array[0].vector],
			[1, array[0].color],
			[0, array[1].vector],
			[1, array[1].color],
		]);
	});

	it.only('uses previous shaders and program', () => {
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

		previous(gl);
		jest.clearAllMocks();

		const actual = render({
			vector: [987, 654, 321],
			color: [0.987, 0.654, 0.321],
		});

		expect(actual).toEqual(expect.any(Function));
		actual(gl);
		triggerFrame();
		expect(draw).toHaveBeenCalledWith(gl, undefined);

		expect(gl.uniform3fv.mock.calls).toEqual([
			[0, [987, 654, 321]],
			[1, [0.987, 0.654, 0.321]],
		]);

		expect(gl.createShader).not.toHaveBeenCalled();
		expect(gl.createProgram).not.toHaveBeenCalled();
	});





	// it('sets multiple variables', () => {
	// 	const vector = [123, 456, 789];
	// 	const matrix = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		
	// 	const actual = stew`
	// 		vec3 uVector ${vector}
	// 		mat3 uMatrix ${matrix}
	// 	`;

	// 	expect(actual).toEqual(expect.any(Function));
	// 	actual(gl, program);
	// 	expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	// 	expect(gl.uniformMatrix3fv).toHaveBeenCalledWith(1, false, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
	// });

	// it('calls setup', () => {
	// 	const array = [123, 456, 789];
	// 	const setup = jest.fn();
		
	// 	const actual = stew`
	// 		${setup}
	// 		vec3 uVector ${array}
	// 	`;

	// 	expect(actual).toEqual(expect.any(Function));
	// 	actual(gl, program);
	// 	expect(setup.mock.calls).toEqual([[gl]]);
	// 	expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	// });

	// it('calls resolver', () => {
	// 	const array = [123, 456, 789];
	// 	const draw = jest.fn();
		
	// 	const actual = stew`
	// 		vec3 uVector ${array}
	// 		${draw}
	// 	`;

	// 	expect(actual).toEqual(expect.any(Function));
	// 	actual(gl, program);
	// 	expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	// 	expect(draw.mock.calls).toEqual([[gl]]);
	// });

	// it('calls array of resolvers', () => {
	// 	const array = [123, 456, 789];
	// 	const drawFirst = jest.fn();
	// 	const drawSecond = jest.fn();
		
	// 	const actual = stew`
	// 		vec3 uVector ${array}
	// 		${[drawFirst, drawSecond]}
	// 	`;

	// 	expect(actual).toEqual(expect.any(Function));
	// 	actual(gl, program);
	// 	expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	// 	expect(drawFirst.mock.calls).toEqual([[gl]]);
	// 	expect(drawSecond.mock.calls).toEqual([[gl]]);
	// });

	// it('calls setup and resolver', () => {
	// 	const array = [123, 456, 789];
	// 	const setup = jest.fn();
	// 	const draw = jest.fn();
		
	// 	const actual = stew`
	// 		${setup}
	// 		vec3 uVector ${array}
	// 		${draw}
	// 	`;

	// 	expect(actual).toEqual(expect.any(Function));
	// 	actual(gl, program);
	// 	expect(setup.mock.calls).toEqual([[gl]]);
	// 	expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	// 	expect(draw.mock.calls).toEqual([[gl]]);
	// });

	// it('calls multiple setups', () => {
	// 	const array = [123, 456, 789];
	// 	const setup = jest.fn();
		
	// 	const actual = stew`
	// 		${setup}
	// 		${setup}
	// 		vec3 uVector ${array}
	// 	`;

	// 	expect(actual).toEqual(expect.any(Function));
	// 	actual(gl, program);
	// 	expect(setup.mock.calls).toEqual([[gl], [gl]]);
	// 	expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	// });

	// it('calls multiple resolvers', () => {
	// 	const array = [123, 456, 789];
	// 	const draw = jest.fn();
		
	// 	const actual = stew`
	// 		vec3 uVector ${array}
	// 		${draw}
	// 		${draw}
	// 	`;

	// 	expect(actual).toEqual(expect.any(Function));
	// 	actual(gl, program);
	// 	expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	// 	expect(draw.mock.calls).toEqual([[gl], [gl]]);
	// });

	// // needs to keep of stack of active calls to compileProgram to gather all unique names
	// // - store each one to map, using render callback as key
	// // - parent will add the parse child info to itself
	// it.skip('creates program', () => {
	// 	const array = [123, 456, 789];
	// 	const setup = jest.fn();
	// 	const draw = jest.fn();
	// 	const followup = jest.fn();
		
	// 	const actual = stew`
	// 		${setup}
	// 		vec3 uPosition ${array}
	// 		gl_Position = vec4(uPosition, 1.0);
	// 		${draw}
	// 		vec3 uColor ${array}
	// 		gl_FragColor = vec4(uColor, 1.0);
	// 		${followup}
	// 	`;
	// 	// have it default to gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); if not provided

	// 	expect(actual).toEqual(expect.any(Function));
	// 	actual(gl, program);
	// 	expect(setup.mock.calls).toEqual([[gl]]);
	// 	expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
	// 	expect(draw.mock.calls).toEqual([[gl]]);
	// });
});
