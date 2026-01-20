export function calculateAlignment (before, after, crossBefore1, crossAfter1, crossBefore2, crossAfter2, farBefore, farAfter) {
	return  ((after - before) * 2) || Math.max(-2, Math.min(2, crossAfter1 + crossAfter2 + farAfter - crossBefore1 - crossBefore2 - farBefore));
}

export function getDepths (points, map, y, x, yChange, xChange, offset) {
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

export function getNormal (vertexes, map, y, x, offset) {
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

export function getFiller (vertexes, map, y, x) {
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

// TODO: rewrite polishModel to not need map or centerX, or centerY
// - it will read all point data, 6 at a time, and build the depth map
// - it will then rebuild the vertexes array and 
export function patchModel (model) {
	const { vertexes, normals, assets } = model;
	const fullLength = vertexes.length * 6;
	const newVertexes = [];
	const newNormals = [];
	const assetsArray = [...assets];
	const newColors = Array(assetsArray.length).fill(0).map(() => []);

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

				for (const [i, asset] of assetsArray.entries()) {
					const { colors } = asset;
					newColors[i].push(...colors.slice(index, index + 3));
				}
			}

			for (let z = backFillDepth; z < backDepth; z++) {
				newVertexes.push(vertexX, vertexY, z);
				newNormals.push(backNormal[0], backNormal[1], fillNormalDepth);

				for (const [i, asset] of assetsArray.entries()) {
					const { colors } = asset;
					newColors[i].push(...colors.slice(index + 3, index + 6));
				}
			}
		}
	}

	Object.assign(model, {
		vertexes: new Int8Array([...vertexes.slice(0, fullLength), ...newVertexes]),
		normals: new Int8Array([...normals.slice(0, fullLength), ...newNormals]),
	});

	for (const [i, asset] of assetsArray.entries()) {
		const { colors } = asset;
		asset.colors = new Uint8Array([...colors.slice(0, fullLength), ...newColors[i]]);
	}

	return model;
}

export function patch () {
	return ['', null,
		['div', { style: { display: 'flex' } },
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
		],
	];
}

export default [patch, {
	'': 'Patch',
}];

