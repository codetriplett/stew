export default function ({ category }, ...children) {
	return ['', {},
		['header', {}, category],
		['div', { className: 'container' }, ...children],
	];
}
