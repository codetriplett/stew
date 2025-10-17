// ```export async

function packDepths (back, front, shiftBits) {
	const thickness = front - back;
	const mask = 1 << shiftBits;
	const center = ((back + front - (thickness % 2)) >> 1) + (mask >> 1);
	return (thickness << shiftBits) + (center % mask);
}

function unpackDepths (alpha, shiftBits) {
	const thickness = alpha >> shiftBits;
	const half = thickness >> 1;
	const mask = 1 << shiftBits;
	const center = (alpha % mask) - (mask >> 1);
	const back = center - half;
	const front = center + half + (thickness % 2);
	return [back, front];
}

// make depthBits optional and render squares with standard texture using coordinates if not provided
// - this will be useful for the rough shape of buildings, with sculpted sprites adding detail
export async function loadSprites (imagePath, columnCount, rowCount, depthBits = 0) {
	const image = await new Promise(resolve => {
		const image = new window.Image();
		image.src = imagePath;
		image.onload = () => resolve(image);
	});

	const shiftBits = Math.min(Math.max(0, 8 - depthBits), 8);
	const scale = [1 / image.width, 0, 0, 1 / image.height];
	const width = Math.floor(image.width / columnCount);
	const height = Math.floor(image.height / rowCount);
	const range = Math.pow(2, shiftBits) / 256;
	// const scale = [Math.floor(width / columnCount), 0, 0, 0, Math.floor(height / rowCount), 0, 0, 0, 0];
	const sheet = [];

	// TODO: store these as a single array of depths
	// - put the start and length values on sprite props to pass to drawArrays
	// - this will allow multiple objects to share different sprites without each of them binding a new buffer
	// - shader code needs to change to have sheet at the root which binds attribute, then sprites for the uniforms, and finally the instances

	const canvas = document.createElement('canvas');
	Object.assign(canvas, { width, height });
	Object.assign(canvas.style, { width: 'auto' });
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx.willReadFrequently = true;
	ctx.translate(0, height);
	ctx.scale(1, -1);

	for (let y = 0; y < rowCount; y++) {
		const y1 = (y + 1) / rowCount;
		const y2 = y / rowCount;
		const row = [];
		sheet.push(row);

		for (let x = 0; x < columnCount; x++) {
			const x1 = x / columnCount;
			const x2 = (x + 1) / columnCount;
			const offset = [width * x, height * (rowCount - 1 - y)];
			ctx.drawImage(image, width * x, height * y, width, height, 0, 0, width, height);
			const data = ctx.getImageData(0, 0, width, height).data;
			const points = [];
			let index = 0;

			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const alpha = data[index + 3];
					index += 4;

					if (!alpha) {
						continue;
					}

					const depths = unpackDepths(alpha, shiftBits);
					const [back, front] = depths;
					points.push(x, y, back + 128, -1, x, y, front + 128, 1);
				}
			}

			const sprite = { image, width, range, scale, offset, points: new Uint8Array(points), coordinates: new Float32Array([x1, y1, x2, y1, x1, y2, x2, y2]) };
			row.push(sprite);
		}
	}

	return sheet;
}
