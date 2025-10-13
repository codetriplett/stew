// ```export async
export async function loadSculpture () {
	const image = await new Promise(resolve => {
		const image = new window.Image();
		image.src = imagePath;
		image.onload = () => resolve(image);
	});
}

export async function loadSprites (imagePath, columnCount, rowCount) {
	const image = await new Promise(resolve => {
		const image = new window.Image();
		image.src = imagePath;
		image.onload = () => resolve(image);
	});

	const { width, height } = image;
	const scale = [Math.floor(width / columnCount), 0, 0, 0, Math.floor(height / rowCount), 0, 0, 0, 0];
	const sheet = [];

	for (let y = 0; y < rowCount; y++) {
		const y1 = (y + 1) / rowCount;
		const y2 = y / rowCount;
		const row = [];
		sheet.push(row);

		for (let x = 0; x < columnCount; x++) {
			const x1 = x / columnCount;
			const x2 = (x + 1) / columnCount;
			const sprite = { image, scale, coordinates: new Float32Array([x1, y1, x2, y1, x1, y2, x2, y2]) };
			row.push(sprite);
		}
	}

	return sheet;
}
