import createMatrix from '/cosmic-chord/matrix-math.mjs';

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
export default function shader ({ '': context, points, colors, reference }, ...instances) {
	const { camera, vertexes, normals, elements, record = new Set() } = context;
	const identityMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
	const identityPosition = [0, 0, 0];
	const sprites = new Map();
	const animatedInstances = new Set();

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

	const update = (gl, elapsed) => {
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
	};
	
	// TEXTURE0 usampler2D uImage ${image}
	// *vec4 pixel = texture(uImage, (vec2(aPoint.xy) + uSpriteCoordinates + 0.5) * uSpriteScale);

	const children = [...sprites].map(([{ offset, smoothing = 0, front, back }, instances]) => stew`
		vec3 uSpriteOffset ${offset}
		${[front, back].map(({ points, colors }, i) => stew`
			UNSIGNED_BYTE uvec4 aPoint ${points}
			UNSIGNED_BYTE uvec3 aColor ${colors}
			*vec3 color = vec3(aColor) / 255.0;
			int uNormalZ ${i ? -8 : 8}
			${instances.map(({ group = {}, position, offset, scale, matrix }) => {
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
					float uPointOffset ${(smoothing % 2) * 0.5}
					${gl => gl.drawArrays(gl.POINTS, 0, points.length >> 2)}
					gl_FragColor = vec4(color * vIntensity, 1.0);
				`;

				const { light = {} } = group;

				return reference ? child : stew`
					//
					${[child]}
					mat3 uLightPosition ${light.position || identityMatrix}
					vec4 uLightShine ${light.shine || [1, 1, 1, 1]}
					vec4 uLightShade ${light.shade || [0.5, 0.5, 0.5, 1]}
				`;
			})}
			//
		`)}
		//
	`);

	// TODO: add facing check to each point to see if it should even be rendered (dot product with camera vector)
	const common = stew`
		elements ${elements}
		mat3 uCameraScale ${camera.scale}
		// TODO: have x and y normal pass through pow(abs(x), 2), then apply sign back
		vec3 vNormal = normalize(vec3((int(aPoint.w) / 16) - 8, (int(aPoint.w) % 16) - 8, uNormalZ));
		*float vIntensity = 0.5 + dot(normalize(vec3(1.0, 1.0, 1.0)), vNormal) * 0.5;
		vec3 vertex = vec3(aPoint.xyz) + uSpriteOffset;
		gl_PointSize = uPointSize;
		${children}
		//
	`;

	// TODO: use normal to add shade
	// - x and y normals are pack into single byte, and range from -8 to 7
	// - these are angles in (Math.PI / 7) increments away from z axis
	// - have light give intensity as well as color that fades with distance
	// - -8 is reserved for glow effect, where color isn't dimmed if facing away from light source

	return !reference ? stew`
		vec3 uCameraPosition ${camera.position}
		mat3 uCameraMatrix ${camera.matrix}
		vec3 position = uCameraMatrix * (uGroupMatrix * (uMatrix * (vertex + uOffset) + uGroupOffset) + uGroupPosition + uPosition) + uCameraPosition;
		gl_Position = vec4(uCameraScale * (floor(position * 2.0) + uPointOffset), 1.0);
		${update}
		${[common]}
		//
	` : reference === camera ? stew`
		vec3 position = uGroupMatrix * (uMatrix * (vertex + uOffset) + uGroupOffset) + uGroupPosition + uPosition;
		gl_Position = vec4(uCameraScale * (floor(position * 2.0) + uPointOffset), 1.0);
		${update}
		${[common]}
		//
	` : stew`
		mat3 uCameraMatrix ${camera.matrix}
		vec3 uCameraPosition ${camera.position}
		mat3 uReferenceMatrix ${reference.matrix || identityMatrix}
		vec3 uReferencePosition ${reference.position || identityPosition}
		vec3 uReferenceOffset ${reference.offset || identityPosition}
		vec3 position = uCameraMatrix * uReferenceMatrix * (uReferencePosition + uReferenceOffset) + (uGroupMatrix * (uMatrix * (vertex + uOffset) + uGroupOffset) + uGroupPosition + uPosition) + uCameraPosition;
		gl_Position = vec4(uCameraScale * (floor(position * 2.0) + uPointOffset), 1.0);
		${update}
		${[common]}
		//
	`;
}
