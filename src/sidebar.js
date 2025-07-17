const { body } = document;

function updateWidth (ref, grow) {

}

// have snips sidebar have a set width instead of a flex one
// - then left and right can share the same behavior
// - width will depend on breakpoint and will be calc(100dvw - spaceForButton) at mobile breakpoint
export default function Sidebar ({ toggleProp, toggleClass, widget }, ...children) {
	const { settings } = state;
	const { [toggleProp]: show } = settings;

	if (widget?.length > 2) {
		children.unshift(['div', null,
			['template', { shadowrootmode: 'open' }, widget],
		]);
	}

	const [sidebarProps, scrollProps] = stew(() => {
		window.addEventListener('resize', () => updateWidth(ref));
		return [{ '': 'sidebar', className: 'sidebar' }, { '': 'scroll', className: 'scroll' }];
	}, []);

	const active = show && children.length;
	stew(null, [location.hash, body.className, active], () => updateWidth(sidebarProps[''], scrollProps['']));

	return ['div', sidebarProps,
		menuActive && ['div', scrollProps, ...children],
		['button', {
			type: 'button',
			className: 'toggle',
			onclick: () => {
				const { classList } = document.body;
				const [, container] = ref[0];
				document.body

				// TODO: only add show class if in small view and container was hidden
				// - otherwise add or clear it according to showMenu
				// - button has no effect if show-menu is active when returning to large view right now

				if (classList.contains(toggleClass) || container && getComputedStyle(container).display === 'none') {
					classList.toggle(toggleClass);
					updateWidths();
				} else {
					classList.add(toggleClass);
					updateSettings({ [toggleProp]: !show });
				}
			},
		}],
	];
}
