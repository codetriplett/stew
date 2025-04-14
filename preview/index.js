(function () {
let stew;

if (typeof window === 'object') {
	stew = window.stew;
	window.App = App;
} else if (typeof module === 'object') {
	stew = require('./stew.min.js');
	module.exports = App;
}

// BEGIN: content generation functions to simulate data from server
const shapes = ['Circle', 'Square', 'Triangle'];
const actions = ['Spinning', 'Bouncing', 'Pulsing'];
const colors = ['Jade', 'Amber', 'Teal'];
const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit'];

function random (range) {
	const random = Math.random();

	if (Array.isArray(range)) {
		return range[Math.floor(random * range.length)];
	} else if (typeof range === 'number') {
		return Math.floor(random * range);
	}

	return random;
}

function generateVideo () {
	const shape = random(shapes);
	const action = random(shape === 'Circle' ? actions.slice(1) : actions);
	const color = random(colors);
	let title = `${action} ${color} ${shape}`;
	let ft;

	if (random() < 0.333333) {
		const shape = random(shapes);
		const action = random(shape === 'Circle' ? actions.slice(1) : actions);
		const color = random(colors);
		title += ` ft. ${color} ${shape}`;

		ft = {
			action: action.toLowerCase(),
			color: color.toLowerCase(),
			shape: shape.toLowerCase(),
		};
	}
	
	return {
		id: random(100000000),
		title,
		action: action.toLowerCase(),
		color: color.toLowerCase(),
		shape: shape.toLowerCase(),
		ft,
		length: (random(5) + 1) * 5000,
		owner: `${random(colors)} ${random(shapes)}`,
	};
}

function generateComments () {
	return Array(random(100)).fill(null).map(() => ({
		user: `${random(colors)} ${random(shapes)}`,
		message: Array(random(49) + 1).fill(null).map(() => random(words)).join(' '),
	}));
}

function generateRecommendations () {
	return Array(5).fill(null).map(generateVideo);
}
// END: content generation functions to simulate data from server

const { createState, useMemo, useEffect } = stew;

function loadRecommendation (index, globalState) {
	const { recommendations } = globalState;
	globalState.video = recommendations[index];
	globalState.comments = generateComments();
	globalState.recommendations = [...recommendations.slice(0, index), ...recommendations.slice(index + 1), generateVideo()];
}

// TODO: rewrite video player to use basic 2d shapes, then switch to 3d
// - this will test both webgl and hot swap features
function AdvancedVideoPlayer ({}) {
	return ({ globalState }) => {
		const { video } = globalState;
		const { id, length, action, color, shape, ft } = video;

		// makes it easier to detect memo change inline wihtout waiting for useEffect
		// - no longer need to store both value and prevValue, prev values are stored similar to how useEffect deps does
		// - object dep values will be set to memo after impulse finishes processing, so all the checks will trigger, regardless of order
		// - callback returns object to merge to memo to avoid having to Object assign them
		// - onUpdate returns memo instead of having to read from '' prop (less weird this way)

		const state = useMemo(() => createState({
			playState: 'paused',
			currentTime: 0,
			playTimestamp: undefined,
			completed: false,
			hoverActive: false,
		}), [id]);

		const primary = useMemo(() => prepareObject(video), [action, color, shape]);
		const secondary = useMemo(() => ft && prepareObject(ft), [ft]);
		const { playState, currentTime, playTimestamp, hoverActive, completed } = state;

		useEffect(() => {
			console.log('===== set video', playState);
			if (playState !== 'running') return;

			const timeout = setTimeout(() => {
				state.playState = 'paused';
				state.currentTime = length;
				state.completed = true;
			}, length - currentTime);

			return () => clearTimeout(timeout);
		}, [playState]);

		return ['canvas', {
			width: 960,
			height: 540,
			style: { width: '100%' },
			onmouseenter: () => state.hoverActive = true,
			onmouseleave: () => state.hoverActive = false,
		},
			stew`
				${gl => {
					gl.clearColor(0.0, 0.0, 0.0, 1.0);
					gl.clear(gl.COLOR_BUFFER_BIT);
				}}
				vec3 vertex = uMatrix * aVertex + uPosition
				gl_Position = vec4(vertex.x * 0.5625, vertex.y, vertex.z, 1.0)
				${[primary].map(({ indexes, vertexes, color, matrix, position, x, y, z, spin }) => stew`
					${(gl, duration) => {
						const spinMatrix = applyPhysics(spin, duration, spin => {
							const cos = Math.cos(spin);
							const sin = Math.sin(spin);
							return [cos, 0, sin, 0, 1, 0, -sin, 0, cos];
						});
						
						const xValue = applyPhysics(x, duration);
						const yValue = applyPhysics(y, duration);
						const zValue = applyPhysics(z, duration);

						matrix.splice(0, 9, ...spinMatrix);
						position.splice(0, 3, xValue, yValue, zValue);
					}}
					elements ${indexes}
					FLOAT vec3 aVertex ${vertexes}
					mat3 uMatrix ${matrix}
					vec3 uPosition ${position}
					${gl => gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0)} shape
					vec3 uColor ${color}
				`)}
				gl_FragColor = vec4(uColor, 1.0)
				${() => 16}
			`,
			// the final followup function value gives the delay before the next render
			// leaving it out, or returning something not > 0 will result in a single frame only
		];
	};
}

const colorMap = {
	jade: [0, 0.625, 0.375],
	amber: [1, 0.75, 0],
	teal: [0, 0.5, 0.5],
};

function prepareObject ({ action, color, shape }) {
	const object = {
		color: colorMap[color],
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
		position: [0, 0, 0],
		x: [0, 0, 0],
		y: [0, 0, 0],
		z: [0, 0, 0],
		scale: [1, 0, 0, 1, 0, 0, 1],
		spin: [0, 0, 0, 1, 0, 0, 1],
	};

	const area = 1;

	switch (shape) {
		case 'square': {
			const length = Math.sqrt(area) / 2;

			Object.assign(object, {
				indexes: new Uint16Array([0, 1, 2, 2, 3, 0]),
				vertexes: new Float32Array([
					-length, -length, 0,
					-length, length, 0,
					length, length, 0,
					length, -length, 0,
				]),
			});

			break;
		}
		case 'triangle': {
			const factor = Math.sqrt(area / 0.4330127018922194);

			Object.assign(object, {
				indexes: new Uint16Array([0, 1, 2]),
				vertexes: new Float32Array([
					-0.5 * factor, -0.28867513459481287 * factor, 0,
					0, 0.5773502691896257 * factor, 0,
					0.5 * factor, -0.28867513459481287 * factor, 0,
				]),
			});

			break;
		}
		case 'circle': {
			const radius = Math.sqrt(area / Math.PI);
			const count = 24;
			const indexes = [];
			const vertexes = [0, 0, 0, radius, 0, 0];

			for (let i = 1; i < count; i++) {
				const angle = i * Math.PI * 2 / count;
				vertexes.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
				indexes.push(0, i + 1, i);
			}

			indexes.push(0, 1, vertexes.length / 3 - 1);

			Object.assign(object, {
				indexes: new Uint16Array(indexes),
				vertexes: new Float32Array(vertexes),
			});

			break;
		}
	}

	switch (action) {
		case 'bouncing':
		case 'pulsing':
		case 'spinning': {
			object.spin[1] = 0.001;
			break;
		}
	}

	return object;
}

function applyPhysics (array, duration, callback) {
	array[1] += array[2] * duration;
	array[0] += array[1] * duration;

	if (!callback) {
		return array[0];
	}

	const matrix = callback(array[0]);
	array.splice(3, matrix.length, ...matrix);
	return matrix;
}

// TODO: figure out why reconciliation fails during hot swap
// - might have to do with how impulse and proxy shifted places in the ref
function VideoPlayer ({ isRecommendation }) {
	return ({ globalState }) => {
		const { video } = globalState;
		const { id, length, action, color, shape, ft } = video;

		// makes it easier to detect memo change inline wihtout waiting for useEffect
		// - no longer need to store both value and prevValue, prev values are stored similar to how useEffect deps does
		// - object dep values will be set to memo after impulse finishes processing, so all the checks will trigger, regardless of order
		// - callback returns object to merge to memo to avoid having to Object assign them
		// - onUpdate returns memo instead of having to read from '' prop (less weird this way)

		const state = useMemo(() => createState({
			playState: 'paused',
			currentTime: 0,
			playTimestamp: undefined,
			completed: false,
			hoverActive: false,
		}), [id]);

		const primary = useMemo(() => prepareObject(video), [action, color, shape]);
		const secondary = useMemo(() => ft && prepareObject(ft), [ft]);
		const { playState, currentTime, playTimestamp, hoverActive, completed } = state;

		useEffect(() => {
			console.log('===== set video', playState);
			if (playState !== 'running') return;

			const timeout = setTimeout(() => {
				state.playState = 'paused';
				state.currentTime = length;
				state.completed = true;
			}, length - currentTime);

			return () => clearTimeout(timeout);
		}, [playState]);

		return ['canvas', {
			width: 960,
			height: 540,
			style: { width: '100%' },
			onmouseenter: () => state.hoverActive = true,
			onmouseleave: () => state.hoverActive = false,
		},
			stew`
				${gl => {
					gl.clearColor(0.0, 0.0, 0.0, 1.0);
					gl.clear(gl.COLOR_BUFFER_BIT);
				}}
				vec3 vertex = uMatrix * aVertex + uPosition
				gl_Position = vec4(vertex.x * 0.5625, vertex.y, 1.0, 1.0)
				${[primary].map(({ indexes, vertexes, color, matrix, position, x, y, spin }) => stew`
					${(gl, duration) => {
						const spinMatrix = applyPhysics(spin, duration, spin => {
							const cos = Math.cos(spin);
							const sin = Math.sin(spin);
							return [cos, -sin, 0, sin, cos, 0, 0, 0, 1];
						});

						const xValue = applyPhysics(x, duration);
						const yValue = applyPhysics(y, duration);

						matrix.splice(0, 9, ...spinMatrix);
						position.splice(0, 2, xValue, yValue);
					}}
					elements ${indexes}
					FLOAT vec3 aVertex ${vertexes}
					mat3 uMatrix ${matrix}
					vec3 uPosition ${position}
					${gl => gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0)} shape
					vec3 uColor ${color}
				`)}
				gl_FragColor = vec4(uColor, 1.0)
				${() => !isRecommendation && 16}
			`,
			// the final followup function value gives the delay before the next render
			// leaving it out, or returning something not > 0 will result in a single frame only
		];
	};
}

