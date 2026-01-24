import { multiply, createMatrix } from '/game/matrix.mjs';
import { loadSkeleton } from '/game/model.mjs';

export const state = stew({
	red: 119,
	green: 119,
	blue: 119,
	expandedColor: '',
	brushColor: [1, 1, 1],
	backgroundColor: [0, 0, 0],
	contrastColor: [0, 0, 0],
	mode: 'view',
});

export function handleFullscreen (element) {
	if (document.fullscreenElement) {
		document.exitFullscreen();
	} else {
		element.requestFullscreen();
	}
}

export function setMode () {
	const { mode, tilt, rotation } = state;
	const cos = Math.cos(rotation);
	const sin = Math.sin(rotation);
	const threshold = mode === 'view' ? 0.9569403357322088 : 0.881921264348355;
	let newMode = 'view';
	let modifier = '-side';

	if (Math.abs(sin) > threshold) {
		newMode = `sculpt-${sin < 0 ? 'front' : 'back'}`;
	} else if (Math.abs(cos) > threshold) {
		newMode = `paint-${cos < 0 ? 'back' : 'front'}`;
	}

	if (tilt > Math.PI / 4) {
		modifier = '-bottom';
	} else if (tilt < -Math.PI / 4) {
		modifier = '-top';
	}

	if (newMode.startsWith('sculpt-')) {
		newMode += modifier;
	} else if (modifier !== '-side') {
		newMode = 'view';
	}

	if (newMode !== mode) {
		state.mode = newMode;
		return newMode;
	}
}

