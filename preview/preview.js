const state = stew(state => ({ add: () => state.value = `${state.value}.` }));
state(`<div><p {array}>{}</p><span onclick={add}>add</span></div>`);
