export default function stew (state, view, ...parameters) {
	function render () {
		view(state, ...parameters);

		for (const key in state) {
			state[key] = render;
		}
	}

	render();
}
