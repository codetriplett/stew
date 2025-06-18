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
const [{ page }, ...children] = arguments;

return ['', {},
	['nav', {}, page],
	...children,
];
```
