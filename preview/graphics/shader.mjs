import { multiply, createMatrix } from './matrix.mjs';
import { checkBoundary, applyPhysics } from './physics.mjs';

export function linkInstance (instance, newAsset) {
	const { asset: oldAsset } = instance;

	if (newAsset === oldAsset) {
		return;
	}

	if (oldAsset) {
		const { model, instances } = oldAsset;
		oldAsset.instances.delete(instance);

		if (instances.size === 0) {
			const { assets } = model;
			assets.delete(oldAsset);

			if (assets.size === 0) {
				models.delete(model);
			}
		}
	}
	
	if (newAsset) {
		const { model } = newAsset;
		newAsset.instances.add(instance);
		model.assets.add(newAsset);
		models.add(model);
	}
	
	instance.asset = newAsset;
}

export function updateMatrix (instance, duration, invert) {
	const { matrix, angles, motion } = instance || {};

	if (!matrix) {
		return [1, 0, 0, 0, 1, 0, 0, 0, 1];
	}

	if (motion && angles) {
		applyPhysics(angles, motion.slice(6), duration);
		const [tilt, rotation, spin] = angles;

		if (invert) {
			matrix.splice(0, 9, ...createMatrix(-tilt, -rotation, -spin, true));
		} else {
			matrix.splice(0, 9, ...createMatrix(tilt, rotation, spin));
		}
	}

	return matrix;
}

export function updatePosition (instance, duration) {
	const { position, motion, passengers = [], target } = instance || {};

	if (target) {
		return target.position;
	} else if (!position) {
		return [0, 0, 0];
	}

	if (motion) {
		applyPhysics(motion, motion.slice(3), duration, maxVelocity);
		applyPhysics(position, motion, duration);
		checkBoundary(instance);

		for (const passenger of passengers) {
			applyPhysics(passenger.position, motion, duration);
		}
	}

	return position;
}

export function renderInstance (instance, draw) {
	const { root, offset } = instance;
	const identityMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
	const identityPosition = [0, 0, 0];

	const child = stew`
		mat3 uMatrix ${duration => updateMatrix(instance, duration)}
		vec3 uPosition ${duration => updatePosition(instance, duration)}
		vec3 uOffset ${offset || identityPosition}
		vec3 vertex = uMatrix * (vec3(aVertex) + uOffset);
		vec3 position = uPosition;
		mat3 normalMatrix = uMatrix;
		${draw}
	`;

	return !root ? child : stew`
		mat3 uRootMatrix ${root.matrix || identityMatrix}
		vec3 uRootPosition ${root.position || identityPosition}
		vec3 uRootOffset ${root.offset || identityPosition}
		vertex = uRootMatrix * (vertex + position + uRootOffset);
		position = uRootPosition;
		normalMatrix = uRootMatrix * normalMatrix;
		${[child]}
	`;
}

export function renderAsset (asset, draw) {
	const { colors, instances } = asset;

	return stew`
		UNSIGNED_BYTE uvec3 aColor ${colors}
		float intensity = 1.0;
		vec4 color = vec4(aColor, 255) / 255.0;
		${[...instances].map(instance => renderInstance(instance, draw))}
	`;
}

export function renderModel (model) {
	const { elements, vertexes, normals, pointSize, assets } = model;

	const draw = elements
		? gl => gl.drawElements(gl.TRIANGLES, elements.length, gl.UNSIGNED_SHORT, 0)
		: gl => gl.drawArrays(gl.POINTS, 0, vertexes.length / 3);

	const subprograms = [...assets].map(asset => renderAsset(asset, draw));

	let program = stew`
		float uPointSize ${pointSize || 1}
		float pointSize = uPointSize;
		${!elements ? subprograms : [stew`
			elements ${elements}
			${subprograms}
		`]}
	`;

	program = vertexes instanceof Int8Array ? stew`
		BYTE ivec3 aVertex ${vertexes}
		${[program]}
	` : stew`
		FLOAT vec3 aVertex ${vertexes}
		${[program]}
	`;

	return !normals ? program : stew`
		vec3 normalVector = normalize(normalMatrix * vec3(aNormal));
		intensity = dot(normalize(uLightVector), normalVector) * 0.15 + 0.8;
		${[vertexes instanceof Int8Array ? stew`
			BYTE ivec3 aNormal ${normals}
			${[program]}
		` : stew`
			FLOAT vec3 aNormal ${normals}
			${[program]}
		`]}
	`;
}

export function renderScene (scene) {
	const { camera, light, models } = scene;

	return stew`
		mat4 uCameraProjection ${camera.projection}
		mat3 uCameraMatrix ${duration => updateMatrix(camera, duration)}
		vec3 uCameraPosition ${duration => updatePosition(camera, duration)}
		vec3 uCameraOffset ${camera.offset || [0, 0, 0]}
		float uCameraScale ${camera.scale}
		vec3 uLightVector ${duration => multiply([0, 1, 0], updateMatrix(light, duration, true))}
		gl_Position = uCameraProjection * vec4((uCameraMatrix * (vertex + position - uCameraPosition) + uCameraOffset) * uCameraScale, 1.0);
		gl_PointSize = pointSize / gl_Position.w;
		*vec4 vColor = color * intensity;
		${[...models].map(model => renderModel(model))}
		gl_FragColor = vColor;
	`;
}

