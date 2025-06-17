function Category ({ page }, ...children) {
	return ['', {},
		['nav', {}, page],
		...children,
	];
}

export default [Category, {}, ['style', null, `
	nav {
		width: 240px;
		background: lightgray;
	}
`]];
