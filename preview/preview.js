const state = stew(state => ({ add: () => state.value = `${state.value}.` }));
state(`<div><p>{value}</p><span onclick={add}>add</span></div>`);
