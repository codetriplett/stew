const state = stew({
    objects: [],
});

export function add () {
	const [...matrices] = arguments;
	return matrices.reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
}

export function subtract () {
	const [...matrices] = arguments;
	return matrices.reduce((a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]);
}

export function multiply () {
	const [...matrices] = arguments;

	return matrices.reduce((a, b) => {
		const matrix = [];

		for (let i = 0; i < a.length; i += 3) {
			matrix.push(
				a[i] * b[0] + a[i + 1] * b[3] + a[i + 2] * b[6],
				a[i] * b[1] + a[i + 1] * b[4] + a[i + 2] * b[7],
				a[i] * b[2] + a[i + 1] * b[5] + a[i + 2] * b[8],
			);
		}

		return matrix;
	});
}

export function createTilt () {
	const [angle] = arguments;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [1, 0, 0, 0, cos, sin, 0, -sin, cos];
}

export function createRotation () {
	const [angle] = arguments;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [cos, 0, -sin, 0, 1, 0, sin, 0, cos];
}

export function createSpin () {
	const [angle] = arguments;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [cos, sin, 0, -sin, cos, 0, 0, 0, 1];
}

export function createMatrix () {
	const [tilt, rotation, spin, invert] = arguments;
	const tiltMatrix = createTilt(tilt);
	const rotationMatrix = createRotation(rotation);
	const spinMatrix = createSpin(spin);

	const compositeMatrix = invert
		? multiply(spinMatrix, tiltMatrix, rotationMatrix)
		: multiply(rotationMatrix, tiltMatrix, spinMatrix);

	return compositeMatrix;
}

export function stewtube () {
	const [props, description] = arguments;
	const state = stew({ objects: [] }, []);
	const { objects } = state;

	stew(null, [], () => {
		window.addEventListener('keydown', ({ key }) => {
			if (key === ' ') {
				state.objects = [...state.objects, {
					position: [Math.random() - 0.5, Math.random() - 0.5],
					color: [Math.random(), Math.random(), Math.random()],
					rotation: [Math.random() * Math.PI * 2 / 1000, Math.random() / 1000, 0],
					matrix: [1, 0, 0, 1],
				}];
			}
		});
	});

	return ['', null,
	    ['canvas', { width: 480, height: 270 }, stew`
	        ${gl => {
	            gl.clearColor(0.0, 0.0, 0.0, 1.0);
	            gl.clear(gl.COLOR_BUFFER_BIT);
	        }}
			FLOAT vec2 aVertex ${new Float32Array([-0.5, 0.5, -0.5, -0.5, 0.5, -0.5])}
			mat2 uAspect ${[270 / 480, 0, 0, 1]}
			gl_Position = vec4(uAspect * uMatrix * aVertex + uPosition, 0.0, 1.0)
			${objects.map(({ position, rotation, matrix, color }) => stew`
				${(gl, duration) => {
					rotation[1] += rotation[2] * duration;
					const angle = rotation[0] += rotation[1] * duration;
					const cos = Math.cos(angle);
					const sin = Math.sin(angle);
					matrix.splice(0, 4, cos, sin, -sin, cos);
				}}
				vec2 uPosition ${position}
				mat2 uMatrix ${matrix}
				${gl => gl.drawArrays(gl.TRIANGLES, 0, 3)}
				vec3 uColor ${color}
			`)}
			gl_FragColor = vec4(uColor, 1.0)
	        ${() => 16}
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
}, ['style', null, `
canvas {
	width: 100%;
}
`]];
