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
		vec3 vertex = uMatrix * (vec3(aVertex) * uVertexScale + uOffset);
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
	const { vertexes, elements, assets } = model;

	const draw = elements
		? gl => gl.drawElements(gl.TRIANGLES, elements.length, gl.UNSIGNED_SHORT, 0)
		: gl => gl.drawArrays(gl.POINTS, 0, vertexes.length / 3);

	const subprograms = [...assets].map(asset => renderAsset(asset, draw));

	const program = elements ? stew`
		FLOAT vec3 aVertex ${vertexes}
		elements ${elements}
		float uVertexScale ${scale}
		float pointSize = 1.0;
		${subprograms}
	` : stew`
		BYTE ivec3 aVertex ${vertexes}
		float uVertexScale ${scale}
		float uPointSize ${40 * scale * pointSize * (pointSize < 1 ? 2.25 : 3)}
		float pointSize = uPointSize;
		${subprograms}
	`;

	return !normals ? program : stew`
		BYTE ivec3 aNormal ${normals}
		vec3 normalVector = normalize(normalMatrix * vec3(aNormal));
		intensity = dot(normalize(uLightVector), normalVector) * 0.15 + 0.8;
		${[program]}
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
	return ['', null, 'Shader'];
}

export default [shader, {
	'': 'Shader',
}];
