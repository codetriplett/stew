```export
{
	'': {
		smile: ':)',
	},
	category: '// Category',
}
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
```

# Site

```export
const [props, ...children] = arguments;

if (!props) {
	return ['p', null, 'Site Landing'];
}

const { category } = props;

return ['', {},
	['header', {}, category],
	['div', { className: 'container' }, ...children],
];
```