```export
{
	smile: '🙂',
}
```

# Convert

```export
const [props] = arguments;

if (!props) {
    return ['p', null, 'Index landing'];
}

const { tagName, children, ...attributes } = props;
return [tagName, attributes, ...children];
```

## Custom

```export
const [flags, code] = arguments;
return `CUSTOM\n${code}`;
```
