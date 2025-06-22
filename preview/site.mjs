function Site ({ category }, ...children) {
	return ['', {},
		['header', {}, category],
		['div', { className: 'container' }, ...children],
	];
}

export default ['Site', {
	category: '// Category',
}, Site, ['style', null, `
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
