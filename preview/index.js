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
	return {
		comments: Array(random(100)).fill(null).map(() => ({
			user: `${random(colors)} ${random(shapes)}`,
			message: Array(random(49) + 1).fill(null).map(() => random(words)).join(' '),
		})),
	};
}

function generateRecommendations () {
	return {
		recommendations: Array(5).fill(null).map(generateVideo),
	};
}
// END: content generation functions to simulate data from server

const { createState, onRender } = stew;

function loadRecommendation (index, outerState) {
	const { recommendations: { recommendations } } = outerState;
	outerState.video = recommendations[index];
	outerState.comments = generateComments();
	outerState.recommendations = { recommendations: [...recommendations.slice(0, index), ...recommendations.slice(index + 1), generateVideo()] };
}

function VideoPlayer ({ id, title, action, color, shape, ft, length, owner }, outerState) {
	const iterationCount = length / 5000;
	
	return memos => {
		const [prevId] = memos.splice(0, 1, id);

		if (id !== prevId) {
			memos[1] = createState({
				playState: 'paused',
				currentTime: 0,
				playTimestamp: undefined,
				completed: false,
				hoverActive: false,
			});
		}

		const state = memos[1];

		return ['', { context: state },
			(memos, { playState, currentTime, playTimestamp, hoverActive, completed }) => {
				const [prevPlayState] = memos.splice(0, 1, playState);

				if (playState !== prevPlayState) {
					onRender(() => {
						console.log('===== set video', playState);
						memos[1]?.();
						if (playState !== 'running') return;

						const timeout = setTimeout(() => {
							state.playState = 'paused';
							state.currentTime = length;
							state.completed = true;
						}, length - currentTime);

						return memos[1] = () => clearTimeout(timeout);
					});
				}

				return ['div', {
					className: [
						'video-player',
						`video-${playState}`,
						!hoverActive ? '' : 'video-hover-active',
						`video-${action}`,
						`video-${color}`,
						`video-${shape}`,
						!ft ? '' : [
							'video-ft',
							`video-ft-${ft.action}`,
							`video-ft-${ft.color}`,
							`video-ft-${ft.shape}`,
						].join(' '),
					].join(' '),
					onmouseenter: () => state.hoverActive = true,
					onmouseleave: () => state.hoverActive = false,
				},
					'video is',
					state.playState === 'paused' && ' not',
					' playing',
					['span', {
						className: 'primary',
						style: { animationPlayState: playState, animationIterationCount: iterationCount }
					}],
					['span', {
						className: 'secondary',
						style: { animationPlayState: playState, animationIterationCount: iterationCount }
					}],
					['div', { className: 'overlay' }],
					['div', {
						className: 'progress',
						style: playState === 'running' ? {
							width: '100%', transitionDuration: `${Math.max(0, length - currentTime)}ms`,
						} : {
							width: `${Math.min(1, currentTime / length) * 100}%`, transitionDuration: '0ms',
						}
					}],
					['button', {
						type: 'button',
						className: 'play-pause',
						onclick: () => {
							if (completed) {
								loadRecommendation(0, outerState);
								return;
							}

							state.playState = playState === 'running' ? 'paused' : 'running';
							const now = Date.now();
							
							if (state.playState === 'running') {
								state.playTimestamp = now;
							} else if (playTimestamp < now) {
								state.currentTime += Math.min(now - playTimestamp, length - currentTime);
							}
						},
					}, completed ? 'Play Next' : playState === 'running' ? 'Pause' : 'Play'],
				];
			},
			['h1', { className: 'video-title' }, title],
			['strong', { className: 'video-owner' }, owner],
		];
	};
}

function Comments ({ comments }, outerState) {
	const { video: { id, owner } } = outerState;
	const { length } = comments;

	return !length ? null : memos => {
		const [prevId] = memos.splice(0, 1, id);

		if (id !== prevId) {
			memos[1] = createState({
				expandedCount: 10,
			});
		}

		const state = memos[1];
		const { expandedCount } = state;
		const ref = [];
		const [prevExpandedCount] = memos.splice(2, 1, expandedCount);

		if (expandedCount !== prevExpandedCount) {
			onRender(() => {
				console.log('===== set focus on', ref[0]);
				if (ref.length) ref[0].focus();
			});
		}

		return ['', null,
			...comments.slice(0, expandedCount).map(({ user, message }, i) => {
				return ['div', {
					ref: i && i === expandedCount - 10 && ref,
					className: 'comment',
					tabIndex: '-1',
				},
					['strong', { className: `comment-user ${user === owner ? 'comment-user-owner' : ''}` }, user],
					['p', { className: 'comment-message' }, message],
				];
			}),
			length > expandedCount && ['button', {
				type: 'button',
				onclick: () => state.expandedCount += 10,
			}, 'Show More'],
		];
	};
}

function Recommendations ({ recommendations }, outerState) {
	return ['', null,
		...recommendations.map(({ title, color, shape, ft, length, owner }, i) => ['div', {
			className: 'recommendation',
			onclick: () => loadRecommendation(i, outerState),
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
}

function App () {
	return memos => {
		if (!memos.length) {
			memos[0] = createState({
				video: generateVideo(),
				comments: generateComments(), 
				recommendations: generateRecommendations(),
			});
		}

		const [state] = memos;
		
		return ['', null,
			['div', { className: 'header' },
				['strong', { className: 'logo' }, 'StewTube'],
			],
			() => {
				const { video, comments, recommendations } = state;

				return ['div', { className: 'container' },
					['div', { className: 'row' },
						['div', { className: 'col col-8' },
							VideoPlayer(video, state),
							Comments(comments, state),
						],
						['div', { className: 'col col-4' },
							Recommendations(recommendations, state),
						],
					],
					{ name: 'component' },
				];
			},
		];
	};
}

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
})();
