const state = stew({
    isHeld: false,
});

export function game () {
stew(() => {
    window.addEventListener('keydown', ({ key }) => {
        if (key === ' ') {
            state.isHeld = true;
        }
    });

    window.addEventListener('keyup', ({ key }) => {
        if (key === ' ') {
            state.isHeld = false;
        }
    });
}, []);

const { isHeld } = state;

const vertexes = [
    -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
    0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
];

const color = isHeld ? [0.5, 0.75, 0.25] : [0.5, 0.25, 0.75];

return ['div', {
    className: 'game',
},
    ['canvas', { width: 480, height: 270 }, stew`
        ${gl => {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }}
        FLOAT vec2 aVertex ${vertexes}
        gl_Position = vec4(aVertex, 0.0, 1.0)
        gl_PointSize = 4.0
        ${gl => gl.drawArrays(gl.POINTS, 0, 12)}
        vec3 uColor ${color}
        gl_FragColor = vec4(uColor, 1.0)
        ${() => 16}
    `],
];
}

export default [game, {
    '': 'Game',
}];
