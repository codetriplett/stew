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

const draw = () => {};
const before = () => {};
const between = () => {};
const after = () => {};

function alpha (vertex, color) {
	return compile`
		vec3 uAlphaVertex ${vertex}
		vec3 uVertex = uAlphaVertex;
		${draw}
		vec3 uAlphaColor ${color}
		vec3 uColor = uAlphaColor;
	`;
}

function beta (vertex, color) {
	return compile`
		vec3 uBetaVertex ${vertex}
		vec3 uVertex = uBetaVertex;
		${draw}
		vec3 uBetaColor ${color}
		vec3 uColor = uBetaColor;
	`;
}

const expectedProgram = {
	VERTEX_SHADER:
`#version 300 es
uniform vec3 uVertex;
void main() {
    gl_Position = vec4(uVertex, 0);
}`,
	FRAGMENT_SHADER:
`#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor;
void main() {
    gl2_FragColor = vec4(uColor, 1);
}`,
};

const expectedAlphaProgram = {
	VERTEX_SHADER:
`#version 300 es
uniform vec3 uAlphaVertex;
void main() {
    vec3 uVertex = uAlphaVertex;
    gl_Position = vec4(uVertex, 0);
}`,
	FRAGMENT_SHADER:
`#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uAlphaColor;
void main() {
    vec3 uColor = uAlphaColor;
    gl2_FragColor = vec4(uColor, 1);
}`,
};

const expectedBetaProgram = {
	VERTEX_SHADER:
`#version 300 es
uniform vec3 uBetaVertex;
void main() {
    vec3 uVertex = uBetaVertex;
    gl_Position = vec4(uVertex, 0);
}`,
	FRAGMENT_SHADER:
`#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uBetaColor;
void main() {
    vec3 uColor = uBetaColor;
    gl2_FragColor = vec4(uColor, 1);
}`,
};

beforeEach(() => {
	jest.clearAllMocks();
	canvas.getContext.mockReturnValue(gl);
	gl.createProgram.mockImplementation(() => ({}));
	gl.createShader.mockImplementation(type => ({ type }));
	gl.shaderSource.mockImplementation((shader, code) => shader.code = code);
	gl.attachShader.mockImplementation((program, shader) => program[shader.type] = shader.code);
	gl.getShaderParameter.mockReturnValue(true);
	gl.getProgramParameter.mockReturnValue(true);
	gl.getAttribLocation.mockImplementation((_, name) => name);
	gl.getUniformLocation.mockImplementation((_, name) => name);
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
			vec3 uColor ${[1, 1, 1]}
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
			vec3 uColor ${[1, 1, 1]}
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
});

