import reconcile, { remove } from './reconcile';
import { record, schedule } from './observe';

export const teardowns = new WeakMap();
export const frameworks = [];
export const impulses = [];

export default function execute (callback, state, parentView, i, dom, hydrateNodes = []) {
	// persist parent framework and dom reference object
	const isEffect = i === undefined && parentView[0] === undefined;
	const [framework] = frameworks;

	// wrap in setup and teardown steps and store as new callback to subscribe to state property changes
	function impulse (hydrateNodes) {
		// resurface stored framework
		frameworks.unshift(framework);
		impulses.unshift(impulse);
		let viewParam = [];
		let item;

		// update param for effects
		if (isEffect) {
			viewParam = teardowns.has(parentView) ? record.get(state) : undefined;
		}
	
		// safely run callback function
		try {
			item = callback(state, viewParam);
		} catch (e) {
			console.error(e);
		}

		if (i !== undefined) {
			// process return value as it normally would before resetting active framework
			const domCopy = { ...dom };
			const prevView = parentView[i + 2];
			reconcile(item, state, parentView, i, dom, hydrateNodes);
			dom = domCopy;

			// remove outdated nodes if needed
			if (!hydrateNodes && prevView?.length && parentView[i + 2] !== prevView) {
				const { container } = dom;
				remove(prevView, container);
			}

			// update view param passed to callback
			const newView = parentView[i + 2];
			if (newView) viewParam.push(...newView);
		} else {
			const [node] = parentView;

			if (node) {
				// process attribute update
				const [, updater] = framework;
				updater(node, item);
			} else {
				teardowns.set(parentView, item);
			}
		}

		// reset stack
		impulses.shift();
		frameworks.shift();
	}

	// delay effect until after render
	if (isEffect) {
		schedule([impulse]);
		return;
	}

	// set parent impulse and call for first time, except for effects 
	impulse.parentImpulse = impulses[0];
	impulse(hydrateNodes);
}
