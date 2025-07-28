const identityMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const state = stew({
	group: {
		tilt: [0, 0, 0],
		rotation: [0, 0, 0],
		spin: [0, 0, 0],
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
	},
    cubes: Array(27).fill(null).map((_, i) => ({
		// have matrix be of the face in motion the face is grouped inside of
		// store origin props to apply XYZ translate before matrix
		// these origin props and matrix props are updated whenever the cube becomes a part of a different face that initiated its spin
		offset: [Math.floor(i / 9) * 2 - 2, (Math.floor(i / 3) % 3) * 2 - 2, (i % 3) * 2 - 2],
	})),
	indexes: new Set(),
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
		motion[1] = Math.max(Math.min(motion[0] - motion[3], motion[4] - motion[0]), (motion[4] - motion[3]) * 0.1) * 0.02;
	}

	motion[1] += motion[2] * duration;
	motion[0] += motion[1] * duration;

	if (motion.length > 3 && (motion[1] >= 0 && motion[0] >= motion[4] || motion[1] <= 0 && motion[0] <= motion[4])) {
		motion.splice(0, 5, motion[4], 0, 0);
	}

	return motion[0];
}

const sideState = { left: false, right: false };
const tiltIndexes = new Set([18, 19, 20, 21, 22, 23, 24, 25, 26]);
const spinIndexes = new Set([0, 3, 6, 9, 12, 15, 18, 21, 24]);
const fullIndexes = new Set(Array(27).fill(0).map((_, i) => i));
let prevMotion;

// TODO: add touch controls
// - tap left: spin left side CW
// - tap right: spin right side CCW
// - hold left + tap right: spin whole cube along left side axis
// - hold right + tap left: spin whole cube along right side axis
function handleAction (side, held) {
	const { group, cubes, indexes } = state;
	const { tilt, spin } = group;
	let newIndexes, motion;
	sideState[side] = held;

	if (prevMotion?.length > 3) {
		return;
	} else if (sideState[side === 'left' ? 'right' : 'left']) {
		motion = side === 'left' ? tilt : spin;
		newIndexes = fullIndexes;
	} else if (held) {
		return;
	} else if (indexes === fullIndexes) {
		newIndexes = new Set();
	} else {
		motion = side === 'left' ? spin : tilt;
		newIndexes = motion === spin ? spinIndexes : tiltIndexes;
	}

	if (newIndexes !== indexes || motion !== prevMotion) {
		const { matrix } = group;

		for (const index of indexes) {
			const cube = cubes[index];
			const { offset } = cube;
			// TODO: figure out why this isn't applying the matrix like the shader does
			// cube.offset = multiply(offset, matrix);
		}

		spin.splice(0, 5, 0, 0, 0);
		tilt.splice(0, 5, 0, 0, 0);
		matrix.splice(0, 9, ...identityMatrix);
		state.indexes = newIndexes;
	}

	if (motion) {
		motion[3] = motion[0];
		motion[4] = motion[0] - Math.PI / 2;
		prevMotion = motion;
	}
}

export function cube () {
	const [props, description] = arguments;

	// return ['p', null, 'This will be a demo of 3d graphics support, which is still in development.'];

	if (props) {
	    // TODO: update the cube matrixes according to the orientations
	    // - no JSON to save. URL holds the orientations
	}

	const cameraMatrix = stew(() => {
	    window.addEventListener('keydown', ({ key, repeat }) => {
			if (repeat) {
				return;
			}

	        switch (key) {
				case 'f': {
					handleAction('left', true);
					break;
				}
				case 'j': {
					handleAction('right', true);
					break;
				}
			}
	    });

	    window.addEventListener('keyup', ({ key }) => {
	        switch (key) {
				case 'f': {
					handleAction('left', false);
					break;
				}
				case 'j': {
					handleAction('right', false);
					break;
				}
			}
	    });

		window.addEventListener('touchstart', ({ changedTouches }) => {
			for (const { identifier, pageX, pageY } of changedTouches) {
				handleAction(pageX < window.innerWidth / 2 ? 'left' : 'right', true);
			}
		});

		window.addEventListener('touchend', ({ changedTouches }) => {
			for (const { identifier, pageX, pageY } of changedTouches) {
				handleAction(pageX < window.innerWidth / 2 ? 'left' : 'right', false);
			}
		});

		const aspectMatrix = [0.167 * 270 / 480, 0, 0, 0, 0.167, 0, 0, 0, 0.167];
		const compositeMatrix = createMatrix(-Math.PI / 6, Math.PI / 4, 0);
		return multiply(compositeMatrix, aspectMatrix);
	}, []);

	const vertexes = new Float32Array([
		-1, -1, -1,    1, -1, -1,    -1, 1, -1,    1, 1, -1,
		-1, -1, 1,     1, -1, 1,     -1, 1, 1,     1, 1, 1
	]);
	
	const elements = new Uint16Array([
		2, 0, 1,    1, 3, 2,    5, 1, 0,    0, 4, 5,
		0, 2, 6,    6, 4, 0,    7, 5, 4,    4, 6, 7,
		6, 2, 3,    3, 7, 6,    3, 1, 5,    5, 7, 3
	]);
	
	const { group, cubes, indexes } = state;
	const { matrix } = group;

	return ['', null,
	    ['canvas', { width: 960, height: 540 }, stew`
			mat3 uCamera ${cameraMatrix}
			FLOAT vec3 aVertex ${vertexes}
			elements ${elements}
			gl_Position = vec4(uCamera * uMatrix * (aVertex + uOffset), 1.0);
			*vec3 vPos = aVertex;
			${(gl, duration) => {
				const { tilt, rotation, spin, matrix } = group;
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

				return 16;
	        }}
	        ${cubes.map(({ offset }, i) => stew`
				mat3 uMatrix ${indexes.has(i) ? matrix : identityMatrix}
				vec3 uOffset ${offset}
	            ${gl => gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0)}
	        `)}
			vec3 absPos = abs(vPos);
			float xEdge = max(absPos.y, absPos.z);
			float yEdge = max(absPos.x, absPos.z);
			float zEdge = max(absPos.x, absPos.y);
			bool xBack = -vPos.x - xEdge > 0.125;
			bool yBack = -vPos.y - yEdge > 0.125;
			bool zBack = vPos.z - zEdge > 0.125;
			gl_FragColor = vec4(
				vPos.x - xEdge > 0.125 || yBack || zBack ? 1.0 : 0.0,
				vPos.y - yEdge > 0.125 || xBack || zBack ? 1.0 : 0.0,
				-vPos.z - zEdge > 0.125 || xBack || yBack ? 1.0 : 0.0,
				1.0
			);
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
