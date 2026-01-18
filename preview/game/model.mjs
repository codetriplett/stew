import createMatrix from './matrix.mjs';

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

function calculateAlignment (before, after, crossBefore1, crossAfter1, crossBefore2, crossAfter2, farBefore, farAfter) {
	return  ((after - before) * 2) || Math.max(-2, Math.min(2, crossAfter1 + crossAfter2 + farAfter - crossBefore1 - crossBefore2 - farBefore));
}

function getDepths (points, map, y, x, yChange, xChange, offset) {
	const centerIndex = map[y][x];
	const beforeIndex = map[y - yChange]?.[x - xChange];
	const afterIndex = map[y + yChange]?.[x + xChange];
	const depth = points[centerIndex + offset];
	const before = points[beforeIndex + offset];
	const after = points[afterIndex + offset];

	return [
		after ?? ((depth << 1) - (before || 0)),
		before ?? ((depth << 1) - (after || 0)),
	];
}

function getNormal (vertexes, map, y, x, offset) {
	const [right, left] = getDepths(vertexes, map, y, x, 0, 1, offset);
	const [top, bottom] = getDepths(vertexes, map, y, x, 1, 0, offset);
	const [farRight, farLeft] = getDepths(vertexes, map, y, x, 0, 2, offset);
	const [farTop, farBottom] = getDepths(vertexes, map, y, x, 2, 0, offset);
	const [bottomRight, topLeft] = getDepths(vertexes, map, y, x, -1, 1, offset);
	const [topRight, bottomLeft] = getDepths(vertexes, map, y, x, 1, 1, offset);
	const normalX = calculateAlignment(left, right, bottomLeft, topRight, topLeft, bottomRight, farLeft, farRight);
	const normalY = calculateAlignment(bottom, top, bottomLeft, topRight, bottomRight, topLeft, farBottom, farTop);
	return offset > 2 ? [-normalX, -normalY, 8] : [normalX, normalY, -8];
}

function getFiller (vertexes, map, y, x) {
	const leftIndex = map[y][x - 1];
	const rightIndex = map[y][x + 1];
	const bottomIndex = map[y - 1]?.[x];
	const topIndex = map[y + 1]?.[x];
	const centerIndex = map[y][x];
	const frontDepth = vertexes[centerIndex + 2];
	const backDepth = vertexes[centerIndex + 5];

	if (!leftIndex || !rightIndex || !bottomIndex || !topIndex) {
		const frontFillDepth = Math.ceil((frontDepth + backDepth) / 2);
		const backFillDepth = frontFillDepth - 1;
		return [frontDepth, frontFillDepth, backFillDepth, backDepth];
	}

	return [
		frontDepth,
		Math.max(...[leftIndex, rightIndex, bottomIndex, topIndex].map(index => vertexes[index + 2])),
		Math.min(...[leftIndex, rightIndex, bottomIndex, topIndex].map(index => vertexes[index + 5])),
		backDepth,
	];
}

function patchPart (part, map, xOffset, yOffset) {
	const { vertexes, normals, assets } = part;
	const fullLength = vertexes.length * 6;
	const newVertexes = [];
	const newNormals = [];
	const newColors = Array(assets.length).fill(0).map(() => []);

	for (const [y, row] of map.entries()) {
		for (const [x, index] of row.entries()) {
			if (index === undefined) {
				continue;
			}
			
			const [frontDepth, frontFillDepth, backFillDepth, backDepth] = getFiller(vertexes, map, y, x);
			const frontNormal = getNormal(vertexes, map, y, x, 2);
			const backNormal = getNormal(vertexes, map, y, x, 5);
			const fillNormalDepth = backFillDepth < frontFillDepth ? 2 : 8;
			const vertexX = x - xOffset;
			const vertexY = y - yOffset;
			normals.set(frontNormal, index);
			normals.set(backNormal, index + 3);

			// TODO: interpolate normals for more accuracy, if it seems worthwhile

			for (let z = frontDepth + 1; z <= frontFillDepth; z++) {
				newVertexes.push(vertexX, vertexY, z);
				newNormals.push(frontNormal[0], frontNormal[1], -fillNormalDepth);

				for (const [i, asset] of assets.entries()) {
					const { colors } = asset;
					newColors[i].push(...colors.slice(index, index + 3));
				}
			}

			for (let z = backFillDepth; z < backDepth; z++) {
				newVertexes.push(vertexX, vertexY, z);
				newNormals.push(backNormal[0], backNormal[1], fillNormalDepth);

				for (const [i, asset] of assets.entries()) {
					const { colors } = asset;
					newColors[i].push(...colors.slice(index + 3, index + 6));
				}
			}
		}
	}

	Object.assign(part, {
		vertexes: new Uint8Array([...vertexes.slice(0, fullLength), ...newVertexes]),
		normals: new Int8Array([...normals.slice(0, fullLength), ...newNormals]),
	});

	for (const [i, asset] of assets.entries()) {
		const { colors } = asset;
		asset.colors = new Uint8Array([...colors.slice(0, fullLength), ...newColors[i]]);
	}

	return part;
}

