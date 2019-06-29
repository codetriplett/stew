const state = stew(state => ({
	add: () => state.array = [...state.array, state.array.length]
}));

state(`<div><p {array}>{}</p><span onclick={add}>add</span></div>`);
