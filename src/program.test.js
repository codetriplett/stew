import compile, { parse, extract } from './program';

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
	style: {}
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

beforeEach(() => {
	jest.clearAllMocks();
	canvas.getContext.mockReturnValue(gl);
	gl.createProgram.mockImplementation(() => ({}));
	gl.createShader.mockImplementation(type => ({ type }));
	gl.shaderSource.mockImplementation((shader, code) => shader.code = code);
	gl.attachShader.mockImplementation((program, shader) => program[shader.type] = shader.code);
	gl.getShaderParameter.mockReturnValue(true);
	gl.getProgramParameter.mockReturnValue(true);
	globalThis.window = {};
});

describe('parse', () => {
	it('parses code and variables', () => {
		const actual = parse`
			type vertex ${123}
			position;
			${() => {}}
			type color ${789}
			fragColor;
		`;

		expect(actual).toEqual([
			[[], ['position;'], ['', 'vertex', 'type']],
			[[''], ['fragColor;'], ['', 'color', 'type']],
		]);
	});

	it('no vertex shader', () => {
		const actual = parse`
			${() => {}}
			type color ${789}
			fragColor;
		`;

		expect(actual).toEqual([
			[[], []],
			[[''], ['fragColor;'], ['', 'color', 'type']],
		]);
	});

	it('no fragment shader', () => {
		const actual = parse`
			type vertex ${123}
			position;
			${() => {}}
		`;

		expect(actual).toEqual([
			[[], ['position;'], ['', 'vertex', 'type']],
			[[''], []],
		]);
	});
	

	it('neither shader', () => {
		const actual = parse`
			${() => {}}
		`;

		expect(actual).toEqual([
			[[], []],
			[[''], []],
		]);
	});
	
	it('no resolvers', () => {
		const actual = parse`
			type vertex ${123}
			position;
			type color ${789}
			fragColor;
		`;

		expect(actual).toEqual([
			[[], ['position;', 'fragColor;'], ['', 'vertex', 'type'], ['', 'color', 'type']],
		]);
	});
	
	it('multiple resolvers', () => {
		const actual = parse`
			type vertex ${123}
			position;
			${() => {}}
			${() => {}}
			type color ${789}
			fragColor;
		`;

		expect(actual).toEqual([
			[[], ['position;'], ['', 'vertex', 'type']],
			[['', ''], ['fragColor;'], ['', 'color', 'type']],
		]);
	});

	it('multiple fragment shaders', () => {
		const actual = parse`
			type vertex ${123}
			position;
			${() => {}}
			type color1 ${456}
			fragColor1;
			${() => {}}
			type color2 ${789}
			fragColor2;
		`;

		expect(actual).toEqual([
			[[], ['position;'], ['', 'vertex', 'type']],
			[[''], ['fragColor1;'], ['', 'color1', 'type']],
			[[''], ['fragColor2;'], ['', 'color2', 'type']],
		]);
	});
});

describe('extract', () => {
	it('extends vertex stack', () => {
		const [info] = parse`
			vec3 uVertex ${[0, 0, 0]}
			gl_Position = vec4(uVertex, 0);
			${() => {}}
			type color ${[1, 1, 1]}
			gl_FragColor = vec4(uColor, 1);
		`;

		const stack = [new WeakMap()];
		const values = [123, () => {}, 789];
		const actual = extract(canvas, stack, info, values);
		expect(actual).toEqual([new WeakMap(), [info, new WeakSet(), [123]]]);
	});

	it('adds to chain', () => {
		const [vertexInfo, fragmentInfo] = parse`
			vec3 uVertex ${[0, 0, 0]}
			gl_Position = vec4(uVertex, 0);
			${() => {}}
			type color ${[1, 1, 1]}
			gl_FragColor = vec4(uColor, 1);
		`;

		let vertexStack = [new WeakMap()];
		const callback = () => {};
		const values = [123, callback, 789];
		vertexStack = extract(canvas, vertexStack, vertexInfo, values);
		let fragmentStack = [new WeakMap()];
		const siblingMap = new Map();
		const actual = extract(canvas, fragmentStack, fragmentInfo, values, vertexStack, siblingMap);
		fragmentStack = fragmentStack[0].get(fragmentInfo);
		expect(fragmentStack).toEqual([new WeakMap(), [fragmentInfo, new WeakSet(), [789]]]);

		expect(actual).toEqual([
			[expect.any(Object), expect.any(Function), callback],
		]);
	});

	// it('creates intermediate entry', () => {
	// 	const actual = extract`
	// 		type vertex ${123}
	// 		position;
	// 		${['lmno']}
	// 		type color ${789}
	// 		fragColor;
	// 	`;

	// 	expect(actual).toEqual([
	// 		[new WeakMap(), expect.any(Array), [123]],
	// 		[new WeakMap(), expect.any(Array), [789], 'lmno'],
	// 	]);
	// });

	// it('includes surrounding resolvers', () => {
	// 	const actual = extract`
	// 		type vertex ${123}
	// 		position;
	// 		${'abc'}
	// 		${['lmno']}
	// 		${'xyz'}
	// 		type color ${789}
	// 		fragColor;
	// 	`;

	// 	expect(actual).toEqual([
	// 		[new WeakMap(), expect.any(Array), [123]],
	// 		[new WeakMap(), expect.any(Array), [789], [null, 'abc'], 'lmno', [null, 'xyz']],
	// 	]);
	// });

	// it('includes multiple programs', () => {
	// 	const actual = extract`
	// 		type vertex ${123}
	// 		position;
	// 		${'abc'}
	// 		type color ${456}
	// 		fragColor;
	// 		${'xyz'}
	// 		type color ${789}
	// 		fragColor;
	// 	`;

	// 	expect(actual).toEqual([
	// 		[new WeakMap(), expect.any(Array), [123]],
	// 		[new WeakMap(), expect.any(Array), [456], [null, 'abc']],
	// 		[new WeakMap(), expect.any(Array), [789], [null, 'xyz']],
	// 	]);
	// });
});

describe.skip('compile', () => {
	it('creates final entry', () => {
		const actual = compile`
			type vertex ${123}
			position;
			${() => {}}
			type color ${789}
			fragColor;
		`;

		const layout = actual(canvas);
		layout[0]();
	});
});
