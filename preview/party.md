```export
{
	name: 'Name // Enter name',
	age: 'Age /.. Enter age',
	theme: ['Theme / Choose a color',
		'Spring / #5fa',
		'Summer / #f5a',
		'Autumn / #fa5',
		'Winter / #5af',
		'Custom color//',
	],
    quest: 'Quest /index// Choose a quest...',
	friends: ['Friends /.. Add friend', 'Person /person// Choose a person...'],
}
```

# Person

```export
const [props, content] = arguments;

if (!props) {
	console.log('====', content);
}

console.log(props);
```
