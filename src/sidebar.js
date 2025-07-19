import state, { updateSettings } from '.';

function updateWidth (flexContainer, scrollContainer, isRight) {
	if (!flexContainer) {
		return;
	}

	if (!isRight || !scrollContainer) {
		const width = scrollContainer?.offsetWidth || 0;
		flexContainer.style.flexBasis = `${width}px`;
		flexContainer.style.width = `${width}px`;
	} else {
		flexContainer.style.flexBasis = '';
		flexContainer.style.width = '';
		const width = flexContainer.clientWidth;
		scrollContainer.style.width = `${width}px`;
	}
}

function updateSideWidth (side) {
	const { classList } = document.body;
	const flexContainer = document.querySelector(`.sidebar-${side}`);
	const scrollContainer = classList.contains(`show-${side}`) ? flexContainer.querySelector('.scroll') : null;
	updateWidth(flexContainer, scrollContainer, side === 'right');
}

// have snips sidebar have a set width instead of a flex one
// - then left and right can share the same behavior
// - width will depend on breakpoint and will be calc(100dvw - spaceForButton) at mobile breakpoint
export default function Sidebar ({ isRight, icon, toggleProp, widget }, ...children) {
	if (widget?.length > 2) {
		children.unshift(['div', null,
			['template', { shadowrootmode: 'open' }, widget],
		]);
	}

	stew(null, [], () => {
		window.addEventListener('resize', () => {
			updateWidth(sidebarRef[0], scrollRef?.[0], isRight);
		});
	});

	const { settings } = state;
	const sideProp = isRight ? 'showRight' : 'showLeft';
	const show = toggleProp ? settings[toggleProp] : state[sideProp];
	const { classList } = document.body;
	const toggleClass = `show-${isRight ? 'right' : 'left'}`;
	const eligible = children.some(child => child);
	const active = show && eligible;
	let sidebarRef, scrollRef;

	stew(null, [isRight || state.focusedSection, active], () => {
		updateWidth(sidebarRef[0], scrollRef?.[0], isRight);
	});

	return ['', null, sidebarRef = ['div', {
		'': 'sidebar',
		className: `sidebar sidebar-${isRight ? 'right' : 'left'} ${active ? '': 'sidebar-hidden'}`,
	},
		active && (scrollRef = ['div', {
			'': 'scroll',
			className: `scroll scroll-${isRight ? 'right' : 'left'}`,
		}, ...children]),
		eligible && ['button', {
			type: 'button',
			className: `toggle ${icon}-button`,
			onclick: () => {
				const [scrollContainer] = scrollRef || [];
				classList.remove(`show-${isRight ? 'left' : 'right'}`);

				if (scrollContainer && getComputedStyle(document.querySelector('#app')).float !== 'none') {
					classList.toggle(toggleClass);
					updateSideWidth('left');
					updateSideWidth('right');
				} else {
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
				}
			},
		}],
	]];
}
