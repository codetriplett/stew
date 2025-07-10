```export
{
	smile: '🙂',
}
```

# Convert

```export
const [props] = arguments;

if (!props) {
	const folder = `${window.location.pathname.replace(/\/+$/, '')}/`;

	const notes = stew(async url => {
		const res = await fetch(url);
		const notes = await res.json();

		for (const name in localStorage) {
			if (name.startsWith(folder) && name.endsWith('.md') && name.lastIndexOf('/') <= folder.length - 1) {
				notes.push(name.slice(folder.length, -3));
			}
		}

		return notes;
	}, [`${folder}/`], null);

	if (!notes) {
		return;
	}

	console.log(notes);

    return ['p', null, 'Show all cards. This is a good place to test the ability to check for all notes that exist in a folder. Eventually this will be where the user can customize the visualization of all references between their notes. It\'s better if this is left up to the user instead of locking them to a set version of this.'];
}

const { tagName, children, ...attributes } = props;
return [tagName, attributes, ...children];
```

## Custom

```export
const [flags, code] = arguments;
return `CUSTOM\n${code}`;
```
