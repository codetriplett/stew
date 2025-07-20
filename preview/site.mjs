export function site () {
	const [props, ...children] = arguments;

	if (!props) {
	    return ['p', null, 'Site Landing'];
	}

	const { category } = props;

	return ['', {},
	    ['header', {}, category],
	    ['div', { className: 'container' }, ...children],
	];
}

export default [site, {
    '': {
        '': 'Site',
        smile: ':)',
    },
    category: '// Category',
}, ['style', null, `
header {
    height: 60px;
    color: white;
    background: dimgray;
}
.container {
    display: flex;
}
main {
    flex-grow: 1;
}
`]];