function VideoPlayerSection () {
	return ({ globalState }) => {
		const { video } = globalState;
		const { title, owner } = video;

		const { text } = useMemo(() => {
			return new Promise(resolve => {
				setTimeout(() => resolve({ text: `loaded ${Math.random().toFixed(8).slice(2)}` }), 1000);
			});
		}, [], { text: 'loading...' });

		return ['', null,
			[VideoPlayer],
			text && ['p', null, text],
			['h1', { className: 'video-title' }, title],
			['strong', { className: 'video-owner' }, owner],
		];
	};
}

function renderComment ({ user, message, owner, ref, isRich }) {
	return ['div', {
		ref,
		className: 'comment',
		tabIndex: '-1',
	},
		['strong', { className: `comment-user ${user === owner ? 'comment-user-owner' : ''}` }, user],
		['p', { className: 'comment-message' }, message],
		isRich && ['button', { type: 'button' }, 'Like'],
	];
}

function Comments ({ isRich }) {
	return ({ globalState }) => {
		const { video, comments } = globalState;
		const { id, owner } = video;
		const { length } = comments;

		if (!length) {
			return;
		}

		const state = useMemo(() => createState({
			expandedCount: 10,
		}), [id]);

		const { expandedCount } = state;
		const ref = [];

		useEffect(() => {
			console.log('===== set focus on', ref[0]);
			if (ref.length) ref[0].focus();
		}, [expandedCount]);

		return ['', null,
			...comments.slice(0, expandedCount).map((props, i) => {
				return renderComment({ ...props, owner, ref: i && i === expandedCount - 10 && ref, isRich });
			}),
			length > expandedCount && ['button', {
				'': 'expand-button',
				type: 'button',
				onclick: () => state.expandedCount += 10,
			}, 'Show More'],
		];
	};
}

