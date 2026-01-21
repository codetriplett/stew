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

export function createProjection (fov, aspect, near = 1, far) {
    const f = 1 / Math.tan(fov / 2);
    const rangeInv = 1 / (near - far);

    return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, far ? (far + near) / rangeInv : -1, -1,
        0, 0, far ? 2 * far * near * rangeInv : -2 * near, 0,
    ];
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

export function matrix () {
	return ['', null,
		['div', { style: { display: 'flex' } },
            ['div', { style: { flex: '1 0 0' } },
                test.group('add', () => {
                    test('vectors', () => {
                        const actual = add([1, 2, 3], [4, 5, 6]);
                        test.equals(actual, [5, 7, 9]);
                    });
                }),
                test.group('subract', () => {
                    test('vectors', () => {
                        const actual = subtract([5, 7, 9], [4, 5, 6]);
                        test.equals(actual, [1, 2, 3]);
                    });
                }),
                test.group('multiply', () => {
                    test('vector', () => {
                        const actual = multiply([10, 20, 30], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
                        test.equals(actual, [300, 360, 420]);
                    });

                    test('matrix', () => {
                        const actual = multiply(
                            [10, 20, 30, 40, 50, 60, 70, 80, 90],
                            [1, 2, 3, 4, 5, 6, 7, 8, 9],
                        );

                        test.equals(actual, [300, 360, 420, 660, 810, 960, 1020, 1260, 1500]);
                    });
                }),
            ],
            ['div', { style: { flex: '1 0 0' } },
                test.group('create', () => {
                    test('tilt', () => {
                        const actual = createTilt(1);

                        test.equals(actual, [
                            1, 0, 0,
                            0, 0.5403023058681398, 0.8414709848078965,
                            0, -0.8414709848078965, 0.5403023058681398,
                        ]);
                    });
                    
                    test('rotation', () => {
                        const actual = createRotation(1);

                        test.equals(actual, [
                            0.5403023058681398, 0, -0.8414709848078965,
                            0, 1, 0,
                            0.8414709848078965, 0, 0.5403023058681398,
                        ]);
                    });

                    test('spin', () => {
                        const actual = createRotation(1);

                        test.equals(actual, [
                            0.5403023058681398, 0, -0.8414709848078965,
                            0, 1, 0,
                            0.8414709848078965, 0, 0.5403023058681398,
                        ]);
                    });

                    test('matrix', () => {
                        const actual = createMatrix(1, 2, 3);

                        test.equals(actual, [
                            0.30400463823651314, -0.8162168309429011, -0.49129549643388193,
                            -0.07624746575887673, -0.5348952287053772, 0.8414709848078965,
                            -0.9496143974772263, -0.21835104578121428, -0.2248450953661529,
                        ]);
                    });

                    test('inverted', () => {
                        const actual = createMatrix(1, 2, 3, true);

                        test.equals(actual, [
                            0.5199598530948528, 0.07624746575887673, 0.8507808619938085,
                            -0.698763541087659, -0.5348952287053772, 0.47499116618612774,
                            0.49129549643388193, -0.8414709848078965, -0.2248450953661529,
                        ]);
                    });
                }),
            ],
        ],
    ];
}

export default [matrix, {
    '': 'Matrix',
}];
