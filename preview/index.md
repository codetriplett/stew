```
{
	smile: '🙂',
}
```

# Convert

```
const [{ tagName, children, ...props }] = arguments;
return [tagName, props, ...children];
```

## Custom

```
const [flags, code] = arguments;
return `CUSTOM\n${code}`;
```
