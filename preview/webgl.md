# WebGL

Shaders are supported within canvas elements to create 2D and 3D graphics. You can view a example here, [Cube Demo](/cube/), and see its code by removing the trailing slash, [Cube Code](/cube). This is still experimental, and a better guide will be written to explain more, but here are some of the basics.

## Shaders

There are two types of shaders involved in painting a scene. The first runs once for each vertex, to set its position on the screen, and the second will run for each pixel in the area of the triangles they form. The Stew library streamlines the linking of values in your program and supports nesting parts of your shaders that are more object specific.

```
['canvas', { width: 960, height: 540 }, stew`
	// global vertex variables and code
	
	${(gl, duration) => {
		// before drawing objects
	}}
	${objects.map(({ matrix, position }) => stew`
		// object-specific vertex variables and code

		${gl => // draw elements}
		
		// object-specific vertex variables and code
	`)}
	${(gl, duration) => {
		// after drawing objects (if needed)
	}}

	// global fragment variables and code
`]

```

## Variables

Values are linked at the moment your shaders are processed. Each one is defined by its type and name to be used within the program. Most accept basic arrays, the ones that that start with a subtype, e.g. FLOAT, are attribute variables that require you to use a typed array, e.g Float32Array. Variables can usually only be used by code on their side of the vertex/fragment shader speparation point, but ones in the vertex shader can be preceeded by a star to indicate they should be shared with the fragment shader.

```
['canvas', { width: 960, height: 540 }, stew`
	mat3 uCamera ${cameraMatrix}
	FLOAT vec3 aVertex ${vertexes}
	elements ${elements}
	gl_Position = vec4(uCamera * uMatrix * aVertex + uPosition, 1.0);
	*vec3 vNormal = aVertex;

	// rest of program
`]

```

## Full example

The following sets up a simple scene. If you make use of a state that triggers your program to relink, be sure to store whatever you can in a memo to save on processing. See the [stew](/stew#memos) guide for more detail on that.

```demo
function createRotation () {
	const [angle] = arguments;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return [cos, 0, -sin, 0, 1, 0, sin, 0, cos];
}

const vertexes = new Float32Array([
	-1, -1, -1,    1, -1, -1,    -1, 1, -1,    1, 1, -1,
	-1, -1, 1,     1, -1, 1,     -1, 1, 1,     1, 1, 1
]);

const elements = new Uint16Array([
	2, 0, 1,    1, 3, 2,    5, 1, 0,    0, 4, 5,
	0, 2, 6,    6, 4, 0,    7, 5, 4,    4, 6, 7,
	6, 2, 3,    3, 7, 6,    3, 1, 5,    5, 7, 3
]);

const aspectMatrix = [0.5, 0, 0, 0, 0.5 * 9 / 16, 0, 0, 0, 0.125];
const cameraMatrix = [1, 0, 0, 0, 0.707, -0.707, 0, 0.707, 0.707];

const objects = [
	{
		position: [0, -2, 0],
		rotation: [0, 0.001],
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
		color: [1, 0.5, 0],
	},
	{
		position: [0, 2, 0],
		rotation: [0, -0.001],
		matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
		color: [0, 0.5, 1],
	}
];

// NOTE: This example reuses the vertex position as the normal value, but you should provide your own attribute array for these

return ['canvas', { width: 540, height: 960 }, stew`
	mat3 uAspect ${aspectMatrix}
	mat3 uCamera ${cameraMatrix}
	FLOAT vec3 aVertex ${vertexes}
	elements ${elements}

	gl_Position = vec4(uAspect * uCamera * (uMatrix * aVertex + uPosition), 1.0);

	*vec3 vNormal = normalize(uMatrix * aVertex);

	${(gl, duration) => {
		// sets up the rendering behaviors of the scene
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.clear(gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LESS);

		// sets the delay between this frame and the next
		// if left out, it will only render one frame
		return 16;
	}}
	${objects.map(({ position, rotation, matrix, color }) => stew`
		mat3 uMatrix ${matrix}
		vec3 uPosition ${position}
		${(gl, duration) => {
			// applies rotation and updates the matrix before each draw
			rotation[0] += rotation[1] * duration;
			matrix.splice(0, 9, ...createRotation(rotation[0]));

			gl.drawElements(gl.TRIANGLES, elements.length, gl.UNSIGNED_SHORT, 0);
		}}
		vec3 uColor ${color}
	`)};

	float intensity = (dot(vNormal, vec3(0.577, 0.577, -0.577)) + 1.0) / 1.5;
	gl_FragColor = vec4(uColor * intensity, 1.0);
`];

```

## Clip Space

Only vertexes within the central volume of space at the end of their transformation will be visible on screen. This space is limited to between -1 and 1 in each of the axis directions. Matrixes are used to apply rotation and other transformations to each vertex to place it where it belongs in the scene.
