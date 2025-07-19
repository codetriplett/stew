import state, { updateSettings } from '.';

// function updateWidth (flexContainer, scrollContainer, isRight) {
// 	if (isRight) {
// 		const { classList } = document.body;

// 		if (scrollContainer) {
// 			classList.add('right-active');
// 		} else {
// 			classList.remove('right-active');
// 		}
// 	}

// 	if (!flexContainer) {
// 		return;
// 	}

// 	if (!isRight || !scrollContainer) {
// 		const width = scrollContainer?.offsetWidth || 0;
// 		flexContainer.style.flexBasis = `${width}px`;
// 		flexContainer.style.width = `${width}px`;
// 	} else {
// 		flexContainer.style.flexBasis = '';
// 		flexContainer.style.width = '';
// 		const width = flexContainer.clientWidth;
// 		scrollContainer.style.width = `${width}px`;
// 	}
// }

// function updateWidths () {
// 	const app = document.querySelector('#app');
// 	const isSmall = getComputedStyle(app).float !== 'none';
// 	const { classList } = document.body;

// 	for (const side of ['left', 'right']) {
// 		const flexContainer = document.querySelector(`.sidebar-${side}`);
// 		const scrollContainer = isSmall && !classList.contains(`show-${side}`) ? null : flexContainer.querySelector('.scroll');
// 		updateWidth(flexContainer, scrollContainer, side === 'right');
// 	}
// }

// have snips sidebar have a set width instead of a flex one
// - then left and right can share the same behavior
// - width will depend on breakpoint and will be calc(100dvw - spaceForButton) at mobile breakpoint
export default function Sidebar ({ isRight = false, hideContent = false, icon, toggleProp, widget }, ...children) {
	if (widget?.length > 2) {
		children.unshift(['div', null,
			['template', { shadowrootmode: 'open' }, widget],
		]);
	}

	const { settings } = state;
	const side = isRight ? 'right' : 'left';
	const sideProp = isRight ? 'showRight' : 'showLeft';
	const show = toggleProp ? settings[toggleProp] : state[sideProp];
	const { classList } = document.body;
	const toggleClass = `show-${side}`;
	const eligible = children.some(child => child);
	const active = show && eligible;
	// stew(null, [], () => window.addEventListener('resize', updateWidths));
	// stew(null, [isRight || state.focusedSection, active], updateWidths);

	return ['div', {
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
