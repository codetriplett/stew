// ```export async

function packDepths (front, back, shiftBits) {
	const thickness = back - front;
	const mask = 1 << shiftBits;
	const center = ((front + back - (thickness % 2)) >> 1) + (mask >> 1);
	return (thickness << shiftBits) + (center % mask);
}

function unpackDepths (alpha, shiftBits) {
	const thickness = alpha >> shiftBits;
	const half = thickness >> 1;
	const mask = 1 << shiftBits;
	const center = (alpha % mask) - (mask >> 1);
	const front = center - half;
	const back = center + half + (thickness % 2);
	return [front, back];
}

function getAxisNormal (before, after, crossBefore1, crossAfter1, crossBefore2, crossAfter2, farBefore, farAfter) {
	const run = Math.max(4 * (before - after), 3 * (crossBefore1 - crossAfter1), 3 * (crossBefore2 - crossAfter2), 2 * farBefore, farAfter);
	const angle = Math.atan2(8, run);
	return 8 - Math.round(angle / (Math.PI / 14) - 3.5);
	// this works out to between 1 and 15 (shader will subtract 8 to get the angle from center)
	// - shader needs a simple way to convert to vector to normalize
	// - find mid points between [2, 1] [2, 2.5] and [2, 9]
}

function getNormalComposite (pixels, y, index, isBack) {
	const fallback = isBack ? -256 : 256;
	const left = pixels[y][index - 4] ?? fallback;
	const right = pixels[y][index + 4] ?? fallback;
	const bottom = pixels[y + 4]?.[index] ?? fallback;
	const top = pixels[y - 4]?.[index] ?? fallback;
	const bottomLeft = pixels[y + 4]?.[index - 4] ?? fallback;
	const bottomRight = pixels[y + 4]?.[index + 4] ?? fallback;
	const topLeft = pixels[y - 4]?.[index - 4] ?? fallback;
	const topRight = pixels[y - 4]?.[index + 4] ?? fallback;
	const leftLeft = pixels[y][index - 8] ?? fallback;
	const rightRight = pixels[y][index + 8] ?? fallback;
	const bottomBottom = pixels[y + 8]?.[index] ?? fallback;
	const topTop = pixels[y - 8]?.[index] ?? fallback;
	const normalX = getAxisNormal(left, right, bottomLeft, topRight, topLeft, bottomRight, leftLeft, rightRight);
	const normalY = getAxisNormal(bottom, top, bottomLeft, topRight, bottomRight, topLeft, bottomBottom, topTop);
	const fillDepth = Math[isBack ? 'min' : 'max'](left, right, bottom, top);
	return [(normalX << 4) + normalY, fillDepth];
}

export function addPoints (frontPoints, backPoints, frontColors, backColors, frontPixels, backPixels, x, y, smoothing) {
	const index = x << 2;
	const frontDepth = frontPixels[y]?.[index] ?? 256;
	const backDepth = backPixels[y]?.[index] ?? -256;

	if (frontDepth > 127 || backDepth < -128) {
		return;
	}

	let [frontNormal, frontFillDepth] = getNormalComposite(frontPixels, y, index);
	let [backNormal, backFillDepth] = getNormalComposite(backPixels, y, index, true);

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

	frontColors.push(...frontPixels[y].slice(index + 1, index + 4));
	backColors.push(...backPixels[y].slice(index + 1, index + 4));
	frontPoints.push(x, y, frontDepth + 128, frontNormal);
	backPoints.push(x, y, backDepth + 128, backNormal);
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
								addPoints(frontPoints, backPoints, frontColors, backColors, frontPixels, backPixels, x, y, smoothing);
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
