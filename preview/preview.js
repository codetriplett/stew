const state = stew(state => ({
	toggle: () => state.string += '.'
}));

state(`<div><span onclick={toggle}>({string})</span></div>`);
