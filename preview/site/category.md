```
{
	page: '// Page',
}
nav {
	width: 240px;
	background: lightgray;
}
```

# Category

```
const [props, ...children] = arguments;

if (!props) {
	return ['p', null, 'Category Landing'];
}

const { page } = props;

return ['', {},
	['nav', {}, page],
	...children,
];
```
