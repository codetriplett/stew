const state = stew({
    camera: {
		tilt: [0.707, 0, 0],
		rotation: [0.707, 0, 0],
		spin: [0, 0, 0],
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
	},
    cubes: Array(26).fill(null).map(() => ({
		// have matrix be of the face in motion the face is grouped inside of
		// store origin props to apply XYZ translate before matrix
		// these origin props and matrix props are updated whenever the cube becomes a part of a different face that initiated its spin
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
	})),
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

export function updateMotion (motion, duration) {
	if (motion.length > 4) {
		motion[1] = Math.max(Math.min(motion[0] - motion[3], motion[4] - motion[0]), (motion[4] - motion[3]) * 0.1) * 0.01;
	}

	motion[1] += motion[2] * duration;
	motion[0] += motion[1] * duration;

	if (motion.length > 3 && (motion[1] >= 0 && motion[0] >= motion[4] || motion[1] <= 0 && motion[0] <= motion[4])) {
		motion.splice(0, 5, motion[4], 0, 0);
	}

	return motion[0];
}

export function cube () {
	const [props, description] = arguments;

	// return ['p', null, 'This will be a demo of 3d graphics support, which is still in development.'];

	if (props) {
	    // TODO: update the cube matrixes according to the orientations
	    // - no JSON to save. URL holds the orientations
	}

	stew(() => {
	    window.addEventListener('keydown', ({ key }) => {
	        if (key === ' ') {
				const { camera } = state;
				const { rotation } = camera;

				if (rotation.length > 3) {
					return;
				}

				rotation[3] = rotation[0];
				rotation[4] = rotation[0] + Math.PI / 2;
	        }
	    });

	    // TODO: add touch controls
		// - tap left: spin left side CW
		// - tap right: spin right side CCW
		// - hold left + tap right: spin whole cube along left side axis
		// - hold right + tap left: spin whole cube along right side axis
	}, []);

	const { camera, cubes } = state;
	const vertexes = new Float32Array([-1, -1, -1, 1, -1, -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, 1, 1, 1, 1, 1]);
	const elements = new Uint16Array([1, 0, 2, 2, 3, 1, 0, 1, 5, 5, 4, 0, 6, 2, 0, 0, 4, 6, 4, 5, 7, 7, 6, 4, 3, 2, 6, 6, 7, 3, 5, 1, 3, 3, 7, 5]);
	const aspect = [0.5 * 270 / 480, 0, 0, 0, 0.5, 0, 0, 0, 0.5];
	// TODO: add normals array and derive colors from that (+X -> R, +Y -> G, -X -> GB)
	// - maybe add effect that puts scenery behind each color (e.g. red -> fire, blue -> ocean, green -> forest)

	return ['', null,
	    ['canvas', { width: 960, height: 540 }, stew`
	        ${(gl, duration) => {
				const { tilt, rotation, spin, matrix } = camera;
				const tiltAngle = updateMotion(tilt, duration);
				const rotationAngle = updateMotion(rotation, duration);
				const spinAngle = updateMotion(spin, duration);
				matrix.splice(0, 9, ...createMatrix(tiltAngle, rotationAngle, spinAngle));

	            gl.clearColor(0.0, 0.0, 0.0, 1.0);
	            gl.clear(gl.COLOR_BUFFER_BIT);
				gl.clear(gl.DEPTH_BUFFER_BIT);
				gl.enable(gl.CULL_FACE);
				gl.cullFace(gl.BACK);
				gl.enable(gl.DEPTH_TEST);
				gl.depthFunc(gl.LESS);
	        }}
	        mat3 uAspect ${aspect} // comment
			mat3 uCamera ${camera} matrix
			FLOAT vec3 aVertex ${vertexes}
			elements ${elements}
			gl_Position = vec4(uAspect * uCamera * uMatrix * aVertex * 0.998, 1.0)
			varying vec3 vNormal = aVertex // TODO: create initializer and remove 'varying <type>' when including in main function
	        ${cubes.map(cube => stew`
				mat3 uMatrix ${cube} matrix
	            ${gl => gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0)}
	            // fragment
	        `)}
			gl_FragColor = vec4(vNormal, 1.0)
	        ${() => 16}
	    `],
	    description,
	];
}

export default [cube, {
    '': {
        '': 'Cube',
    },
}, ['style', null, `
canvas {
    width: 100%;
}
`]];
