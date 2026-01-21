import { scene } from '../graphics.mjs';

export function setBoundary (instance) {
	const { asset = {}, position } = instance;
	const { boundary: modelBoundary, scale = 1 } = asset.model || {};

	if (modelBoundary) {
		instance.boundary = modelBoundary.map((value, i) => position[i % 3] + value * scale);
	}

	return instance;
}

export function checkBoundary (instance) {
	const { boundary, platform, motion, onfall, oncollide, passengers } = setBoundary(instance);

	if (!motion || !boundary || !oncollide && !onfall) {
		return;
	}

	const horizontalSpeed = motion[0] + (platform?.motion?.[0] || 0);
	const verticalSpeed = motion[1] + (platform?.motion?.[1] || 0);
	const perpendicularSpeed = motion[2] + (platform?.motion?.[2] || 0);
	let maxLeftOverlap = 0;
	let maxBottomOverlap = 0;
	let maxBackOverlap = 0;
	let maxRightOverlap = 0;
	let maxTopOverlap = 0;
	let maxFrontOverlap = 0;
	let verticalObstacle, horizontalObstacle, perpendicularObstacle, verticalSide, horizontalSide, perpendicularSide;

	for (const obstacle of scene.obstacles) {
		if (obstacle === instance || passengers?.has?.(obstacle)) {
			continue;
		}

		const { boundary: obstacleBoundary } = obstacle;
		const leftOverlap = obstacleBoundary[3] - boundary[0];
		const bottomOverlap = obstacleBoundary[4] - boundary[1];
		const backOverlap = obstacleBoundary[5] - boundary[2];
		const rightOverlap = boundary[3] - obstacleBoundary[0];
		const topOverlap = boundary[4] - obstacleBoundary[1];
		const frontOverlap = boundary[5] - obstacleBoundary[2];
		const overlaps = [bottomOverlap, topOverlap, backOverlap, frontOverlap, leftOverlap, rightOverlap];
		const minOverlap = Math.min(...overlaps);

		if (minOverlap <= 0) {
			continue;
		}

		if (bottomOverlap === minOverlap && bottomOverlap > maxBottomOverlap) {
			maxBottomOverlap = bottomOverlap;
			verticalObstacle = obstacle;
			verticalSide = 'bottom';
		} else if (topOverlap === minOverlap && !maxBottomOverlap && topOverlap > maxTopOverlap) {
			maxTopOverlap = topOverlap;
			verticalObstacle = obstacle;
			verticalSide = 'top';
		} else if (backOverlap === minOverlap && backOverlap > maxBackOverlap) {
			maxBackOverlap = backOverlap;
			perpendicularObstacle = obstacle;
			perpendicularSide = 'back';
		} else if (frontOverlap === minOverlap && !maxBackOverlap && frontOverlap > maxFrontOverlap) {
			maxFrontOverlap = frontOverlap;
			perpendicularObstacle = obstacle;
			perpendicularSide = 'front';
		} else if (leftOverlap === minOverlap && leftOverlap > maxLeftOverlap) {
			maxLeftOverlap = leftOverlap;
			horizontalObstacle = obstacle;
			horizontalSide = 'left';
		} else if (rightOverlap === minOverlap && !maxLeftOverlap && rightOverlap > maxRightOverlap) {
			maxRightOverlap = rightOverlap;
			horizontalObstacle = obstacle;
			horizontalSide = 'right';
		}
	}

	if (verticalSpeed && verticalObstacle) {
		const overlap = maxBottomOverlap || maxTopOverlap;
		oncollide?.(instance, verticalObstacle, verticalSide, overlap);
	}
	
	if (verticalSide === 'bottom') {
		verticalObstacle?.passengers?.add?.(instance);
		instance.platform = verticalObstacle;
	} else {
		platform?.passengers?.delete?.(instance);
		instance.platform = undefined;

		if (verticalSpeed < 0) {
			instance.isFalling = true;
			onfall?.(instance);
		}
	}

	if (perpendicularSpeed && perpendicularObstacle) {
		const overlap = maxBackOverlap || maxFrontOverlap;
		oncollide?.(instance, perpendicularObstacle, perpendicularSide, overlap);
	}

	if (horizontalSpeed && horizontalObstacle) {
		const overlap = maxLeftOverlap || maxRightOverlap;
		oncollide?.(instance, horizontalObstacle, horizontalSide, overlap);
	}
}

export function applyPhysics (target, modifier, duration, max) {
	if (!modifier) {
		return;
	}

	// TODO: have stew handle this (limit max frame lenth to around 20 per second)
	// - also maintain a totalDuration value on all targets, and skip physics udpate if totalDuration will be the same
	// - this allows reusing instances in different shader programs (e.g. camera, lights)
	duration = Math.min(50, duration);

	for (let i = 0; i < 3; i++) {
		const value = target[i] + (modifier[i] || 0) * duration;
		target[i] = max ? Math.max(-max, Math.min(max, value)) : value;
	}
}

export function physics () {
	return ['', null, 'Physics'];
}

export default [physics, {
	'': 'Physics',
}];
