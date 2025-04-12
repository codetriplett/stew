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

const { createState, useMemo, onRender } = stew;

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
		const { id, title, action, color, shape, ft, length, owner } = video;
		const iterationCount = length / 5000;
		let { prevId, state, gl } = memo;
		
		if (id !== prevId) {
			memo.prevId = id;

			memo.state = state = createState({
				playState: 'paused',
				currentTime: 0,
				playTimestamp: undefined,
				completed: false,
				hoverActive: false,
			});
		}

		onRender(() => {
			const [canvas] = ref;
			// setup

			return () => {};
			// teardown
		}, []);

		return ['', { gl },
			['canvas', { ref },
				({ gl }) => {
					// render
				},
			],
		];



		// have stew set up webgl if there are children
		// - allow onbeforedraw and onafterdraw events
		return ['canvas', { context: 'webgl' },
			gl => {
				// render
			}
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
		position: [0, 0],
		matrix: [1, 0, 0, 1],
		x: [0, 0, 0],
		y: [0, 0, 0],
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
					-length, -length,
					-length, length,
					length, length,
					length, -length,
				]),
			});

			break;
		}
		case 'triangle': {
			const factor = Math.sqrt(area / 0.4330127018922194);

			Object.assign(object, {
				indexes: new Uint16Array([0, 1, 2]),
				vertexes: new Float32Array([
					-0.5 * factor, -0.28867513459481287 * factor,
					0, 0.5773502691896257 * factor,
					0.5 * factor, -0.28867513459481287 * factor
				]),
			});

			break;
		}
		case 'circle': {
			const radius = Math.sqrt(area / Math.PI);
			const count = 24;
			const indexes = [];
			const vertexes = [0, 0, radius, 0];

			for (let i = 1; i < count; i++) {
				const angle = i * Math.PI * 2 / count;
				vertexes.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
				indexes.push(0, i + 1, i);
			}

			indexes.push(0, 1, (vertexes.length >> 1) - 1);

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

	if (callback) {
		const matrix = callback(array[0]);
		array.splice(3, matrix.length, ...matrix);
		return matrix;
	}
}

function VideoPlayer () {
	return ({ globalState }) => {
		const { video } = globalState;
		const { id, title, length, owner, action, color, shape, ft } = video;

		// makes it easier to detect memo change inline wihtout waiting for onRender
		// - no longer need to store both value and prevValue, prev values are stored similar to how onRender deps does
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

		onRender(() => {
			console.log('===== set video', playState);
			if (playState !== 'running') return;

			const timeout = setTimeout(() => {
				state.playState = 'paused';
				state.currentTime = length;
				state.completed = true;
			}, length - currentTime);

			return () => clearTimeout(timeout);
		}, [playState]);

		return ['', null,
			['canvas', {
				width: 960,
				height: 540,
				style: { width: '100%' },
				onmouseenter: () => state.hoverActive = true,
				onmouseleave: () => state.hoverActive = false,
			},
				// TODO: figure out how to pause canvas
				// - should ideally be a property of canvas (processed before program animation loop)
				stew`
					${gl => {
						gl.clearColor(0.0, 0.0, 0.0, 1.0);
						gl.clear(gl.COLOR_BUFFER_BIT);
						return 0;
						// return min delay to start animation loop
					}}
					vec2 vertex = uMatrix * aVertex
					gl_Position = vec4(vertex.x * 0.5625, vertex.y, 1.0, 1.0)
					${[primary].map(({ indexes, vertexes, color, matrix, spin }) => stew`
						${(gl, duration) => {
							// TODO: need to support setup function so values are updated before they are set
							// - 

							const spinMatrix = applyPhysics(spin, duration, spin => {
								const cos = Math.cos(spin);
								const sin = Math.sin(spin);
								return [cos, -sin, sin, cos];
							});

							matrix.splice(0, 4, ...spinMatrix);
						}}
						elements ${indexes}
						FLOAT vec2 aVertex ${vertexes}
						mat2 uMatrix ${matrix}
						${gl => gl.drawElements(gl.TRIANGLES, indexes.length, gl.UNSIGNED_SHORT, 0)} shape
						vec3 uColor ${color}
					`)}
					gl_FragColor = vec4(uColor, 1.0)
				`,
			],
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
	const memo = useMemo();
	memo.initialized = true;

	return ({ globalState }) => {
		const { video, comments } = globalState;
		const { id, owner } = video;
		const { length } = comments;

		if (!length) {
			return;
		}

		let { prevId, state } = memo;
		
		if (id !== prevId) {
			memo.prevId = id;

			memo.state = state = createState({
				expandedCount: 10,
			});
		}

		const { expandedCount } = state;
		const ref = [];

		onRender(() => {
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

function RichComments () {
	console.log('======', memo.initialized);
	return Comments({ isRich: true });
}

function Recommendations () {
	return ({ globalState }) => {
		const { recommendations } = globalState;

		return ['', null,
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
					[VideoPlayer],
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

App.Comments = Comments;
App.RichComments = RichComments;
})();