const canvas = document.createElement('canvas');
// document.body.appendChild(canvas);

export async function loadModel (modelName, skeleton) {
	skeleton = { '': [0, 0, 0, 1, ''], ...skeleton };
	const entries = Object.entries(skeleton);
	const parts = Object.fromEntries(entries.map(([name]) => [name, { children: {} }]));
	const root = parts[''];
	const scale = skeleton[''][3] / 40;
	const queue = [];
	let maxWidth = 0;
	let maxHeight = 0;

	for (const [name, array] of entries) {
		const [x, y, z, depthBits, parentName, ...rest] = array;
		const part = parts[name];
		part.position = [x * scale, y * scale, z * scale];

		if (!name) {
			Object.assign(part, {
				name: modelName,
				boundary: rest.length >= 6 ? rest.slice(0, 6) : undefined,
				scale: depthBits,
				assets: [{
					name: parentName,
					index: 0,
					instances: new Set(),
				}],
			});

			continue;
		}
		
		const [centerX, centerY, centerZ, ...constraint] = rest;
		const parent = parts[parentName];
		queue.push([name, depthBits, centerX, centerY, centerZ]);
		Object.assign(part, { root, scale });
		parent.children[name] = part;
		parts[name] = part;
		
		if (constraint.length) {
			const [tilt, rotation = 0] = constraint;
			part.matrix = createMatrix(tilt, rotation, 0, true);
			part.inverse = createMatrix(-tilt, -rotation, 0);
		}
	}

	await Promise.all(queue.map(array => new Promise(resolve => {
		const [name,,, y] = array;
		const image = new Image();
		image.src = `${name}.png`;

		image.onload = () => {
			const { width, height } = image;

			if (width > maxWidth) {
				maxWidth = width;
			}

			if (height > maxHeight) {
				maxHeight = height;
			}

			array[3] = height - y;
			array[5] = image;
			resolve();
		};
	})));
	
	Object.assign(canvas, { width: maxWidth, height: maxHeight });

	return new Promise(resolve => {
		stew(canvas, null, stew`
			FLOAT vec2 aVertex ${new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])}
			elements ${new Uint16Array([2, 0, 1, 1, 3, 2])}
			gl_Position = vec4(aVertex, 0.0, 1.0);
			*vec2 vCoordinate = aCoordinate;
			${queue.map(([name, depthsBits, centerX, centerY, centerZ, image], i) => {
				const shiftBits = 8 - Math.max(0, Math.min(8, Math.floor(depthsBits)));
				const { width, height } = image;
				const pixels = new Uint8Array(width * height * 4);
				const xCoord = maxWidth / width;
				const yCoord = 1 - maxHeight / height;

				return stew`
					FLOAT vec2 aCoordinate ${new Float32Array([0, 1, xCoord, 1, 0, yCoord, xCoord, yCoord])}
					${gl => {
						gl.clearColor(0.0, 0.0, 0.0, 0.0);
						gl.clear(gl.COLOR_BUFFER_BIT);
						gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
						gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
						const vertexes = [];
						const colors = [];
						const map = [];
						let index = 0;

						for (let y = 0; y < height; y++) {
							const mapRow = [];
							map.push(mapRow);

							for (let x = 0; x < width; x++) {
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
								const xVertex = x - centerX;
								const yVertex = y - centerY;
								mapRow[x] = vertexes.length;
								vertexes.push(xVertex, yVertex, front - centerZ, xVertex, yVertex, back - centerZ);
								colors.push(...color.map(value => (value >> 4) * 17), ...color.map(value => (value % 16) * 17));
							}
						}

						patchPart(Object.assign(parts[name], {
							index: i,
							pointSize: 1 + (depthsBits % 1),
							vertexes: new Int8Array(vertexes),
							normals: new Int8Array(vertexes.length),
							assets: [{
								colors: new Uint8Array(colors),
								instances: new Set(),
							}],
						}), map, centerX, centerY);
					}}
					TEXTURE0 sampler2D uImage ${image}
				`;
			})}
			${() => {
				const models = Object.values(parts);
				resolve(models);
			}}
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
				test.group('calculateAlignment', () => {
					test('flat', () => {
						const actual = calculateAlignment(0, 0, 0, 0, 0, 0, 0, 0);
						test.equals(actual, 0);
					});
					
					test('steep', () => {
						const actual = calculateAlignment(-7, 7, 0, 0, 0, 0, 0, 0);
						test.equals(actual, 28);
					});
				}),
			],
			// ['div', { style: { flex: '1 0 0' } },
			// 	test.group('packNormal', () => {
			// 		test('0', () => {
			// 			const actual = packNormal(0, 0);
			// 			test.equals(actual, (4 << 4) + 4);
			// 		});
					
			// 		test('steep', () => {
			// 			const actual = packNormal(28, 28);
			// 			test.equals(actual, (11 << 4) + 11);
			// 		});
			// 	}),
			// ],
		],
		['div', { style: { display: 'flex' } },
			['div', { style: { flex: '1 0 0' } },
				test.group.only('loadModel', () => {
					test('human', async () => {
						const actual = await loadModel('human', {
							'': [0, 62, 0, 2, 'base', -0.25, 0, -0.75, 0.25, 2, -0.25],
							'lower-torso': [0, 0, 0, 5, '', 10, 1, 0],
							'left-thigh': [5, -11, 0, 5, 'lower-torso', 6, 1, 1],
							'left-calf': [0, -24, -2, 5, 'left-thigh', 4, 2, -2, 0, Math.PI / 2],
							'left-foot': [0, -19, 1, 5, 'left-calf', 4, 0, 2],
							'right-thigh': [-5, -11, 0, 5, 'lower-torso', 5, 1, 1],
							'right-calf': [0, -24, -2, 5, 'right-thigh', 4, 2, -2, 0, -Math.PI / 2],
							'right-foot': [0, -19, 1, 5, 'right-calf', 5, 0, 2],
							'upper-torso': [0, 0, 0, 5, '', 9, 21, 0],
							'hair': [0, 11, -4, 5, 'head', 6, 5, -7],
							'head': [0, 21, 1, 5, 'upper-torso', 6, 15, 0],
							'ponytail': [0, 2, 8, 5, 'hair', 4, 5, -6],
							'left-shoulder': [8, 16, 1, 5, 'upper-torso', 3, 3, -3],
							'left-forearm': [2, -16, 4, 5, 'left-shoulder', 3, 3, 0, -0.15, Math.PI / 2],
							'left-hand': [2, -12, -2, 5, 'left-forearm', 3, 0, 1],
							'right-shoulder': [-8, 16, 1, 5, 'upper-torso', 6, 3, -3],
							'right-forearm': [-2, -16, 4, 5, 'right-shoulder', 4, 3, 0, -0.15, -Math.PI / 2],
							'right-hand': [-2, -12, -2, 5, 'right-forearm', 3, 0, 1],
						});

						// TODO: modify loadModel to return this format
						// - linkInstance needs to be modified to automatically add geometries to scene if they are the first, and remove them if they are the last
						// - this is the skeleton that is passed to createInstance to create instance references for each part
						test.equals(actual, {
							'lower-torso': {
								index: 0,
								pointSize: 1,
								// TODO: add this helper
								// - first param is type check (if not an object), second is subset of properties properties (if first wasn't)
								// - remaining params are just checking if there is a match of each anyware in the array (if it is an array)
								vertexes: test.contains(Int8Array, { length: 100 }),
								normals: test.contains(Int8Array, { length: 100 }),
								assets: [
									test.contains({
										colors: test.contains(Uint8Array, { length: 100 }),
										instances: test.contains(Set, { size: 0 }),
									}),
								],
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
