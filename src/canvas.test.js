import { compileProgram } from './canvas';

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
]);

beforeEach(() => {
	jest.clearAllMocks();
	let location = 0;
	gl.getAttribLocation.mockImplementation(() => location++);
	gl.getUniformLocation.mockImplementation(() => location++);
});

describe('compileProgram', () => {
	it('variables', () => {
		const array = [123, 456, 789];
		const draw = jest.fn();
		
		const actual = stew`
			vec3 uVector ${array}
			${draw}
		`;

		expect(actual).toEqual(expect.any(Function));
		actual(gl);
		expect(gl.uniform3fv).toHaveBeenCalledWith(0, [123, 456, 789]);
		// expect(draw).toHaveBeenCalledWith(gl);
	});
});
