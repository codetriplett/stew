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
			lowerTorso: [34, 25, 0, 10, 1, 10, 16, 5],
			upperTorso: [53, 40, 0, 9, 20, 9, 1, 5],
			head: [18, 40, 0, 6, 16, 6, 1, 5, 'upperTorso', 0, 21, 1, 0, Math.PI / 2],
		});
	}, [], null);
	
	const personInstance = stew(() => {
		return {};
	}, []);

	stew(() => {
		linkInstance(personInstance, personSkeleton?.lowerTorso?.asset);
	}, [personInstance, personSkeleton]);

	return ['canvas', { width: 960, height: 540 }, renderScene(scene)];
}

export default [chip, {
	'': 'Chip',
}];