function Recommendations () {
	return ({ globalState }) => {
		const { recommendations } = globalState;

		return ['', null,
			// [VideoPlayer, { isRecommendation: true }],
			...recommendations.map(({ title, color, shape, ft, length, owner }, i) => ['div', {
				className: 'recommendation',
				onclick: () => loadRecommendation(i, globalState),
			},
				['div', {
					className: [
						'video-player',
						`video-${color}`,
						`video-${shape}`,
						!ft ? '' : [
							'video-ft',
							`video-ft-${ft.color}`,
							`video-ft-${ft.shape}`,
						].join(' '),
					].join(' '),
				},
					['span', { className: 'primary' }],
					['span', { className: 'secondary' }],
				],
				['strong', { className: 'title' }, title]
			]),
		];
	};
}

function App (initialProps) {
	const globalState = createState(initialProps);

	return ({ swap }) => ['', { globalState },
		['div', { className: 'header' },
			['strong', { className: 'logo' }, 'StewTube'],
			['button', { type: 'button', onclick: swap }, 'Update'],
		],
		['div', { className: 'container' },
			['div', { className: 'row' },
				['div', { className: 'col col-8' },
					[VideoPlayerSection],
					[Comments],
				],
				['div', { className: 'col col-4' },
					[Recommendations],
				],
			],
			// { name: 'component' },
		],
	];
}

App.generateInitialState = () => {
	return {
		video: generateVideo(),
		comments: generateComments(), 
		recommendations: generateRecommendations(),
	};
};

App.component = (container) => {
	const state = createState({ expanded: false })

	stew(container, () => ['', null,
		['button', {
			type: 'button',
			onclick: () => state.expanded = !state.expanded,
		}, state.expanded ? 'Collapse' : 'Expand'],
		state.expanded && ['p', null, 'Hello World'],
	]);
};

App.VideoPlayer = VideoPlayer;
App.AdvancedVideoPlayer = AdvancedVideoPlayer;
})();
