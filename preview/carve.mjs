import createMatrix from '/game/matrix.mjs';
import { loadSprites } from '/game/model.mjs';
import { shader } from '/game/shader.mjs';

export const state = stew({
	red: 119,
	green: 119,
	blue: 119,
	expandedColor: '',
	brushColor: [1, 1, 1],
	backgroundColor: [0, 0, 0],
	contrastColor: [0, 0, 0],
});

export function handleFullscreen (element) {
	if (document.fullscreenElement) {
		document.exitFullscreen();
	} else {
		element.requestFullscreen();
	}
}

export function initializeControls (element, camera) {
	Object.assign(state, { cursorX: 0, cursorY: 0, cameraX: 0, cameraY: 0, rotation: 0, tilt: 0, mouseSide: '' });
	const tapThreshold = 400;
	let scale = 1;
	let movement = 0;
	let downTimestamp;

	function resize () {
		scale = element.clientWidth / element.querySelector('canvas').width;
	}

	window.addEventListener('resize', resize);
	resize();

	element.onmousedown = ({ offsetX, offsetY }) => {
		const { clientWidth, clientHeight } = element;
		const { zoom, position } = camera;
		const centerX = clientWidth / 2 + position[0] * zoom * scale * 2;
		const centerY = clientHeight / 2 - position[1] * zoom * scale * 2;
		downTimestamp = Date.now();
		movement = 0;

		if (offsetX > centerX - 50 && offsetX < centerX + 50 && offsetY > centerY - 50 && offsetY < centerY + 50) {
			state.mouseSide = 'center';
		} else {
			state.mouseSide = `${offsetY < centerY ? 'top' : 'bottom'} ${offsetX < centerX ? 'left' : 'right'}`;
		}
		// TODO: include top, bottom, left, and right
		// - taps will move cursor one pixel in those directions
		// - have move for top and bottom set zoome level (locked to integers between 1 and 16)
	};

	element.onmouseup = () => {
		const { mouseSide } = state;
		const downDuration = Date.now() - downTimestamp;
		state.mouseSide = '';

		if (!(downDuration < tapThreshold) || movement > 3) {
			return;
		}

		// TODO: have first tap on either size change between paint and model mode
		// - model mode paints it plain white with straight on lighting
		// - paint mode shows colors and filler, with adjustable scene lighting
		switch (mouseSide) {
			case 'center': {
				console.log('center');
				break;
			}
			case 'top left': {
				console.log('top left');
				break;
			}
			case 'bottom left': {
				console.log('bottom left');
				break;
			}
			case 'top right': {
				console.log('top right');
				break;
			}
			case 'bottom right': {
				console.log('bottom right');
				break;
			}
		}
	};

	element.onmousemove = ({ movementX, movementY }) => {
		const { mouseSide } = state;
		movement += Math.max(Math.abs(movementX), Math.abs(movementY));

		switch (mouseSide) {
			case 'center': {
				state.cameraX -= movementX * 0.1;
				state.cameraY += movementY * 0.1;
				break;
			}
			case 'top left':
			case 'bottom left': {
				state.cursorX -= movementX * 0.1;
				state.cursorY += movementY * 0.1;
				break;
			}
			case 'top right':
			case 'bottom right': {
				state.rotation -= movementX * 0.01;
				let tilt = state.tilt - movementY * 0.01;

				if (tilt > Math.PI / 2) {
					tilt = Math.PI / 2;
				} else if (tilt < -Math.PI / 2) {
					tilt = -Math.PI / 2;
				}

				state.tilt = tilt;
				break;
			}
		}
	};

	return () => {
		window.removeEventListener('resize', resize);
		element.onmousedown = null;
		element.onmousemove = null;
		element.onmouseup = null;
	};
}

export function updateColor () {
	const { red, green, blue } = state;
	const brushColor = [red, green, blue].map(value => value / 255);
	const isDark = Math.min(red, green, blue) >= 170 || Math.max(red, green, blue) >= 102 && document.body.classList.contains('dark-theme');
	const backgroundColor = isDark ? [2 / 15, 2 / 15, 2 / 15] : [1, 1, 1];
	const contrastColor = isDark ? [1, 1, 1] : [2 / 15, 2 / 15, 2 / 15];
	Object.assign(state, { brushColor, backgroundColor, contrastColor });
	document.documentElement.style.setProperty('--background-color', `rgb(${backgroundColor.map(value => value * 255).join(', ')})`);
	return [brushColor, backgroundColor, contrastColor];
}

