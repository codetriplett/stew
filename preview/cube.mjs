export const state = stew({
    group: {
        tilt: [0, 0, 0],
        rotation: [0, 0, 0],
        spin: [0, 0, 0],
        matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    },
    cubes: Array(27).fill(null).map((_, i) => ({
        matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        offset: [Math.floor(i / 9) * 2 - 2, (Math.floor(i / 3) % 3) * 2 - 2, (i % 3) * 2 - 2],
    })),
    indexes: new Set(),
    sides: { left: false, right: false, both: false },
});

export function updateMotion () {
	const [motion, duration] = arguments;

	if (motion.length > 4) {
	    motion[1] = Math.max(Math.min(motion[0] - motion[3], motion[4] - motion[0]), (motion[4] - motion[3]) * 0.1) * 0.03125;
	}

	motion[1] += motion[2] * duration;
	motion[0] += motion[1] * duration;

	if (motion.length > 3 && (motion[1] >= 0 && motion[0] >= motion[4] || motion[1] <= 0 && motion[0] <= motion[4])) {
	    motion.splice(0, 5, motion[4], 0, 0);
	}

	return motion[0];
}

export function handleAction () {
	const [side, held] = arguments;
	const { group, cubes, indexes, sides } = state;
	const { tilt, rotation, spin } = group;
	let motion, change;
	sides[side] = held;

	if (held || state.motion?.length > 3) {
	    return;
	}

	if (sides.left || sides.right) {
	    sides.both = true;
	    motion = rotation;
	    change = (side === 'left' ? -Math.PI : Math.PI) / 2;
	} else if (!sides.both) {
	    motion = side === 'left' ? spin : tilt;
	    change = -Math.PI / 2;
	} else {
	    sides.both = false;
	    return;
	}

	if (motion !== state.motion) {
	    const groupMatrix = group.matrix;
	    let newIndexes = new Set();

	    for (const index of indexes) {
	        const cube = cubes[index];
	        let { matrix, offset } = cube;
	        matrix = multiply(matrix, groupMatrix);
	        offset = multiply(offset, groupMatrix);
	        Object.assign(cube, { matrix, offset });
	    }

	    if (motion === rotation) {
	        for (const [i, cube] of cubes.entries()) {
	            if (cube.offset[1] > 0.5) {
	                newIndexes.add(i);
	            }
	        }
	    } else {
	        newIndexes = new Set(Array(27).fill(0).map((_, i) => i));
	    }

	    spin.splice(0, 5, 0, 0, 0);
	    rotation.splice(0, 5, 0, 0, 0);
	    tilt.splice(0, 5, 0, 0, 0);
	    groupMatrix.splice(0, 9, 1, 0, 0, 0, 1, 0, 0, 0, 1);
	    Object.assign(state, { motion, indexes: newIndexes });
	}

	motion[3] = motion[0];
	motion[4] = motion[0] - change;
}

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

export function cube () {
	const [props, description] = arguments;

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
	const groupMatrix = group.matrix;

	return ['', null,
	    ['canvas', { width: 960, height: 540 }, stew`
	        mat3 uCamera ${cameraMatrix}
	        FLOAT vec3 aVertex ${vertexes}
	        elements ${elements}
	        gl_Position = vec4(uCamera * uGroup * (uMatrix * aVertex + uOffset), 1.0);
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
	        ${cubes.map(({ offset, matrix }, i) => stew`
	            mat3 uGroup ${indexes.has(i) ? groupMatrix : [1, 0, 0, 0, 1, 0, 0, 0, 1]}
	            mat3 uMatrix ${matrix}
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
