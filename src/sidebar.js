import state, { updateSettings } from '.';

export default function Sidebar ({ isRight = false, hideContent = false, icon, toggleProp, widget }, ...children) {
	if (widget?.length > 2) {
		children.unshift(['div', null,
			['template', { shadowrootmode: 'open' }, widget],
		]);
	}

	const { settings, hasMounted } = state;
	const side = isRight ? 'right' : 'left';
	const sideProp = isRight ? 'showRight' : 'showLeft';
	const show = toggleProp ? settings[toggleProp] : state[sideProp];
	const { classList } = document.body;
	const toggleClass = `show-${side}`;
	const eligible = children.some(child => child);
	const active = show && eligible;

	return hasMounted && ['div', {
		className: `sidebar sidebar-${side} ${active ? '': 'sidebar-hidden'}`,
	},
		(active || hideContent) && ['div', {
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
					state[sideProp] = !show;
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
