const state = stew({
    isPaused: false,
});

export function stewtube () {
	const [props, description] = arguments;

	if (!props) {
	    return ['p', null, 'Landing page'];
	}

	const { width, title, duration, shouldRepeat, objects } = props;
	const { isPaused } = state;
	const aspect = [width / 270, 0, 0, 1];

	stew(() => {
	    window.addEventListener('keydown', ({ key }) => {
	        if (key === ' ') {
	            state.isPause = !state.isPaused;
	        }
	    });

	    // TODO: add touch controls 
	}, []);

	const vertexes = stew(() => {
	    return objects.map(({ points }) => {
	        // TODO: generate custom x:y points and center
	        // - also return an elements array to define faces

	        return [
	            -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
	            0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
	        ];
	    });
	}, [objects]);

	// just use this for now
	const color = [0.5, 0.25, 0.75];

	return ['', null,
	    ['canvas', { width, height: 270 }, stew`
	        ${gl => {
	            gl.clearColor(0.0, 0.0, 0.0, 1.0);
	            gl.clear(gl.COLOR_BUFFER_BIT);
	        }}
	        mat2 uAspect = ${aspect}
	        ${objects.map(({ radius, rpm, color }, i) => stew`
	            FLOAT vec2 aVertex ${vertexes}
	            gl_Position = vec4(aVertex, 0.0, 1.0)
	            ${gl => gl.drawArrays(gl.POINTS, 0, 12)}
	            vec3 uColor ${color}
	            gl_FragColor = vec4(uColor, 1.0)
	        `)}
	        ${() => fps}
	    `],
	    description,
	];
}

export default [stewtube, {
    '': 'StewTube',
    title: '/[a-z ]+/i Title',
    duration: '/1.. Duration (ms)',
    date: 'date/2000-01-01..2020-12-31 Date',
    fps: '/.. FPS',
    shouldRepeat: '/ Repeat',
    objects: ['/.. Objects', {
        '': 'Polygon',
        points: '/3..6 Points',
        radius: '/..1 Radius',
        xPosition: '/-1.5..1.5',
        yPosition: '/-1..1',
        rpm: '/.. RPM',
        color: ['/ Color',
            'Teal',
            'Amber',
            'Jade',
            'Rose',
        ],
    }],
}];
