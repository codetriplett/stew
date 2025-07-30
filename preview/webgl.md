# WebGL

Shaders are supported within canvas elements to create 2D and 3D graphics. You can view a example here, [Cube Code](/cube), and see it running by adding a trailing slash, [Cube Demo](/cube/). This is still experimental, and a better guide will be written to explain more, bu there are some of the basics.

## Clip Space

Only vertexes within the central volume of space will be visible on screen. This space is limited to between -1 and 1 in each of the axis directions. Matrixes are used to apply rotation and other transformations to each vertex to place it where it belongs in the scene.

## Shaders

There are two types of shaders involved in painting a scene. The first runs once for each vertex in the scene, to set its position, and the second will run for each pixel of the triangles that they form. The Stew library, which is used to manage all layouts on this site, takes care of a lot of the linking for you, but it doesn't allow for the type of optimization you would need to create a highly performant game. This is just a sandbox to experiment with simple ideas. Setting a variable on its own line, without a type definition will mark the separation point between these shaders. The vertex shader is at the top, and can be linked with several fragment shaders if you wish by setting multiple separation points. Shaders can be nested as well by passing an array in the separation point.

## Variables

Values are linked at the moment your shaders are processed. Each one is defined by its type and name to be used within the program. Most accept basic arrays, the ones that that start with a subtype, e.g. FLOAT are attribute variables that require you to use a typed array, e.g Float32Array. Variables can usually only be used by code on their side of the speparation point, but ones the the vertex shader can be preceeded by a star to indicate they should be shared with the fragment shader.

```
['canvas', { width: 960, height: 540 }, stew`
	mat3 uCamera ${cameraMatrix}
	FLOAT vec3 aVertex ${vertexes}
	elements ${elements}
	gl_Position = vec4(uCamera * uMatrix * aVertex + uPosition, 1.0);
	*vec3 vNormal = aVertex;
	${(gl, duration) => {
		// this code runs once for each frame, before objects are rendered
		// it is where you would update object properties

		// sets up the rendering behaviors you need
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.clear(gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LESS);

		// sets the delay between this frame and the next
		// if left out, it will only renders one frame
		return 16;
	}}
	${objects.map(({ matrix, position }) => stew`
		mat3 uMatrix ${matrix}
		vec3 uPosition ${position}
		${gl => gl.drawElements(gl.TRIANGLES, elements.length, gl.UNSIGNED_SHORT, 0)}
	`)}
	vec3 uColor
	gl_FragColor = vec4(
		vPos.x - xEdge > 0.125 || yBack || zBack ? 1.0 : 0.0,
		vPos.y - yEdge > 0.125 || xBack || zBack ? 1.0 : 0.0,
		-vPos.z - zEdge > 0.125 || xBack || yBack ? 1.0 : 0.0,
		1.0
	);
`]
```
