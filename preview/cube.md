```export
{}
```

# Cube

```export
const [props, description] = arguments;

return ['p', null, 'This will be a demo of 3d graphics support, which is still in development.'];

if (props) {
	// TODO: update the cube matrixes according to the orientations
	// - no JSON to save. URL holds the orientations
}

stew(() => {
	window.addEventListener('keydown', ({ key }) => {
		if (key === ' ') {
			console.log('================');
		}
	});

	// TODO: add touch controls
}, []);

const { camera, cubes } = state;
const vertexes = [-1, -1, -1, 1, -1, -1, -1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, 1, 1, 1, 1, 1];
const elements = [1, 0, 2, 2, 3, 1, 0, 1, 5, 5, 4, 9, 6, 2, 0, 0, 4, 6, 4, 5, 7, 7, 6, 4, 3, 2, 6, 6, 7, 3, 5, 1, 3, 3, 7, 5];
const color = [0.5, 0.25, 0.75]; // set these by face (e.g. -z, -x, +z, etc)
const aspect = [480 / 270, 0, 0, 1];

return ['', null,
	['canvas', { width: 480, height: 270 }, stew`
		${gl => {
			gl.clearColor(0.0, 0.0, 0.0, 1.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
		}}
		mat2 uAspect ${aspect}
		${cubes.map(matrix => stew`
			FLOAT vec2 aVertex ${vertexes}
			elements ${elements}
			gl_Position = vec4(aVertex, 0.0, 1.0)
			${gl => gl.drawElements(gl.TRIANGLES, 36, gl.FLOAT, 0)}
			vec3 uColor ${color}
			gl_FragColor = vec4(uColor, 1.0)
		`)}
		${() => fps}
	`],
	description,
];
```

## State

```export
{
	camera: [1, 0, 0, 0, 1, 0, 0, 0, 1],
	cubes: Array(26).fill(null).map(() => [1, 0, 0, 0, 1, 0, 0, 0, 1]),
}
canvas {
	width: 100%;
}
```
