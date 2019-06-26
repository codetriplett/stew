const state = stew(state => ({
	toggle: () => state.string += '.'
}));

state((template => (update, element, stew) => {
	if (!update) {
		return 'div';
	}

	update(stew(template, element));
	update(state => stew(template, state, element));

	element.addEventListener('click', () => state.toggle());
})({ '': ['div', '', [['', 'string', '']]] }));
