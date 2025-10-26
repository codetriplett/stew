// ```export async

function packDepths (front, back, shiftBits) {
	const thickness = back - front;
	const mask = 1 << shiftBits;
	const center = ((front + back - (thickness % 2)) >> 1) + (mask >> 1);
	return (thickness << shiftBits) + (center % mask);
}

function unpackDepths (byte, shiftBits) {
	const thickness = byte >> shiftBits;
	const half = thickness >> 1;
	const mask = 1 << shiftBits;
	const center = (byte % mask) - (mask >> 1);
	const front = center - half;
	const back = center + half + (thickness % 2);
	return [front, back];
}

function packNormal (xAlignment, yAlignment) {
	const [xNormal, yNormal] = [xAlignment, yAlignment].map(alignment => {
		if (alignment > -5 && alignment < 5) {
			return 4 + alignment;
		}

		return 12 - Math.round(16 / Math.max(-16, Math.min(16, alignment)));
	});

	return (xNormal << 4) + yNormal;
}

function unpackNormal (byte) {
	const xNormal = byte >> 4;
	const yNormal = byte % 16;
	const xAlignment = xNormal < 9 ? xNormal - 4 : 16 / (12 - xNormal);
	const yAlignment = yNormal < 9 ? yNormal - 4 : 16 / (12 - yNormal);
	return [xAlignment, yAlignment];
}

function calculateAlignment (before, after, crossBefore1, crossAfter1, crossBefore2, crossAfter2, farBefore, farAfter) {
	return  ((after - before) * 2) || Math.max(-2, Math.min(2, crossAfter1 + crossAfter2 + farAfter - crossBefore1 - crossBefore2 - farBefore));
}

function getDepths (pixels, y, index, yChange, xChange, smoothing) {
	const indexChange = xChange << 2;
	const depth = pixels[y][index];
	const before = pixels[y - yChange]?.[index - indexChange];
	const after = pixels[y + yChange]?.[index + indexChange];

	return [
		after ?? (smoothing ? depth + 16 : before === undefined ? depth : -before),
		before ?? (smoothing ? depth + 16 : after === undefined ? depth : -after),
	];
}

function getNormal (pixels, y, index, isBack, smoothing) {
	const [right, left] = getDepths(pixels, y, index, 0, 1, smoothing);
	const [top, bottom] = getDepths(pixels, y, index, 1, 0, smoothing);
	const [farRight, farLeft] = getDepths(pixels, y, index, 0, 2, smoothing);
	const [farTop, farBottom] = getDepths(pixels, y, index, 2, 0, smoothing);
	const [bottomRight, topLeft] = getDepths(pixels, y, index, -1, 1, smoothing);
	const [topRight, bottomLeft] = getDepths(pixels, y, index, 1, 1, smoothing);
	const normalX = calculateAlignment(left, right, bottomLeft, topRight, topLeft, bottomRight, farLeft, farRight);
	const normalY = calculateAlignment(bottom, top, bottomLeft, topRight, bottomRight, topLeft, farBottom, farTop);
	const normal = isBack ? packNormal(-normalX, -normalY) : packNormal(normalX, normalY);
	return [normal, Math[isBack ? 'min' : 'max'](left, right, bottom, top)];
}

export function addPoints (frontPoints, backPoints, frontColors, backColors, frontPixels, backPixels, x, y, smoothing, skipFiller) {
	const index = x << 2;
	const frontDepth = frontPixels[y]?.[index] ?? 256;
	const backDepth = backPixels[y]?.[index] ?? -256;

	if (frontDepth > 127 || backDepth < -128) {
		return;
	}

	let [frontNormal, frontFillDepth] = getNormal(frontPixels, y, index, false, smoothing);
	let [backNormal, backFillDepth] = getNormal(backPixels, y, index, true, smoothing);

	if (!skipFiller) {
		if (frontFillDepth > backFillDepth) {
			frontFillDepth = Math.ceil((frontDepth + backDepth) / 2);
			backFillDepth = frontFillDepth - 1;
		} else if (!smoothing) {
			frontFillDepth += 1;

			if (frontFillDepth <= backFillDepth) {
				backFillDepth -= 1;
			}
		}

		for (let z = frontDepth + 1; z < frontFillDepth; z++) {
			frontColors.push(...frontPixels[y].slice(index + 1, index + 4));
			frontPoints.push(x, y, z + 128, frontNormal);
		}

		for (let z = backFillDepth + 1; z < backDepth; z++) {
			backColors.push(...backPixels[y].slice(index + 1, index + 4));
			backPoints.push(x, y, z + 128, backNormal);
		}
	}

	frontColors.push(...frontPixels[y].slice(index + 1, index + 4));
	backColors.push(...backPixels[y].slice(index + 1, index + 4));
	frontPoints.push(x, y, frontDepth + 128, frontNormal);
	backPoints.push(x, y, backDepth + 128, backNormal);
}

