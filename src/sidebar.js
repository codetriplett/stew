import state, { updateSettings } from '.';

export default function Sidebar ({ isRight = false, isForm = false, icon, toggleProp, widget, Component }, ...children) {
	if (widget?.length > 2) {
		children.unshift(['div', null,
			['template', { shadowrootmode: 'open' }, widget],
		]);
	}

	const { settings, hasMounted } = state;
	const side = isRight ? 'right' : 'left';
	const sideProp = isRight ? 'showRight' : 'showLeft';
	const sidebarState = !isForm ? state : stew({ [sideProp]: true }, []);
	const show = toggleProp ? settings[toggleProp] : sidebarState[sideProp];
	const { classList } = document.body;
	const toggleClass = `show-${side}`;
	const eligible = children.some(child => child);
	const active = show && eligible;

	// TODO: prevent these from loading in small view if menu is active but hidden
	// - maybe detect small view whenever this renders, and empty children array if not visible, even if state shows it as active
	// - this isn't a big deal for now with everything in local storage, but it does add more processing
	if (Component) {
		children = children.map(value => [Component, { '': value }, value]);
	}

	return hasMounted && ['div', {
		className: `sidebar sidebar-${side} ${active ? '': 'sidebar-hidden'}`,
	},
		(active || isForm) && ['div', {
			className: `scroll scroll-${side}`,
		}, ...children],
		eligible && ['button', {
			type: 'button',
			className: `toggle ${icon}-button`,
			onclick: () => {
				classList.remove(`show-${isRight ? 'left' : 'right'}`);

				if (active && getComputedStyle(document.querySelector('#app')).float !== 'none') {
					classList.toggle(toggleClass);
					return;
				}

				if (toggleProp) {
					updateSettings({ [toggleProp]: !show });
				} else {
					sidebarState[sideProp] = !show;
				}

				if (show) {
					classList.remove(toggleClass);
				} else {
					classList.add(toggleClass);
				}
			},
		}],
	];
}
