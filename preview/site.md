```
{
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

```
const [{ category }, ...children] = arguments;

return ['', {},
	['header', {}, category],
	['div', { className: 'container' }, ...children],
];
```