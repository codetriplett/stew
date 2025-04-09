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
const shapes = ['Circle', 'Square'];
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

const { createState, onRender } = stew;

function loadRecommendation (index, globalState) {
	const { recommendations } = globalState;
	globalState.video = recommendations[index];
	globalState.comments = generateComments();
	globalState.recommendations = [...recommendations.slice(0, index), ...recommendations.slice(index + 1), generateVideo()];
}

// TODO: rewrite video player to use basic 2d shapes, then switch to 3d
// - this will test both webgl and hot swap features
function AdvancedVideoPlayer ({ '': memo }) {
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

const indexes = new Uint16Array([0, 1, 2, 2, 3, 0]);
const vertexes = new Float32Array([-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5]);
const colorArray = [1, 1, 1];

function VideoPlayer ({ '': memo }) {
	return ({ globalState }) => {
		const { video } = globalState;
		const { id, title, action, color, shape, ft, length, owner } = video;
		const iterationCount = length / 5000;
		let { prevId, state } = memo;
		
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
				stew`${gl => {
					gl.clearColor(0.0, 0.0, 0.0, 1.0);
					gl.clear(gl.COLOR_BUFFER_BIT);
				}}`,
				stew`
					elements ${indexes}
					FLOAT vec2 aVertex ${vertexes}
					gl_Position = vec4(aVertex, 1.0, 1.0)
					${gl => gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)}
					vec3 uColor ${colorArray}
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

function Comments ({ '': memo, isRich }) {
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

function RichComments ({ '': memo }) {
	console.log('======', memo.initialized);
	return Comments({ '': memo, isRich: true });
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
	const globalState = createState(initialProps)

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
