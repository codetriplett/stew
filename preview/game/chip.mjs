load('/game.mjs');
load('/game/model.mjs');
load('/game/shader.mjs');

export function chip () {
	const { scene } = load('/game.mjs');
	const { loadSkeleton } = load('/game/model.mjs');
	const { linkInstance, renderScene } = load('/game/shader.mjs');

	const personSkeleton = stew(() => {
		return loadSkeleton({
			'': '/game/person',
			lowerTorso: [34, 25, 10, 1, 10, 16, 0, 5],
			upperTorso: [53, 40, 9, 20, 9, 1, 0, 5],
			head: [18, 40, 6, 16, 6, 1, 0, 5, 'upperTorso', 0, 21, 1, 0, Math.PI / 2],
		});
	}, [], null);
	
	const [lowerTorso, upperTorso, head] = stew(() => {
		return [
			{},
			{},
			{ position: [0, 19, 0] },
		];
	}, []);

	stew(() => {
		linkInstance(lowerTorso, personSkeleton?.lowerTorso?.asset);
		linkInstance(upperTorso, personSkeleton?.upperTorso?.asset);
		linkInstance(head, personSkeleton?.upperTorso?.children?.head?.asset);
	}, [personSkeleton]);

	return ['canvas', { width: 960, height: 540 }, renderScene(scene)];
}

export default [chip, {
	'': 'Chip',
}];
