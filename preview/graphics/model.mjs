import { createMatrix } from './matrix.mjs';
import { patchModel } from './patch.mjs';

export const models = new Set();

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

export function packDepths (front, back, shiftBits) {
	const thickness = back - front;
	const mask = 1 << shiftBits;
	const center = ((front + back - (thickness % 2)) >> 1) + (mask >> 1);
	return (thickness << shiftBits) + (center % mask);
}

export function unpackDepths (byte, shiftBits) {
	const thickness = byte >> shiftBits;
	const half = thickness >> 1;
	const mask = 1 << shiftBits;
	const center = (byte % mask) - (mask >> 1);
	const front = center - half;
	const back = center + half + (thickness % 2);
	return [front, back];
}

export async function loadSkeleton (skeleton) {
	const { '': imageName, ...jointDefinitions } = skeleton;

	if (!imageName) {
		return;
	}

	const image = new Image();
	image.src = `${imageName}${/\.[a-z]+$/.test(imageName) ? '' : '.png'}`;

	const { width, height } = await new Promise(resolve => {
		image.onload = () => resolve(image);
	});
	
	const joints = Object.fromEntries(Object.keys(skeleton).map(name => [name, { children: {} }]));
	const pixels = new Uint8Array(width * height * 4);
	const canvas = document.createElement('canvas');

	return new Promise(resolve => {
		stew(canvas, { width, height }, stew`
			FLOAT vec2 aVertex ${new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])}
			FLOAT vec2 aCoordinate ${new Float32Array([0, 1, 1, 1, 0, 0, 1, 0])}
			elements ${new Uint16Array([2, 0, 1, 1, 3, 2])}
			gl_Position = vec4(aVertex, 0.0, 1.0);
			*vec2 vCoordinate = aCoordinate;
			${gl => {
				gl.clearColor(0.0, 0.0, 0.0, 0.0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
				gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

				for (const [name, array] of Object.entries(jointDefinitions)) {
					const [
						xCenter, yCenter, zCenter, left, top, right, bottom, depthBits,
						parentName = '', xPosition = 0, yPosition = 0, zPosition = 0, ...constraint
					] = array;

					const x1 = xCenter - left;
					const x2 = xCenter + right;
					const y1 = yCenter - top;
					const y2 = yCenter + bottom;
					const shiftBits = 8 - depthBits;
					const joint = joints[name];
					const parent = joints[parentName];
					const vertexes = [];
					const colors = [];

					for (let y = y1; y <= y2; y++) {
						let index = y * width * 4 + x1;

						for (let x = x1; x <= x2; x++) {
							const red = pixels[index];
							const green = pixels[index + 1];
							const blue = pixels[index + 2];
							const alpha = pixels[index + 3];
							index += 4;

							if (!alpha) {
								continue;
							}

							const color = [red, green, blue];
							const [front, back] = unpackDepths(alpha, shiftBits);
							const xVertex = x - xCenter;
							const yVertex = y - yCenter;
							vertexes.push(xVertex, yVertex, front - zCenter, xVertex, yVertex, back - zCenter);
							colors.push(...color.map(value => (value >> 4) * 17), ...color.map(value => (value % 16) * 17));
						}
					}

					joint.asset = {
						colors: new Uint8Array(colors),
						instances: new Set(),
						model: {
							vertexes: new Int8Array(vertexes),
							assets: new Set(),
						},
					}
					
					joint.position = [xPosition, yPosition, zPosition];
					// patchModel(joint);
					
					if (constraint.length) {
						const [tilt, rotation = 0] = constraint;
						joint.matrix = createMatrix(tilt, rotation, 0, true);
						joint.inverse = createMatrix(-tilt, -rotation, 0);
					}

					if (parent) {
						parent.children[name] = joint;
					}
				}

				resolve(joints[''].children);
			}}
			TEXTURE0 sampler2D uImage ${image}
			gl_FragColor = texture(uImage, vCoordinate);
		`);
	});
}

export function model () {
	return ['', null,
		['div', { style: { display: 'flex' } },
			['div', { style: { flex: '1 0 0' } },
				test.group('unpackDepths', () => {
					test('255:3', () => {
						const actual = unpackDepths(255, 3);
						test.equals(actual, [-12, 19]);
					});
				}),
			],
			['div', { style: { flex: '1 0 0' } },
				test.group('loadModel', () => {
					test('human', async () => {
						// TODO: have assets be the primary assets that are linked
						// - manage active models in background
						// - allow skeleton to reference existing assets that have already loaded
						//   - if object, assume preloaded part, otherwise create new, maybe use array as key to reuse ones
						//   - this way it would only load the first time that array is referenced
						const actual = await loadSkeleton({
							'': '/graphics/person',
							// [x1, y1, x2, y2, zInverted, centerX, centerY, centerZ, parentName, offsetX, offsetY, offsetZ, constraintX, constraintY]
							// - can invert in x or y directions by putting larger number first in that direction (no need to flip if both the same)
							// - x2 and y2 are inclusive of that row column or row (e.g. 0 -> 1 means the first and second column, and 0 -> 0 means only the first column)
							lowerTorso: [34, 25, 0, 10, 1, 10, 16, 5],
							upperTorso: [53, 40, 0, 9, 20, 9, 1, 5],
							head: [18, 40, 0, 6, 16, 6, 1, 5, 'upperTorso', 0, 21, 1, 0, Math.PI / 2],
						});
						// TODO: allow passing in a png to create asset variations from a given model
						// - maybe these would need to be given upfront, so it can relate their pixel positions to the vertices it adds to the typed arrays
						// - alpha channel could be used to blend between base and paint, e.g. markings, dirt, rust

						test.equals(actual, {
							lowerTorso: {
								position: [0, 0, 0],
								asset: {
									colors: test.any(Uint8Array, { length: 2196 }),
									instances: test.any(Set, { size: 0 }),
									model: {
										vertexes: test.any(Int8Array, { length: 2196 }),
										// normals: test.any(Int8Array, { length: 3153 }),
										assets: test.any(Set, { size: 0 }),
									},
								},
								children: {},
							},
							upperTorso: {
								position: [0, 0, 0],
								asset: {
									colors: test.any(Uint8Array, { length: 2508 }),
									instances: test.any(Set, { size: 0 }),
									model: {
										vertexes: test.any(Int8Array, { length: 2508 }),
										// normals: test.any(Int8Array, { length: 3636 }),
										assets: test.any(Set, { size: 0 }),
									},
								},
								children: {
									head: {
										position: [0, 21, 1],
										matrix: [6.123233995736766e-17, 0, -1, 0, 1, 0, 1, 0, 6.123233995736766e-17],
										inverse: [6.123233995736766e-17, 0, 1, 0, 1, 0, -1, 0, 6.123233995736766e-17],
										asset: {
											colors: test.any(Uint8Array, { length: 1098 }),
											instances: test.any(Set, { size: 0 }),
											model: {
												vertexes: test.any(Int8Array, { length: 1098 }),
												// normals: test.any(Int8Array, { length: 1980 }),
												assets: test.any(Set, { size: 0 }),
											},
										},
										children: {},
									},
								},
							},
						});
					});
				}),
			],
		],
	];
}

export default [model, {
	'': 'Model',
}];
