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

function getDepths (points, map, y, x, yChange, xChange, smoothing) {
	const depth = points[map[y][x]];
	const before = points[map[y - yChange]?.[x - xChange]];
	const after = points[map[y + yChange]?.[x + xChange]];

	return [
		after ?? (smoothing ? depth + 16 : (depth << 1) - (before || 0)),
		before ?? (smoothing ? depth + 16 : (depth << 1) - (after || 0)),
	];
}

function getNormal (points, map, y, x, isBack, smoothing) {
	const [right, left] = getDepths(points, map, y, x, 0, 1, smoothing);
	const [top, bottom] = getDepths(points, map, y, x, 1, 0, smoothing);
	const [farRight, farLeft] = getDepths(points, map, y, x, 0, 2, smoothing);
	const [farTop, farBottom] = getDepths(points, map, y, x, 2, 0, smoothing);
	const [bottomRight, topLeft] = getDepths(points, map, y, x, -1, 1, smoothing);
	const [topRight, bottomLeft] = getDepths(points, map, y, x, 1, 1, smoothing);
	const normalX = calculateAlignment(left, right, bottomLeft, topRight, topLeft, bottomRight, farLeft, farRight);
	const normalY = calculateAlignment(bottom, top, bottomLeft, topRight, bottomRight, topLeft, farBottom, farTop);
	return isBack ? packNormal(-normalX, -normalY) : packNormal(normalX, normalY);
}

// TODO: call this to update all points in 5x5 grid with x:y at its center
function patchNormal (face, map, smoothing, x, y) {

}

function getFiller (frontPoints, backPoints, map, y, x) {
	const leftIndex = map[y][x - 1];
	const rightIndex = map[y][x + 1];
	const bottomIndex = map[y - 1]?.[x];
	const topIndex = map[y + 1]?.[x];
	const centerIndex = map[y][x];
	const frontDepth = frontPoints[centerIndex];
	const backDepth = backPoints[centerIndex];

	if (!leftIndex || !rightIndex || !bottomIndex || !topIndex) {
		const frontFillDepth = Math.ceil((frontDepth + backDepth) / 2);
		const backFillDepth = frontFillDepth - 1;
		return [frontDepth, frontFillDepth, backFillDepth, backDepth];
	}

	return [
		frontDepth,
		Math.max(...[leftIndex, rightIndex, bottomIndex, topIndex].map(index => frontPoints[index])),
		Math.min(...[leftIndex, rightIndex, bottomIndex, topIndex].map(index => backPoints[index])),
		backDepth,
	];
}

export function patchSprite (sprite) {
	const { front, back, map, smoothing } = sprite;
	const { points: frontPoints, colors: frontColors } = front;
	const { points: backPoints, colors: backColors } = back;
	const fillerPoints = [];
	const fillerColors = [];

	for (const [y, row] of map.entries()) {
		for (const [x, index] of row.entries()) {
			const [frontDepth, frontFillDepth, backFillDepth, backDepth] = getFiller(frontPoints, backPoints, map, y, x);
			const frontNormal = getNormal(frontPoints, map, y, x, false, smoothing);
			const backNormal = getNormal(backPoints, map, y, x, true, smoothing);

			for (let z = frontDepth + 1; z < frontFillDepth; z++) {
				fillerPoints.push(x, y, z, frontNormal);
				fillerColors.push(...frontColors.slice(index - 2, index + 2));
			}

			for (let z = backFillDepth + 1; z < backDepth; z++) {
				fillerPoints.push(x, y, z, backNormal);
				fillerColors.push(...backColors.slice(index - 2, index + 2));
			}

			frontPoints[index + 1] = frontNormal;
			backPoints[index + 1] = backNormal;
		}
	}

	sprite.filler = {
		points: new Uint8Array(fillerPoints),
		colors: new Uint8Array(fillerColors),
	};
}

// make depthBits optional and render squares with standard texture using coordinates if not provided
// - this will be useful for the rough shape of buildings, with sculpted sprites adding detail
// - have shader skip rendering fragments in flat image if the alpha value < 0.5
export async function loadSprites (imagePath, columnCount, rowCount, depthBits = 0) {
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
						const frontPoints = [];
						const backPoints = [];
						const frontColors = [];
						const backColors = [];
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
								mapRow[x] = frontPoints.length + 2;
								frontPoints.push(x, y, front + 128, 0);
								backPoints.push(x, y, back + 128, 0);
								frontColors.push(...color.map(value => (value >> 4) * 17), 0);
								backColors.push(...color.map(value => (value % 16) * 17), 0);
							}
						}
						
						if (x === 0) {
							row = [];
							sheet.push(row);
						}
						
						const front = {
							points: new Uint8Array(frontPoints),
							colors: new Uint8Array(frontColors),
						};

						const back = {
							points: new Uint8Array(backPoints),
							colors: new Uint8Array(backColors),
						};

						const sprite = { offset, smoothing, front, back, map };
						patchSprite(sprite);
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
