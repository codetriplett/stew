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

export default function createMatrix () {
    const [tilt, rotation, spin, invert] = arguments;
    const tiltMatrix = createTilt(tilt);
    const rotationMatrix = createRotation(rotation);
    const spinMatrix = createSpin(spin);

    const compositeMatrix = invert
        ? multiply(spinMatrix, tiltMatrix, rotationMatrix)
        : multiply(rotationMatrix, tiltMatrix, spinMatrix);

    return compositeMatrix;
}
