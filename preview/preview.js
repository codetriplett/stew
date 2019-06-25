const carousel = { '': ['div', 'string', []] };

const state = stew(state => ({
	toggle: () => state.string += '.'
}), (update, element) => {
	update({ string: 'value' });
	update(state => stew(carousel, state, element));
	element.addEventListener('click', () => state.toggle());
}, 'div');
