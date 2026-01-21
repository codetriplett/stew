import { createProjection, createMatrix } from './graphics/matrix.mjs';

export const scene = stew({
	camera: {
		projection: createProjection(Math.PI * 0.25, 16 / 9, 0.1),
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
		angles: [0, 0, 0],
		position: [0, 0, 0],
		motion: [0, 0, 0, 0, 0, 0, 0, 0, 0],
		scale: 40 / 360,
		// target: hero,
	},
	light: {
		matrix: createMatrix(Math.PI * 0.25, Math.PI * 0.5, 0, true),
		angles: [0.707, 0, 0],
		motion: [0, 0, 0, 0, 0, 0, 0, 0.001, 0],
	},
	models: new Set(),
	obstacles: new Set(),
});

export function graphics () {
    const [props, content] = arguments;
	console.log(content);
	return content || ['', null, 'Graphics'];
}

export default [graphics, {
	'': 'Graphics',
}];
