const queue = new Set();
let timeout;

function schedule (subscriptions) {
	for (const callback of subscriptions) {
		queue.add(callback);
	}
	
	subscriptions.clear();
	if (timeout !== undefined) return;

	// schedule update after all main thread tasks have finished
	timeout = setTimeout(() => {
		for (const callback of queue) {
			execute(callback);
		}

		queue.clear();
	}, 0);
}

export default function observe (object) {
	const state = { ...object};

	// set up subscribe/dispatch pattern on properties
	for (const [name, value] of Object.entries(object)) {
		const subscriptions = new Set();

		// bind context
		if (typeof value === 'function') {
			state[name] = value.bind(object);
		}

		// subscribe on get and dispatch on set
		Object.defineProperty(object, name, {
			get () {
				subscriptions.add(stack[0]);
				return state[name];
			},
			set (value) {
				state[name] = value;
				schedule(subscriptions);
			}
		});
	}

	return object;
}
