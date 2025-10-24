import {
	createTilt,
	createRotation,
} from '/game/matrix.mjs';

import { loadSprites } from '/game/model.mjs';
import { shader } from '/game/shader.mjs';

export const gameState = stew({
	scales: [-1, 0, 1],
});

export const keyboardState = stew({
	activeKeys: [],
});

window.addEventListener('keydown', ({ key, repeat }) => {
	if (key !== ' ' || repeat) {
		return;
	}

	keyboardState.activeKeys = [60, 64];

	// const scale = [-1, 11, 4, 9, 2, 7, 0];
	// const scale = [1, 5, 0, 7, 2, 9, 4];
	// const scale = [1, 5, 0, 7];

	// const range = [50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71].map(index => {
	// 	return index + (scale.indexOf(index % 12) > 0 ? scale[0] : 0);
	// });

	// const index = range.indexOf(keyboardState.activeKeys[0]);
	// const root = index > 7 ? 0 : index + 1;
	// keyboardState.activeKeys = [range[root], range[root + 2], range[root + 4]];
});

window.addEventListener('keyup', ({ key }) => {
	if (key !== ' ') {
		return;
	}

	keyboardState.activeKeys = [];
});

function cards ({ '': { scene }, staff, bias }, reference) {
	const { scales } = gameState;
	const { activeKeys } = keyboardState;

	const cardInstances = stew(prevCards => {
		const sequence = [
			[10, 20, 0, 0, 20, 0],
			[-10, 20, 0, -20, 0, 0],
			[-10, -20, 0, 0, -20, 0],
			[10, -20, 0, 20, 0, 0],
			() => sequence,
		];

		return scales.map((scale, i) => {
			let group = prevCards?.[i]?.group;

			if (!group) {
				const position = [80 * (i - 1), i === 1 ? 80 : -20, 0];

				group = {
					position,
					matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
					animations: {
						position: [
							[0, 0, 0, 0, 0, 0],
							[...position, 50, 0, 0],
							1000,
							...sequence,
						],
					},
				};
			}

			const column = scale + 7;
			const row = staff === 'bass' ? 1 : 0;
			const sprite = scene.cards[row][column];
			return { sprite, group, position: [0, 0, 0], matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
		});
	}, [staff, bias, scales]);

	const decorationInstances = stew(() => {
		if (activeKeys.length === 0) {
			return [];
		}

		const positions = activeKeys.map(key => {
			return [0, -1, 1, -2, 2, 3, -4, 4, -5, 5, -6, 6, 7, -8, 8, -9, 9, 10, -11, 11, -12, 12, -13, 13, 14, -15, 15, -16, 16][key - 48];
		});

		const decorations = [];

		for (const [i, cardInstance] of cardInstances.entries()) {
			const { group } = cardInstance;
			const scale = scales[i];
			const offset = [3, 7, 4, 1, 5, 2, 6, 4, 2, 6, 3, 7, 4, 1, 5][scale + 7];

			for (const [i, position] of positions.entries()) {
				const inferredBias = scale < 0 ? -1 : scale > 0 ? 1 : bias;
				const placement = position >= 0 ? position : -position - (inferredBias < 0 ? 0 : 1);
				const noteY = 3 * (placement - offset);
				const keyX = position < 0 ? 5 * (-position - offset) - 2 : 5 * (position - offset);
				const row = scale > -2 && scale < 2 ? 3 : scale < 0 ? scale + 4 : scale + 2;

				if (noteY >= 0 && noteY <= 24) {
					const noteColumn = (position >= 0 ? 2 : inferredBias < 0 ? 0 : 4) + (placement % 2 ? 0 : 1);
					const sprite = scene.notes[row][noteColumn];
					const instance = { sprite, group, position: [12, noteY - 20.5, -1 - i], matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
					decorations.push(instance);
				}

				if (keyX >= 0 && keyX <= 40) {
					const keyColumn = position < 0 ? 3 : [0, 1, 2, 0, 1, 1, 2][position % 7];
					const sprite = scene.keys[row][keyColumn];
					const instance = { sprite, group, position: [keyX - 20, 18, -1], matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
					decorations.push(instance);
				}
			}
		}

		return decorations;
	}, [cardInstances, activeKeys]);

	return [shader, { reference }, ...cardInstances, ...decorationInstances];
}

export function cosmicChord () {
	const [camera, vertexes, normals, elements] = stew(() => {
		const scale = [1 / 640, 0, 0, 0, 1 / 360, 0, 0, 0, 1 / 360];
		const matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
		const camera = { scale, matrix, position: [0, 0, 0], angles: [-Math.PI / 6, Math.PI / 4, 0] };
		const vertexes = new Int8Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]);
		const normals = new Int8Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
		const elements = new Uint16Array([2, 0, 1, 1, 3, 2]);

		const sequence = [
			[100, 0, 0, 0, 0, 0],
			[-100, 0, 0, 0, 0, 0],
			() => sequence,
		];

		camera.animations = {
			angles: [[0, 0.001, 0, 0, 0, 0]],
			position: [[0, 0, 0, 0, 0, 0], [-50, 0, 0, 0, 0, 0], 4000, ...sequence],
		}

		return [camera, vertexes, normals, elements];
	}, []);

	const scene = stew(async () => {
		const [cards, keys, notes, palette, reference] = await Promise.all([
			loadSprites('/chord-cards.png', 15, 2),
			loadSprites('/active-keys.png', 4, 7),
			loadSprites('/active-notes.png', 6, 7),
			loadSprites('/palette.png', 16, 16),
			loadSprites('/reference.png', 1, 1, 5.5),
		]);

		return { cards, keys, notes, palette, reference };
	}, [], null);

	if (!scene) {
		return;
	}

	const referenceInstances = stew(() => {
		const sprite = scene.reference[0][0];
		
		const group = {
			// matrix: [20, 0, 0, 0, 20, 0, 0, 0, 20],
			light: { shine: [0.75, 0.5, 0.25, 1] }
		};

		return [
			{ sprite, group, matrix: createRotation(0) },
		];
	}, []);

	// TODO: move this to its own impulse
	// const uiInstances = stew(() => {
	// 	const sprite = scene.notes[0][0];
	// 	const group = {};

	// 	return [
	// 		{ sprite: scene.cards[0][7], group, position: [0, 0, 0] },
	// 		{ sprite, group, position: [0, 0, -1] },
	// 		{ sprite, group, position: [0, 6, -1] },
	// 	];
	// }, []);

	const record = new Set();

	return ['', { scene, camera, vertexes, normals, elements, record },
		['canvas', { width: 1280, height: 720 }, stew`
			${gl => {
				gl.clearColor(0.0, 0.0, 0.0, 1.0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.clear(gl.DEPTH_BUFFER_BIT);
				gl.enable(gl.CULL_FACE);
				gl.cullFace(gl.BACK);
				gl.enable(gl.DEPTH_TEST);
				gl.depthFunc(gl.LESS);
				// gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
				record.clear();
			}}
		`,
			[cards, null, referenceInstances[0].group],
			[shader, null, ...referenceInstances],
		stew`
			${gl => {
				gl.clear(gl.DEPTH_BUFFER_BIT);
			}}
		`,
			// [shader, { reference: camera }, ...uiInstances],
			stew`${gl => 16}`,
		],
	];
}

export default [cosmicChord, {
	'': 'Cosmic Chord',
}, ['style', null, `
	canvas {
		image-rendering: pixelated;
	}
`]];
