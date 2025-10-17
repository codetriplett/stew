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

	const children = [...sprites].map(([{ image, width, range, scale, offset, points }, instances]) => stew`
		int uWidth ${width}
		float uRange ${range}
		mat2 uSpriteScale ${scale}
		vec2 uSpriteOffset ${offset}
		UNSIGNED_BYTE uvec4 aPoint ${points}
		TEXTURE0 sampler2D uImage ${image}
		${instances.map(({ group = {}, position, offset, matrix }) => {
			const child = stew`
				mat3 uGroupMatrix ${group.matrix || identityMatrix}
				vec3 uGroupPosition ${group.position || identityPosition}
				vec3 uGroupOffset ${group.offset || identityPosition}
				mat3 uMatrix ${matrix || identityMatrix}
				vec3 uPosition ${position || identityPosition}
				vec3 uOffset ${offset || identityPosition}
				${gl => gl.drawArrays(gl.POINTS, 0, points.length >> 2)}
				vec4 uIntensity = vec4(1.0, 1.0, 1.0, 1.0);
				gl_FragColor = vec4(pixel.xyz, 1.0);
			`;

			const { light = {} } = group;

			return reference ? child : stew`
				//
				${[child]}
				mat3 uLightPosition ${light.position || identityMatrix}
				vec4 uLightShine ${light.shine || [1, 1, 1, 1]}
				vec4 uLightShade ${light.shade || [0.5, 0.5, 0.5, 1]}
				uIntensity = uLightShine;
			`;
		})}
		//
	`);

	const common = stew`
		elements ${elements}
		mat3 uCameraScale ${camera.scale}
		*vec3 vNormal = normalize(vec3(int(aPoint.w) / 16, int(aPoint.w) % 16, 8));
		vec3 vertex = vec3(aPoint.xy, int(aPoint.z) - 128);
		*vec4 pixel = texture(uImage, (vertex.xy + uSpriteOffset + 0.5) * uSpriteScale);
		gl_PointSize = 3.0; // also multiply by group, and instance scale matrixes
		${children}
		//
	`;

	// TODO: use normal to add shade
	// - normals are only needed when there is no reference, all others are UI-based, which lighting doesn't apply
	// - 

	return !reference ? stew`
		vec3 uCameraPosition ${camera.position}
		mat3 uCameraMatrix ${camera.matrix}
		vec3 position = uCameraMatrix * (uGroupMatrix * (uMatrix * (vertex + uOffset) + uGroupOffset) + uGroupPosition + uPosition) + uCameraPosition;
		gl_Position = vec4(uCameraScale * (floor(position * 2.0) + 0.5), 1.0);
		${update}
		${[common]}
		//
	` : reference === camera ? stew`
		vec3 position = uGroupMatrix * (uMatrix * (vertex + uOffset) + uGroupOffset) + uGroupPosition + uPosition;
		gl_Position = vec4(uCameraScale * (floor(position * 2.0 + 1.0) + 0.5), 1.0);
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
		gl_Position = vec4(uCameraScale * (floor(position * 2.0) + 0.5), 1.0);
		${update}
		${[common]}
		//
	`;

	// const children = [...sprites].map(([{ image, scale, coordinates }, instances]) => stew`
	// 	mat3 uScale ${scale}
	// 	FLOAT vec2 aCoordinate ${coordinates}
	// 	*vec2 vCoordinate = aCoordinate;
	// 	${instances.map(({ group = {}, position, offset, matrix }) => {
	// 		const child = stew`
	// 			mat3 uGroupMatrix ${group.matrix || identityMatrix}
	// 			vec3 uGroupPosition ${group.position || identityPosition}
	// 			vec3 uGroupOffset ${group.offset || identityPosition}
	// 			mat3 uMatrix ${matrix || identityMatrix}
	// 			vec3 uPosition ${position || identityPosition}
	// 			vec3 uOffset ${offset || identityPosition}
	// 			${gl => gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)}
	// 			vec4 uIntensity = vec4(1, 1, 1, 1);
	// 		`;

	// 		const { light = {} } = group;

	// 		return reference ? child : stew`
	// 			//
	// 			${[child]}
	// 			mat3 uLightPosition ${light.position || identityMatrix}
	// 			vec4 uLightShine ${light.shine || [1, 1, 1, 1]}
	// 			vec4 uLightShade ${light.shade || [0.5, 0.5, 0.5, 1]}
	// 			uIntensity = uLightShine;
	// 		`;
	// 	})}
	// 	TEXTURE0 sampler2D uImage ${image}
	// `);

	// // have spry sculptures use this same shader
	// // - they will use custom vertexes and normals instead of the defaults
	// // - maybe use the sculpture image as the texture image as well and have fragment shader find the index to read from palette that is also passed in
	// // - model should skip coordinates attribute array and instead calculate vCoordinate from x and y value
	// //   - separate the common, non-coordinate parts of children shader above simliar to how common was separated below

	// const common = stew`
	// 	BYTE vec3 aVertex ${vertexes}
	// 	elements ${elements}
	// 	mat3 uCameraScale ${camera.scale}
	// 	${children}
	// 	vec4 pixel = texture2D(uImage, vCoordinate);
	// 	gl_FragColor = vec4(pixel * uIntensity);
	// `;

	// // TODO: use normal to add shade
	// // - normals are only needed when there is no reference, all others are UI-based, which lighting doesn't apply
	// // - 

	// return !reference ? stew`
	// 	BYTE vec3 aNormal ${normals}
	// 	vec3 uCameraPosition ${camera.position}
	// 	mat3 uCameraMatrix ${camera.matrix}
	// 	float facing = dot(vec3(0.0, 0.0, 1.0) * uCameraMatrix * uGroupMatrix * uMatrix, normalize(aNormal));
	// 	if (facing < -0.25) {
	// 		return;
	// 	}
	// 	vec3 position = uCameraScale * floor(uCameraMatrix * (uGroupMatrix * (uMatrix * (uScale * aVertex + uOffset) + uGroupOffset) + uGroupPosition + uPosition) + uCameraPosition);
	// 	gl_Position = vec4(position, 1.0);
	// 	${update}
	// 	${[common]}
	// 	//
	// ` : reference === camera ? stew`
	// 	vec3 position = uCameraScale * floor(uGroupMatrix * (uMatrix * (uScale * aVertex + uOffset) + uGroupOffset) + uGroupPosition + uPosition);
	// 	gl_Position = vec4(position, 1.0);
	// 	${update}
	// 	${[common]}
	// 	//
	// ` : stew`
	// 	mat3 uCameraMatrix ${camera.matrix}
	// 	vec3 uCameraPosition ${camera.position}
	// 	mat3 uReferenceMatrix ${reference.matrix || identityMatrix}
	// 	vec3 uReferencePosition ${reference.position || identityPosition}
	// 	vec3 uReferenceOffset ${reference.offset || identityPosition}
	// 	vec3 position = uCameraScale * floor(uCameraMatrix * uReferenceMatrix * (uReferencePosition + uReferenceOffset) + (uGroupMatrix * (uMatrix * (uScale * aVertex + uOffset) + uGroupOffset) + uGroupPosition + uPosition) + uCameraPosition);
	// 	gl_Position = vec4(position, 1.0);
	// 	${update}
	// 	${[common]}
	// 	//
	// `;
}