export function palette () {
	const { red, green, blue, expandedColor, backgroundColor } = state;
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
							updateColor();
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

// only buttons on screen should be...
// - top left: import/export menu
// - top right: fullscreen toggle
// - bottom left: info (to explain UI)
// - bottom right: scene menu (lighting, zoom, etc)

export function carve () {
	const [camera, ...instances] = stew(() => {
		const scale = [1 / 640, 0, 0, 0, 1 / 360, 0, 0, 0, 1 / 360];
		const matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
		const camera = { scale, zoom: 8, matrix, position: [0, 0, 0], angles: [0, 0, 0] };
		updateColor();

		return [
			camera,
			{
				points: new Int8Array([
					0, 0,
					-4, -2, -3, -2, -2, -2, -2, -3, -2, -4,
					-4, 2, -3, 2, -2, 2, -2, 3, -2, 4,
					4, -2, 3, -2, 2, -2, 2, -3, 2, -4,
					4, 2, 3, 2, 2, 2, 2, 3, 2, 4,
				]),
			},
			{
				points: new Int8Array([0, 0]),
			},
			{
				points: new Int8Array([
					-4, -2, -3, -2, -2, -2, -2, -3, -2, -4,
					-4, 2, -3, 2, -2, 2, -2, 3, -2, 4,
					4, -2, 3, -2, 2, -2, 2, -3, 2, -4,
					4, 2, 3, 2, 2, 2, 2, 3, 2, 4,
				]),
			},
		];
	}, []);

	const scene = stew(async () => {
		const [reference] = await Promise.all([
			loadSprites('/reference.png', 1, 1, 5, true),
		]);

		// TODO: calculate filler and store in separate points array
		// - render filler instances as separate object, and update the values only if exiting editing mode into viewing mode
		
		// TODO: use helper to calcualte and update normal at a set position
		// - this will be called whenever a pixel depth is changed, and will affect all points +/- 2 pixels away from that point

		const sprite = reference[0][0];
		sprite.offset = sprite.offset.map(value => -Math.round(-value));
		return { reference };
	}, [], null);

	if (!scene) {
		return;
	}

	// change this whenever new model is loaded
	const [model, white] = stew(() => {
		const sprite = scene.reference[0][0];
		
		const group = {
			// matrix: [20, 0, 0, 0, 20, 0, 0, 0, 20],
			light: { shine: [0.75, 0.5, 0.25, 1] }
		};

		const model = { sprite, group, position: [0, 0, 0], matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
		const white = new Uint8Array(sprite.front.colors.length).fill(255);
		return [model, white];
	}, []);

	stew(null, [], () => initializeControls(ref[0][0], camera));
	const { brushColor, backgroundColor, contrastColor } = state;
	const colors = [backgroundColor, brushColor, contrastColor];
	let ref;

	return ref = ['', { camera },
		['div', null,
			['canvas', { width: 1280, height: 720 }, stew`
				${gl => {
					const { cursorX, cursorY, cameraX, cameraY, rotation = 0, tilt = 0 } = state;
					const { sprite, position } = model;
					const { offset, front, back } = sprite;
					const isBack = Math.abs(rotation) % (Math.PI * 2) > (Math.PI / 2);
					const face = isBack ? back : front;
					const { matrix } = camera;
					const x = Math.round(cursorX);
					const y = Math.round(cursorY);
					const z = face.pixels[y - offset[1]]?.[(x - offset[0]) << 2];
					position.splice(0, 2, -x, -y);
					matrix.splice(0, 9, ...createMatrix(tilt, rotation, 0));
					camera.position.splice(0, 2, -Math.round(cameraX), -Math.round(cameraY));

					if (z) {
						position[2] = -z;
					}

					const { backgroundColor } = state;
					gl.clearColor(...backgroundColor, 1);
					gl.clear(gl.COLOR_BUFFER_BIT);
					gl.clear(gl.DEPTH_BUFFER_BIT);
					gl.enable(gl.DEPTH_TEST);
					gl.depthFunc(gl.LESS);
				}}
			`,
				[shader, null, model],
				stew`
					${gl => {
						gl.clear(gl.DEPTH_BUFFER_BIT);
						gl.disable(gl.DEPTH_TEST);
					}}
					${instances.map(({ points }, i) => stew`
						BYTE ivec2 aPoint ${points}
						mat3 uCameraScale ${camera.scale}
						vec3 uCameraPosition ${camera.position}
						float uCameraZoom ${camera.zoom}
						float uPointSize ${camera.zoom * 2 + (i ? 0 : 2)}
						vec3 position = vec3(aPoint, 0.0) + uCameraPosition;
						gl_Position = vec4(uCameraScale * floor(uCameraZoom * position * 2.0), 1.0);
						gl_PointSize = uPointSize;
						${gl => gl.drawArrays(gl.POINTS, 0, points.length >> 1)}
						vec3 uBrushColor ${colors[i]}
						gl_FragColor = vec4(uBrushColor, 1.0);
					`)}
				`,
				stew`${() => 16}`,
			],
			['div', { className: 'ui' },
				[palette, null],
				['div', { className: 'tools' },
					['button', {
						type: 'button',
						className: 'tool fullscreen-button',
						onclick: () => handleFullscreen(ref[0][0]),
					}],
					['button', {
						type: 'button',
						className: 'tool fullscreen-button',
						onclick: () => handleFullscreen(ref[0][0]),
					}],
					['button', {
						type: 'button',
						className: 'tool fullscreen-button',
						onclick: () => handleFullscreen(ref[0][0]),
					}],
				],
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
		aspect-ratio: 16 /9;
		overflow: hidden;
	}
	.brush,
	.tools {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
	}
	.brush {
		left: 16px;
	}
	.tools {
		right: 16px;
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
				left: 275%;
				top: 120%;
				transform: scale(4);
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
		padding: 0;
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
			box-shadow: 0 0 0px 1px var(--background-color, black);
			background-color: rgb(119, 119, 119);
			z-index: 1;
		}
	}
	.tool {
		display: block;
		width: 80px;
		height: 80px;
		padding: 0;
		border: 1px solid var(--button-border-color);
		border-radius: 12.5%;
		background: var(--button-background);

		+ .tool {
			margin-top: 16px;
		}
	}
	.fullscreen-button:after {
		content: '';
		display: block;
		width: 54px;
		height: 54px;
		border: none;
		margin-left: 12px;
		background: no-repeat url(/index.png);
		background-size: auto 61.2px;
        background-position: calc((11 * 16px + 1px) * -3.6) -4.8px;
		image-rendering: pixelated;
	}
`]];
