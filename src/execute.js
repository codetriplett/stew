import reconcile, { remove } from './reconcile';
import { schedule } from './observe';

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
		let item;
	
		// safely run callback function
		try {
			const params = isEffect ? [parentView[1], teardowns.get(parentView)] : [state];
			item = callback(...params);
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
