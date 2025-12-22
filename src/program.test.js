import compile, { vertexStack, fragmentStack, parse, extract } from './program.new';

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
	vertexStack.splice(1);
	vertexStack[0].splice(1)
	fragmentStack.splice(1);
	fragmentStack[0].splice(1);
	globalThis.window = {};
});

describe('extract', () => {
	it('creates final entry', () => {
		const actual = extract`
			type vertex ${123}
			position;
			${'lmno'}
			type color ${789}
			fragColor;
		`;

		expect(actual).toEqual([
			[new WeakMap(), expect.any(Array), [123]],
			[new WeakMap(), expect.any(Array), [789], [null, 'lmno']],
		]);
	});

	it('creates intermediate entry', () => {
		const actual = extract`
			type vertex ${123}
			position;
			${['lmno']}
			type color ${789}
			fragColor;
		`;

		expect(actual).toEqual([
			[new WeakMap(), expect.any(Array), [123]],
			[new WeakMap(), expect.any(Array), [789], 'lmno'],
		]);
	});

	it('includes surrounding resolvers', () => {
		const actual = extract`
			type vertex ${123}
			position;
			${'abc'}
			${['lmno']}
			${'xyz'}
			type color ${789}
			fragColor;
		`;

		expect(actual).toEqual([
			[new WeakMap(), expect.any(Array), [123]],
			[new WeakMap(), expect.any(Array), [789], [null, 'abc'], 'lmno', [null, 'xyz']],
		]);
	});

	it('includes multiple programs', () => {
		const actual = extract`
			type vertex ${123}
			position;
			${'abc'}
			type color ${456}
			fragColor;
			${'xyz'}
			type color ${789}
			fragColor;
		`;

		expect(actual).toEqual([
			[new WeakMap(), expect.any(Array), [123]],
			[new WeakMap(), expect.any(Array), [456], [null, 'abc']],
			[new WeakMap(), expect.any(Array), [789], [null, 'xyz']],
		]);
	});
});

describe('compile', () => {
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
