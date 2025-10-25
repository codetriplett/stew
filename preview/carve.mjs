import { createRotation, createTilt } from '/game/matrix.mjs';
import { loadSprites } from '/game/model.mjs';
import { shader } from '/game/shader.mjs';

export const state = stew({
	red: 119,
	green: 119,
	blue: 119,
	expandedColor: '',
});

export function handleFullscreen (element) {
	if (document.fullscreenElement) {
		document.exitFullscreen();
	} else {
		element.requestFullscreen();
	}
}

export function palette () {
	const { red, green, blue, expandedColor } = state;
	const names = ['red', 'green', 'blue'];
	const values = Array(16).fill(0).map((_, i) => i * 17).reverse();

	return ['div', { className: 'brush' },
		...names.map((name, i) => ['div', { className: `grid-wrapper ${name === expandedColor ? 'active' : ''}` },
			['div', { className: 'grid' },
				...values.map(value => ['button', {
					type: 'button',
					className: `cell ${value === state[name] ? 'active' : ''}`,
					style: { backgroundColor: `rgb(${i === 0 ? value : red}, ${i === 1 ? value : green}, ${i === 2 ? value : blue})` },
					onclick: () => {
						if (expandedColor !== name) {
							state.expandedColor = name;
						} else if (value !== state[name]) {
							state[name] = value;
						} else {
							state.expandedColor = '';
						}
					},
				}]),
			],
			['button', {
				type: 'button',
				className: 'close',
				style: { backgroundColor: `rgb(${red}, ${green}, ${blue})` },
				onclick: () => {
					state.expandedColor = '';
				},
			}],
		]),
	];
}

// move mouse with one finger to tilt and rotate camera
//   move both fingers to zoom
// hold one finger and
//   move the other finger to move cursor
// 	 tap the other finger to apply paint or chisel effect
// tap one finger to move cursor up, down, left, or right by one pixel

// have right side have toggles for fullscreen, add/remove, paint/chisel
export function carve () {
	const [camera, elements] = stew(() => {
		const scale = [1 / 640, 0, 0, 0, 1 / 360, 0, 0, 0, 1 / 360];
		const matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
		const camera = { scale, matrix, position: [0, 0, 0], angles: [0, 0, 0] };
		const elements = new Uint16Array([2, 0, 1, 1, 3, 2]);
		return [camera, elements];
	}, []);

	const scene = stew(async () => {
		const [reference] = await Promise.all([
			loadSprites('/reference.png', 1, 1, 5.5),
		]);

		return { reference };
	}, [], null);

	if (!scene) {
		return;
	}

	let ref;

	return ref = ['', { camera, elements },
		['div', null,
			['canvas', { width: 1280, height: 560 }, stew`
				${gl => {
					gl.clearColor(0.0, 0.0, 0.0, 1.0);
					gl.clear(gl.COLOR_BUFFER_BIT);
					gl.clear(gl.DEPTH_BUFFER_BIT);
					gl.enable(gl.DEPTH_TEST);
					gl.depthFunc(gl.LESS);
				}}
			`,
				[shader, null],
				stew`${() => 16}`,
			],
			['div', { className: 'ui' },
				[palette, null],
				['button', {
					type: 'button',
					className: 'fullscreen-button',
					onclick: () => handleFullscreen(ref[0][0]),
				}]
			],
		],
	];
}

export default [carve, {
	'': 'Carve',
}, ['style', null, `
	canvas {
		image-rendering: pixelated;
	}
	.ui {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		aspect-ratio: 16 / 7;
		overflow: hidden;
	}
	.fullscreen-button {
		width: 18px;
		height: 18px;
		border: none;
		background: no-repeat url(/index.png);
		background-size: auto 20.4px;
        background-position: calc((11 * 16px + 1px) * -1.2) -1.6px;
	}
	.brush {
		position: absolute;
		top: 50%;
		left: 16px;
		transform: translateY(-50%);
	}
	.grid-wrapper {
		position: relative;
		width: 80px;
		height: 80px;

		+ .grid-wrapper {
			margin-top: 16px;

			&.active .grid {
				top: 0%;
			}
			+ .grid-wrapper {
				&.active .grid {
					top: -120%;
				}
			}
		}
		&.active {
			.grid {
				left: 225%;
				top: 120%;
				transform: scale(3);
				transition: left 200ms, top 200ms 100ms, transform 200ms 100ms;

				.cell.active {
					transform: scale(1.2);
				}
			}
			.close {
				opacity: 1;
				z-index: 1;
				transition: opacity 200ms;
			}
		}
	}
	.grid {
		position: relative;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		transition: left 200ms 100ms, top 200ms, transform 200ms;
	}
	.close {
		position: absolute;
		left: 25%;
		top: 25%;
		width: 50%;
		height: 50%;
		border: none;
		opacity: 0;
		z-index: -1;
		transition: opacity 200ms 100ms;
	}
	.cell {
		float: right;
		border: none;
		padding: 1px;
		width: 25%;
		height: 25%;
		background-clip: content-box;
		transition: transform 200ms;

		&:nth-child(4n + 1) {
			clear: right;
		}
		&.active {
			position: relative;
			transform: scale(1.5);
			box-shadow: 0 0 0px 1px black;
			background-color: rgb(119, 119, 119);
			z-index: 1;
		}
	}
`]];