export function initializeControls (element, camera) {
	const tapThreshold = 400;
	let scale = 1;
	let movement = 0;
	let downTimestamp;

	function resize () {
		scale = element.clientWidth / element.querySelector('canvas').width;
	}

	window.addEventListener('resize', resize);
	resize();

	element.onmousedown = ({ offsetX }) => {
		const { clientWidth } = element;
		downTimestamp = Date.now();
		movement = 0;
		state.mouseSide = offsetX < clientWidth / 2 ? 'left' : 'right';
	};

	element.onmouseup = () => {
		const { mode, mouseSide } = state;
		const downDuration = Date.now() - downTimestamp;
		state.mouseSide = '';

		if (!(downDuration < tapThreshold) || movement > 3) {
			return;
		}
		
		if (mode.startsWith('paint-')) {
			if (mouseSide === 'left') {
				console.log('erase color');
			} else if (mouseSide === 'right') {
				console.log('set color');
			}
		} else if (mode.startsWith('sculpt-')) {
			if (mouseSide === 'left') {
				console.log(`decrease ${mode.split('-')[1]} depth`);
			} else if (mouseSide === 'right') {
				console.log(`increase ${mode.split('-')[1]} depth`);
			}
		}
	};

	element.onmousemove = ({ movementX, movementY }) => {
		const { mode, mouseSide } = state;
		movement += Math.max(Math.abs(movementX), Math.abs(movementY));

		if (mouseSide === 'right') {
			state.rotation -= movementX * 0.01;
			state.tilt = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, state.tilt - movementY * 0.01));
			const newMode = setMode();
			
			// if (newMode) {
			// 	console.log(newMode);
			// }
		} else if (mouseSide === 'left') {
			if (mode === 'view') {
				camera.center[0] += movementX * 0.1;
				camera.other.zoom = Math.max(2, Math.min(16, camera.other.zoom + movementY * -0.1));
			} else if (/-(top|bottom)$/.test(mode)) {
				state.x += movementY * (mode.endsWith('-bottom') ? 0.1 : -0.1);
				state.z += movementX * -0.1;
			} else {
				state.y += movementY * -0.1;
			
				if (mode.startsWith('paint-')) {
					state.x += movementX * (mode.endsWith('-front') ? 0.1 : -0.1);
				} else if (mode.startsWith('sculpt')) {
					state.z += movementX * (mode.endsWith('-right') ? 0.1 : -0.1);
				}
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

export function shader ({ projection, matrix, position, offset, center, other }, callback, ...instances) {
	return stew`
		mat3 uProjection ${projection}
		mat3 uMatrix ${matrix}
		vec3 uPosition ${position}
		vec3 uOffset ${offset}
		vec3 uCenter ${center}
		float uZoom ${other} zoom
		gl_PointSize = uZoom * 2.0;
		gl_Position = vec4(uProjection * floor((uMatrix * (vec3(aVertex) + uOffset + uPosition) + uCenter) * gl_PointSize), 1.0);
		float intensity = alpha < 1.0 ? 1.0 : 0.5 + dot(normalize(vec3(0.0, 0.0, -1.0)), normalize(vec3(aNormal))) * 0.5;
		*vec4 vColor = vec4(vec3(aColor) / 255.0 * intensity, alpha);
		${gl => {
			const { backgroundColor } = state;
			gl.clearColor(...backgroundColor, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.clear(gl.DEPTH_BUFFER_BIT);
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LESS);
		}}
		${instances.map(({ vertexes, normals, colors }, i) => stew`
			UNSIGNED_BYTE uvec3 aVertex ${vertexes}
			BYTE ivec3 aNormal ${normals}
			UNSIGNED_BYTE uvec3 aColor ${colors}
			float alpha ${callback ? i / 255 : 1}
			${gl => {
				gl.drawArrays(gl.POINTS, 0, vertexes.length / 3);
				gl.clear(gl.DEPTH_BUFFER_BIT);
			}}
		`)}
		gl_FragColor = vColor;
	`;
}

export function carve () {
	const [projection, matrix, position, center, other, ...cursorInstances] = stew(() => {
		updateColor();

		return [
			[1 / 640, 0, 0, 0, 1 / 360, 0, 0, 0, 1 / 1280],
			[1, 0, 0, 0, 1, 0, 0, 0, 1],
			[0, 0, 0],
			[0, 0, 0],
			{ zoom: 8 },
			{
				vertexes: new Int8Array([
					-4, -2, -3, -2, -2, -2, -2, -3, -2, -4,
					-4, 2, -3, 2, -2, 2, -2, 3, -2, 4,
					4, -2, 3, -2, 2, -2, 2, -3, 2, -4,
					4, 2, 3, 2, 2, 2, 2, 3, 2, 4,
				]),
			},
			// {
			// 	vertexes: new Int8Array([0, 0]),
			// },
			{
				vertexes: new Int8Array([
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
			loadSkeleton('/reference.png', 1, 1, 5),
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
	const { vertexes, normals, colors, offset, map } = stew(() => {
		const sprite = scene.reference[0][0];
		return sprite;
	}, []);

	stew(null, [], () => initializeControls(ref[0][0], camera));
	const { brushColor, backgroundColor, contrastColor } = state;
	const sceneColors = [backgroundColor, brushColor, contrastColor];
	let ref;

	// move both to zoom
	// - this also sets the cursor level to match zoom level, so it should be as accessible as moving cursor
	// - remove the camera offset for now

	// paint with right tap
	// - pairs better with moving curser in opposite hand

	// carve with left tap
	// - pairs better with moving camera in opposite hand to test different angles
	// - can still tap

	const model = { vertexes, normals, colors };
	const cursor = { vertexes: new Uint8Array(3), normals: new Int8Array(3), colors: new Uint8Array([255, 0, 255]) };
	const camera = { projection, matrix, position, offset, center, other, pixels: new Uint8Array(4 * 4 * 4), params: [model, cursor] };

	stew(() => {
		Object.assign(state, { cameraZoom: other.zoom, x: 0, y: 0, z: 0, rotation: 0, tilt: 0, mouseSide: '', paused: false });
	}, []);

	// tap center to recenter camera
	// move palette to its own button
	return ref = ['', null,
		['div', null,
			['canvas', { width: 1280, height: 720 },
				stew`
					${() => {
						const { x, y, z, tilt, rotation } = state;
						matrix.splice(0, 9, ...createMatrix(tilt, rotation, 0));
						position.splice(0, 3, x, y, z);
						return 16;
					}}
				`,
				shader(camera, null, model, cursor),
				stew`
					${gl => {
						gl.clear(gl.DEPTH_BUFFER_BIT);
						gl.disable(gl.DEPTH_TEST);
					}}
					${cursorInstances.map(({ vertexes }, i) => stew`
						BYTE ivec2 aPoint ${vertexes}
						mat3 uProjection ${projection}
						vec3 uCenter ${center}
						float uZoom ${other} zoom
						float uBorder ${i ? 0 : 1}
						vec3 position = vec3(aPoint, 0);
						gl_PointSize = uZoom * 2.0;
						gl_Position = vec4(uProjection * floor((position + uCenter) * gl_PointSize), 1.0);
						gl_PointSize += uBorder * 2.0;
						${gl => gl.drawArrays(gl.POINTS, 0, vertexes.length >> 1)}
						vec3 uBrushColor ${i ? [1, 1, 1] : [0, 0, 0]}
						gl_FragColor = vec4(uBrushColor, 1.0);
					`)}
				`,
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