// make depthBits optional and render squares with standard texture using coordinates if not provided
// - this will be useful for the rough shape of buildings, with sculpted sprites adding detail
// - have shader skip rendering fragments in flat image if the alpha value < 0.5
export async function loadSprites (imagePath, columnCount, rowCount, depthBits = 0, skipFiller) {
	const image = await new Promise(resolve => {
		const image = new window.Image();
		image.src = imagePath;
		image.onload = () => resolve(image);
	});
	
	const width = Math.floor(image.width / columnCount);
	const height = Math.floor(image.height / rowCount);
	const offset = [(1 - width) / 2, (1 - height) / 2, -127.5];
	const shiftBits = Math.min(Math.max(0, 8 - Math.floor(depthBits)), 8);
	const smoothing = Math.round((depthBits % 1) * 2);

	return new Promise(resolve => {
		const canvas = document.createElement('canvas');
		Object.assign(canvas, { width, height });
		const columnSpan = 1 / columnCount;
		const rowSpan = 1 / rowCount;
		const coordinates = new Float32Array([0, rowSpan, columnSpan, rowSpan, 0, 0, columnSpan, 0]);
		const pixels = new Uint8Array(width * height * 4);
		const sheet = [];
		let row;

		stew(canvas, null, stew`
			FLOAT vec2 aVertex ${new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])}
			FLOAT vec2 aCoordinate ${coordinates}
			elements ${new Uint16Array([2, 0, 1, 1, 3, 2])}
			gl_Position = vec4(aVertex, 0.0, 1.0);
			*vec2 vCoordinate = aCoordinate + uOffset;
			${Array(columnCount * rowCount).fill(0).map((_, i) => {
				const x = i % columnCount;
				const y = Math.floor(i / columnCount);

				return stew`
					vec2 uOffset ${[x * columnSpan, y * rowSpan]}
					${gl => {
						gl.clearColor(0.0, 0.0, 0.0, 0.0);
						gl.clear(gl.COLOR_BUFFER_BIT);
						gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
						gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
						const frontPixels = [];
						const backPixels = [];
						const frontColors = [];
						const backColors = [];
						const frontPoints = [];
						const backPoints = [];
						let index = 0;

						for (let y = 0; y < height; y++) {
							const frontRow = [];
							const backRow = [];
							frontPixels.push(frontRow);
							backPixels.push(backRow);

							for (let x = 0; x < width; x++) {
								const red = pixels[index];
								const green = pixels[index + 1];
								const blue = pixels[index + 2];
								const alpha = pixels[index + 3];
								const [front, back] = alpha ? unpackDepths(alpha, shiftBits) : [];
								frontRow.push(front, (red >> 4) * 17, (green >> 4) * 17, (blue >> 4) * 17);
								backRow.push(back, (red % 16) * 17, (green % 16) * 17, (blue % 16) * 17);
								index += 4;
							}
						}

						for (let y = 0; y < height; y++) {
							for (let x = 0; x < width; x++) {
								// TODO: allow adjusting x, y, and z with offset params passed after depthBits
								// - this allows for setting custom origin without needing to use another offset vector in shader
								addPoints(frontPoints, backPoints, frontColors, backColors, frontPixels, backPixels, x, y, smoothing, skipFiller);
							}
						}

						const front = {
							points: new Uint8Array(frontPoints),
							colors: new Uint8Array(frontColors),
						};

						const back = {
							points: new Uint8Array(backPoints),
							colors: new Uint8Array(backColors),
						};

						if (skipFiller) {
							front.pixels = frontPixels;
							back.pixels = backPixels;
						}
						
						if (x === 0) {
							row = [];
							sheet.push(row);
						}

						const sprite = { offset, smoothing, front, back };
						row.push(sprite);
					}}
					//
				`;
			})}
			${() => {
				resolve(sheet);
			}}
			TEXTURE0 sampler2D uImage ${image}
			gl_FragColor = texture(uImage, vCoordinate);
		`);
	});
}

// modeling tool should allow passing in a side profile that roughly carves out back and front
// - eventually it coudl be smart enough to map side profile colors to ones on the front and back to carve out more detail, instead of pixels in each row having the same depth

export function assetLoaders () {
	return ['div', { style: { display: 'flex' } },
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
		['div', { style: { flex: '1 0 0' } },
			test.group('packNormal', () => {
				test('0', () => {
					const actual = packNormal(0, 0);
					test.equals(actual, (4 << 4) + 4);
				});
				
				test('steep', () => {
					const actual = packNormal(28, 28);
					test.equals(actual, (11 << 4) + 11);
				});
			}),
		],
	];
}

export default [assetLoaders, {
	'': 'Asset Loaders',
}];
