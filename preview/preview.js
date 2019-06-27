const state = stew(state => ({
	toggle: () => state.string += '.'
}));

state(`<div><span>({string})</span></div>`);
