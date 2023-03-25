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
const actions = ['Spinning', 'Bouncing', 'Pulsing'];
const colors = ['Jade', 'Amber', 'Teal'];
const shapes = ['Circle', 'Triangle', 'Square'];
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
	const action = random(actions);
	const color = random(colors);
	const shape = random(shapes);
	let title = `${action} ${color} ${shape}`;
	let ft;

	if (random() < 0.333333) {
		const action = random(actions);
		const color = random(colors);
		const shape = random(shapes);
		title += ` ft. ${color} ${shape}`;

		ft = {
			action: action.toLowerCase(),
			color: color.toLowerCase(),
			shape: shape.toLowerCase(),
		};
	}
	
	return {
		title,
		action: action.toLowerCase(),
		color: color.toLowerCase(),
		shape: shape.toLowerCase(),
		ft,
		length: (random(35) + 1) * 5,
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
// END: content generation functions to simulate data from server

function VideoPlayer ({ title, action, color, shape, ft, length, owner }) {
	const iterationCount = length / 5;

	return ['', {
		...stew('playState:setPlayState', 'paused'),
	},
		({ playState, setPlayState }) => ['div', {
			className: [
				'video-player',
				`video-${playState}`,
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
		},
			['span', { className: 'primary', style: { animationPlayState: playState, animationIterationCount: iterationCount } }],
			['span', { className: 'secondary', style: { animationPlayState: playState, animationIterationCount: iterationCount } }],
			['button', {
				type: 'button',
				onclick: () => setPlayState(playState === 'running' ? 'paused' : 'running'),
			}, playState === 'play' ? 'Pause' : 'Play'],
		],
		['h1', { className: 'video-title' }, title],
		['strong', { className: 'video-owner' }, owner],
	];
}

function Comments ({ comments }, { owner }) {
	const { length } = comments;

	return !length ? null : ['', {
		...stew('expandedCount:setExpandedCount', 10),
	},
		({ expandedCount, setExpandedCount }) => ['', null,
			...comments.slice(0, expandedCount).map(({ user, message }) => ['div', {
				className: 'comment',
			},
				['strong', { className: `comment-user ${user === owner ? 'comment-user-owner' : ''}` }, user],
				['p', { className: 'comment-message' }, message],
			]),
			length > expandedCount && ['button', {
				type: 'button',
				onclick: () => setExpandedCount(expandedCount += 10),
			}, 'Show More']
		],
	];
}

function App () {
	return stew('#app', ['', {
		...stew('video:setVideo', generateVideo()),
		...stew('comments:setComments', generateComments()),
	},
		({ video, comments }) => ['', null,
			VideoPlayer(video),
			Comments(comments, video),
		],
	]);
}

if (typeof window === 'object') {
} else if (typeof module === 'object') {
}
})();
