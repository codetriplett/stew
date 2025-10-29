import createMatrix from '/game/matrix.mjs';

function updateAnimation (animation, elapsed, target) {
	let [physics, reference = target, value] = animation;
	let duration = physics[6] || 0;
	let cumulativeElapsed = (physics[7] || 0) + elapsed;
	physics[7] = cumulativeElapsed;

	while (value) {
		if (!Array.isArray(value)) {
			let sequence = [];

			if (typeof value === 'function') {
				sequence = value(reference, physics);
			} else {
				duration = value;
				physics[6] = duration;
			}

			animation.splice(2, 1, ...sequence);
		} else {
			const [ax, ay, az, ahx = 0, ahy = 0, ahz = 0] = reference;
			const [bx, by, bz, bhx = 0, bhy = 0, bhz = 0] = value;
			const progress = cumulativeElapsed / duration;

			if (progress < 1) {
				const remainder = 1 - progress;

				reference = [
					(ax + ahx * progress) * remainder + (ax + bx + -bhx * remainder) * progress,
					(ay + ahy * progress) * remainder + (ay + by + -bhy * remainder) * progress,
					(az + ahz * progress) * remainder + (az + bz + -bhz * remainder) * progress,
				];

				break;
			}

			cumulativeElapsed -= duration;
			physics[7] = cumulativeElapsed;
			reference = [ax + bx, ay + by, az + bz, bhx, bhy, bhz];
			animation.splice(1, 2, reference);
		}

		value = animation[2];
	}

	for (let i = 0; i < 3; i++) {
		physics[i] += physics[i + 3] * elapsed;
		target[i] = reference[i] + physics[i] * elapsed;
	}

	return target;
}

// on each group
// light: [0, 1, 0] // position of light
// shine: [1, 1, 1, 1] // percentage of each channel to keep from texture (full strength when pointing toward light vector)
// shade: [0.5, 0.5, 0.5, 1] // percentage of each channel to keep from texture (full strength when pointing away from light vector)
export function shader ({ '': context, points, colors, reference, callback }, ...instances) {
	const { camera, vertexes, normals, elements, record = new Set() } = context;
	const identityMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
	const identityPosition = [0, 0, 0];
	const sprites = new Map();
	const animatedInstances = new Set();
	const isFixed = reference === camera;
	
	const [pixels, cameraScale] = stew(() => {
		return [
			new Uint8Array(4 * 4 * 4),
			callback ? [1 / 4, 0, 0, 0, 1 / 4, 0, 0, 0, camera.scale?.[8] || 1] : camera.scale,
		];
	}, [callback]);

	if (camera.animations) {
		animatedInstances.add(camera);
	}

	for (const instance of instances) {
		const { sprite, group, animations } = instance;

		if (!sprite) {
			continue;
		} else if (!sprites.has(sprite)) {
			sprites.set(sprite, []);
		}

		if (group?.animations) {
			animatedInstances.add(group);
		}

		if (animations) {
			animatedInstances.add(instance);
		}

		sprites.get(sprite).push(instance);
	}

	const children = [...sprites].map(([{ offset, smoothing = 0, vertexes, normals, colors }, instances]) => {
		const children = instances.map(({ group = {}, position, offset, scale, matrix }) => {
			const child = stew`
				mat3 uGroupScale ${group.scale || identityMatrix}
				mat3 uGroupMatrix ${group.matrix || identityMatrix}
				vec3 uGroupPosition ${group.position || identityPosition}
				vec3 uGroupOffset ${group.offset || identityPosition}
				mat3 uScale ${scale || identityMatrix}
				mat3 uMatrix ${matrix || identityMatrix}
				vec3 uPosition ${position || identityPosition}
				vec3 uOffset ${offset || identityPosition}
				float uPointSize ${(2 + smoothing) * (scale ? Math.max(...scale) : 1) * (group.scale ? Math.max(...group.scale) : 1)}
				float pointSize = uPointSize;
				vec3 color = vec3(aColor) / 255.0;
				${gl => gl.drawArrays(gl.POINTS, 0, vertexes.length / 3)}
				//
			`;

			const { light } = group;

			return !light ? child : stew`
				mat3 uLightPosition ${light.position || identityMatrix}
				vec4 uLightShine ${light.shine || [1, 1, 1, 1]}
				vec4 uLightShade ${light.shade || [0.5, 0.5, 0.5, 1]}
				// TODO: calculate light direction from distance vector between them, then normalize
				float intensity = 0.5 + dot(normalize(vec3(0.0, 0.0, -1.0)), normalize(vec3(aNormal))) * 0.5;
				// color = color * intensity;
				${[child]}
				//
			`;
		});

		return stew`
			vec3 uSpriteOffset ${offset}
			UNSIGNED_BYTE uvec3 aVertex ${vertexes}
			BYTE ivec3 aNormal ${normals}
			UNSIGNED_BYTE uvec3 aColor ${colors}
			float alpha = 1.0;
			${children}
			//
		`;
	});

	let program = stew`
		mat3 uCameraScale ${cameraScale || identityMatrix}
		vec3 uCameraOffset ${!isFixed && camera.offset || identityPosition}
		float uCameraZoom ${!isFixed ? camera : { zoom: 1 }} zoom
		vec3 vertex = vec3(aVertex) + uSpriteOffset;
		float pointOffset = mod(pointSize, 2.0) * 0.5;
		vec3 position = uGroupMatrix * (uMatrix * (vertex + uOffset) + uGroupOffset) + uGroupPosition + uPosition;
		${children}
		//
	`;

	if (!isFixed) {
		program = stew`
			mat3 uCameraMatrix ${camera.matrix || identityMatrix}
			vec3 uCameraPosition ${camera.position || identityPosition}
			position = uCameraMatrix * position + uCameraPosition;
			pointSize = pointSize * uCameraZoom;
			${[program]}
			//
		`;
		
		if (reference) {
			program = stew`
				mat3 uReferenceMatrix ${reference.matrix || identityMatrix}
				vec3 uReferencePosition ${reference.position || identityPosition}
				vec3 uReferenceOffset ${reference.offset || identityPosition}
				position = uReferenceMatrix * (uReferencePosition + uReferenceOffset) + position;
				${[program]}
				//
			`;
		}
	}

	if (callback) {
		program = stew`
			// const gl_VertexID
			color = vec3(1.0, 1.0, 1.0);
			alpha = 0.5;
			${[program]}
			//
		`;
	}

	return stew`
		gl_Position = vec4(uCameraScale * (floor(uCameraZoom * position * 2.0 + uCameraOffset * 2.0) + pointOffset), 1.0);
		gl_PointSize = pointSize;
		*vec4 vColor = vec4(color, alpha);
		${(gl, elapsed) => {
			if (callback) {
				return;
			}

			for (const instance of animatedInstances) {
				if (record.has(instance)) {
					continue;
				}

				record.add(instance);

				for (const [name, animation] of Object.entries(instance.animations)) {
					const array = instance[name];
					updateAnimation(animation, elapsed, array);

					if (name === 'angles') {
						camera.matrix.splice(0, 9, ...createMatrix(...array));
					}
				}
			}
		}}
		${[program]}
		${gl => {
			if (!callback) {
				return;
			}

			gl.readPixels(0, 0, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

			try {
				callback(pixels);
			} catch (err) {
				console.error(err);
			}
		}}
		gl_FragColor = vColor;
	`;
}
