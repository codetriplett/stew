import { createProjection, createMatrix } from './game/matrix.mjs';

export const scene = stew({
	camera: {
		// projection: createProjection(Math.PI * 0.25, 16 / 9, 0.1),
		projection: [9 / 16, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
		position: [0, 0, 0],
		angles: [0, 0, 0],
		// motion: [0, 0, 0, 0, 0, 0, 0, 0, 0],
		motion: [0, 0, 0, 0, 0, 0, 0, 0.0005, 0],
		scale: 4 / 270,
		// target: hero,
	},
	light: {
		// matrix: createMatrix(Math.PI * 0.25, Math.PI * 0.5, 0, true),
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
		// angles: [0.707, 0, 0],
		// motion: [0, 0, 0, 0, 0, 0, 0, 0.001, 0],
	},
	models: new Set(),
	obstacles: new Set(),
});

export function graphics () {
    const [props, content] = arguments;
	return content || ['', null, 'Graphics'];
}

export default [graphics, {
	'': 'Graphics',
}];
