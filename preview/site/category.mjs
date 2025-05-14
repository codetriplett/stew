function Category ({ page }, ...children) {
	return ['', {},
		['nav', {}, page],
		...children,
	];
}

export default [Category, {}, `
	nav {
		width: 240px;
		background: lightgray;
	}
`];