export function shader () {
	return ['', null,
		['div', { style: { display: 'flex' } },
            ['div', { style: { flex: '1 0 0' } },
                test('renderScene simple', () => {
					const canvas = document.createElement('canvas');

					stew(canvas, null, renderScene({
						camera: {
							projection: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
							matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
							position: [0, 0, 0],
						},
						light: {
							matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
						},
						models: new Set([{
							vertexes: new Int8Array([0, 0, 0]),
							assets: new Set([{
								colors: new Uint8Array([0, 0, 0]),
								instances: new Set([{
									matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
									position: [0, 0, 0],
									offset: [0, 0, 0],
								}]),
							}]),
						}]),
					}));

					test.equals(canvas.innerText,
`#version 300 es
uniform mat3 uMatrix;
uniform vec3 uPosition;
uniform vec3 uOffset;
in uvec3 aColor;
uniform float uPointSize;
in ivec3 aVertex;
uniform mat4 uCameraProjection;
uniform mat3 uCameraMatrix;
uniform vec3 uCameraPosition;
uniform vec3 uCameraOffset;
uniform float uCameraScale;
uniform vec3 uLightVector;
out vec4 vColor;
void main() {
    vec3 vertex = uMatrix * (vec3(aVertex) + uOffset);
    vec3 position = uPosition;
    mat3 normalMatrix = uMatrix;
    float intensity = 1.0;
    vec4 color = vec4(aColor, 255) / 255.0;
    float pointSize = uPointSize;
    gl_Position = uCameraProjection * vec4((uCameraMatrix * (vertex + position - uCameraPosition) + uCameraOffset) * uCameraScale, 1.0);
    gl_PointSize = pointSize / gl_Position.w;
    vColor = color * intensity;
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
in vec4 vColor;
void main() {
    gl2_FragColor = vColor;
}`,
					);
				}),
			],
            ['div', { style: { flex: '1 0 0' } },
                test('renderScene complex', () => {
					const canvas = document.createElement('canvas');

					stew(canvas, null, renderScene({
						camera: {
							projection: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
							matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
							position: [0, 0, 0],
						},
						light: {
							matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
						},
						models: new Set([{
							elements: new Uint16Array([0]),
							vertexes: new Int8Array([0, 0, 0]),
							normals: new Int8Array([0, 0, 0]),
							assets: new Set([{
								colors: new Uint8Array([0, 0, 0]),
								instances: new Set([{
									matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
									position: [0, 0, 0],
									offset: [0, 0, 0],
									root: {
										matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
										position: [0, 0, 0],
										offset: [0, 0, 0],
									},
								}]),
							}]),
						}]),
					}));

					test.equals(canvas.innerText,
`#version 300 es
uniform mat3 uMatrix;
uniform vec3 uPosition;
uniform vec3 uOffset;
uniform mat3 uRootMatrix;
uniform vec3 uRootPosition;
uniform vec3 uRootOffset;
in uvec3 aColor;
uniform float uPointSize;
in ivec3 aVertex;
in ivec3 aNormal;
uniform mat4 uCameraProjection;
uniform mat3 uCameraMatrix;
uniform vec3 uCameraPosition;
uniform vec3 uCameraOffset;
uniform float uCameraScale;
uniform vec3 uLightVector;
out vec4 vColor;
void main() {
    vec3 vertex = uMatrix * (vec3(aVertex) + uOffset);
    vec3 position = uPosition;
    mat3 normalMatrix = uMatrix;
    vertex = uRootMatrix * (vertex + position + uRootOffset);
    position = uRootPosition;
    normalMatrix = uRootMatrix * normalMatrix;
    float intensity = 1.0;
    vec4 color = vec4(aColor, 255) / 255.0;
    float pointSize = uPointSize;
    vec3 normalVector = normalize(normalMatrix * vec3(aNormal));
    intensity = dot(normalize(uLightVector), normalVector) * 0.15 + 0.8;
    gl_Position = uCameraProjection * vec4((uCameraMatrix * (vertex + position - uCameraPosition) + uCameraOffset) * uCameraScale, 1.0);
    gl_PointSize = pointSize / gl_Position.w;
    vColor = color * intensity;
}
#version 300 es
precision mediump float;
out vec4 gl2_FragColor;
in vec4 vColor;
void main() {
    gl2_FragColor = vColor;
}`,
					);
				}),
			],
		],
	];
}

export default [shader, {
	'': 'Shader',
}];