describe('compile', () => {
	it('simple program', () => {
		const render = compile`
			vec3 uVertex ${[0, 0, 0]}
			gl_Position = vec4(uVertex, 0);
			${draw}
			vec3 uColor ${[1, 1, 1]}
			gl_FragColor = vec4(uColor, 1);
		`;

		const [Component, props] = render(canvas);
		const { chain } = props;

		expect(Component(props)).toEqual(['', null,
`#version 300 es
uniform vec3 uVertex;
void main() {
    gl_Position = vec4(uVertex, 0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor;
void main() {
    gl2_FragColor = vec4(uColor, 1);
}`			
		]);
		
		expect(chain).toEqual([
			[expectedProgram, expect.any(Function), draw],
		]);

		chain[0][1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uVertex', [0, 0, 0]],
			['uColor', [1, 1, 1]],
		]);
	});
	
	it('nested program', () => {
		const render = compile`
			gl_Position = vec4(uVertex, 0);
			${[compile`
				vec3 uVertex ${[0, 0, 0]}
				${draw}
				vec3 uColor ${[1, 1, 1]}
			`]}
			gl_FragColor = vec4(uColor, 1);
		`;

		const [Component, props] = render(canvas);
		const { chain } = props;

		expect(Component(props)).toEqual(['', null,
`#version 300 es
uniform vec3 uVertex;
void main() {
    gl_Position = vec4(uVertex, 0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uColor;
void main() {
    gl2_FragColor = vec4(uColor, 1);
}`			
		]);
		
		expect(chain).toEqual([
			[expectedProgram, expect.any(Function), draw],
		]);

		chain[0][1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uVertex', [0, 0, 0]],
			['uColor', [1, 1, 1]],
		]);
	});
	
	it('multiple programs', () => {
		const render = compile`
			gl_Position = vec4(uVertex, 0);
			${[alpha([0, 0, 0], [1, 1, 1]), alpha([2, 2, 2], [3, 3, 3])]}
			${[beta([4, 4, 4], [5, 5, 5]), beta([6, 6, 6], [7, 7, 7])]}
			gl_FragColor = vec4(uColor, 1);
		`;

		const [Component, props] = render(canvas);
		const { chain } = props;

		expect(Component(props)).toEqual(['', null,
`#version 300 es
uniform vec3 uAlphaVertex;
void main() {
    vec3 uVertex = uAlphaVertex;
    gl_Position = vec4(uVertex, 0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uAlphaColor;
void main() {
    vec3 uColor = uAlphaColor;
    gl2_FragColor = vec4(uColor, 1);
}`,
`#version 300 es
uniform vec3 uBetaVertex;
void main() {
    vec3 uVertex = uBetaVertex;
    gl_Position = vec4(uVertex, 0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uBetaColor;
void main() {
    vec3 uColor = uBetaColor;
    gl2_FragColor = vec4(uColor, 1);
}`
		]);
		
		expect(chain).toEqual([
			[expectedAlphaProgram, expect.any(Function), draw, expect.any(Function), draw],
			[expectedBetaProgram, expect.any(Function), draw, expect.any(Function), draw],
		]);

		chain[0][1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uAlphaVertex', [0, 0, 0]],
			['uAlphaColor', [1, 1, 1]],
		]);

		gl.uniform3fv.mockClear();
		chain[0][3]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uAlphaVertex', [2, 2, 2]],
			['uAlphaColor', [3, 3, 3]],
		]);

		gl.uniform3fv.mockClear();
		chain[1][1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uBetaVertex', [4, 4, 4]],
			['uBetaColor', [5, 5, 5]],
		]);

		gl.uniform3fv.mockClear();
		chain[1][3]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uBetaVertex', [6, 6, 6]],
			['uBetaColor', [7, 7, 7]],
		]);
	});
	
	it('sorts programs', () => {
		const render = compile`
			gl_Position = vec4(uVertex, 0);
			${[alpha([0, 0, 0], [1, 1, 1]), beta([4, 4, 4], [5, 5, 5]), alpha([2, 2, 2], [3, 3, 3]), beta([6, 6, 6], [7, 7, 7])]}
			gl_FragColor = vec4(uColor, 1);
		`;

		const [Component, props] = render(canvas);
		const { chain } = props;

		expect(Component(props)).toEqual(['', null,
`#version 300 es
uniform vec3 uAlphaVertex;
void main() {
    vec3 uVertex = uAlphaVertex;
    gl_Position = vec4(uVertex, 0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uAlphaColor;
void main() {
    vec3 uColor = uAlphaColor;
    gl2_FragColor = vec4(uColor, 1);
}`,
`#version 300 es
uniform vec3 uBetaVertex;
void main() {
    vec3 uVertex = uBetaVertex;
    gl_Position = vec4(uVertex, 0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uBetaColor;
void main() {
    vec3 uColor = uBetaColor;
    gl2_FragColor = vec4(uColor, 1);
}`
		]);
		
		expect(chain).toEqual([
			[expectedAlphaProgram, expect.any(Function), draw, expect.any(Function), draw],
			[expectedBetaProgram, expect.any(Function), draw, expect.any(Function), draw],
		]);

		chain[0][1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uAlphaVertex', [0, 0, 0]],
			['uAlphaColor', [1, 1, 1]],
		]);

		gl.uniform3fv.mockClear();
		chain[0][3]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uAlphaVertex', [2, 2, 2]],
			['uAlphaColor', [3, 3, 3]],
		]);

		gl.uniform3fv.mockClear();
		chain[1][1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uBetaVertex', [4, 4, 4]],
			['uBetaColor', [5, 5, 5]],
		]);

		gl.uniform3fv.mockClear();
		chain[1][3]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uBetaVertex', [6, 6, 6]],
			['uBetaColor', [7, 7, 7]],
		]);
	});
	
	it('surrounding resolvers', () => {
		const render = compile`
			gl_Position = vec4(uVertex, 0);
			${before}
			${[alpha([0, 0, 0], [1, 1, 1]), beta([4, 4, 4], [5, 5, 5])]}
			${between}
			${[alpha([2, 2, 2], [3, 3, 3]), beta([6, 6, 6], [7, 7, 7])]}
			${after}
			gl_FragColor = vec4(uColor, 1);
		`;

		const [Component, props] = render(canvas);
		const { chain } = props;

		expect(Component(props)).toEqual(['', null,
`#version 300 es
uniform vec3 uAlphaVertex;
void main() {
    vec3 uVertex = uAlphaVertex;
    gl_Position = vec4(uVertex, 0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uAlphaColor;
void main() {
    vec3 uColor = uAlphaColor;
    gl2_FragColor = vec4(uColor, 1);
}`,
`#version 300 es
uniform vec3 uBetaVertex;
void main() {
    vec3 uVertex = uBetaVertex;
    gl_Position = vec4(uVertex, 0);
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
uniform vec3 uBetaColor;
void main() {
    vec3 uColor = uBetaColor;
    gl2_FragColor = vec4(uColor, 1);
}`
		]);
		
		expect(chain).toEqual([
			[null, before],
			[expectedAlphaProgram, expect.any(Function), draw],
			[expectedBetaProgram, expect.any(Function), draw],
			[null, between],
			[expectedAlphaProgram, expect.any(Function), draw],
			[expectedBetaProgram, expect.any(Function), draw],
			[null, after],
		]);

		chain[1][1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uAlphaVertex', [0, 0, 0]],
			['uAlphaColor', [1, 1, 1]],
		]);

		gl.uniform3fv.mockClear();
		chain[4][1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uAlphaVertex', [2, 2, 2]],
			['uAlphaColor', [3, 3, 3]],
		]);

		gl.uniform3fv.mockClear();
		chain[2][1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uBetaVertex', [4, 4, 4]],
			['uBetaColor', [5, 5, 5]],
		]);

		gl.uniform3fv.mockClear();
		chain[5][1]();

		expect(gl.uniform3fv.mock.calls).toEqual([
			['uBetaVertex', [6, 6, 6]],
			['uBetaColor', [7, 7, 7]],
		]);
	});
});
