# Stew

Code can be embedded into notes to create fully-customized webpages. This is done using preformatted text blocks with the `export` formatter set. The one under your primary heading will be called when accessing the notes path with a trailing slash. This function will receive the props and layout of its child notes in the URL path, if they exist.

````
```export
const [props, content] = arguments
return 'Hello, World!'
```

````

## Elements

```demo
return ['h1', { className: 'greeting' }, 'Hello, World!'] // +

```

These are ultimately what gets displayed to the user. The attributes follow the naming used by JavaScript, not HTML. You can pass in an object for the 'style' and 'dataset' attributes to set their properties. Numbers can be used in place of heading names to make it easy to increase their level.

## Fragments

```demo
const state = { time: 'now' } // +

return ['', { state }, // +
	['h1', { className: 'greeting' }, 'Hello, World!'],
	({ state }) => ['p', null, 'The time is ', state.time], // +
]

```

Using an empty value in place of the tag name will create a group from its children without adding a wrapper element. Any properties you include will be added to the context object used by inline functions. This makes it easy pass value to deeply nested code.

## Components

```demo
const state = { time: 'now' }

function Greeting ({ place }, greeting) { // +
	const { time } = state // +

	return ['', null, // +
		['h1', { className: 'greeting' }, `${greeting}, ${place}!`], // +
		['p', null, 'the time is ', state.time], // +
	] // +
} // +

return [Greeting, { place: 'World' }, 'Hello'] // +

```

Functions can be used in place of tag names to create dynamic and reusable layouts. The props and children will be passed directly to the function for processing.

## States

```demo
const state = stew({ time: 'now' }) // +

function Greeting ({ place }, greeting) {
	const { time } = state

	return ['', null,
		['h1', { className: 'greeting' }, `${greeting}, ${place}!`],
		['p', null, 'the time is ', state.time],
	]
}

setInterval(() => { // +
	state.time = new Date().toLocaleTimeString(); // +
}, 1000); // +

return [Greeting, { place: 'World' }, 'Hello']

```

States hold properties that cause your components to refresh when changed. They can be defined anywhere in your code, and only the values read within your function will cause it to udpate. If you create a state within a component, be sure to include any values it depends on in an array as the second param. This will prevent it form creating a new one when the components, unless any of those values have changed.

## Memos

```demo
const state = stew({ time: 'now' })

function Greeting ({}, greeting) {
	const { time } = state

	const place = stew(() => { // +
		return Intl.DateTimeFormat().resolvedOptions().timeZone // +
	}, []) // +

	return ['', null,
		['h1', { className: 'greeting' }, `${greeting}, ${place}!`],
		['p', null, 'the time is ', state.time],
	]
}

setInterval(() => {
	state.time = new Date().toLocaleTimeString();
}, 1000);

return [Greeting, {}, 'Hello'] // +

```

Custom values can be reused between renders by passing in a function to create them. Similar to creating states, the values from the dependencies array determine when this value needs to chagne. If your function returns an async value, you can provide a fallback value to use in the meantime. The component will update once the value has finished resolving. Another value can be provided to use in cases where the async action fails.

```demo
const state = stew({ time: 'now', latitude: 49.25, longitude: -95 }) // +

async function lookupLocation (latitude, longitude) { // +
	// Typically you would fetch data here, but this is just a demo
	await new Promise(resolve => setTimeout(resolve, 5000));  // +
	return `${latitude < 0 ? 'South' : 'North'}${longitude < 0 ? 'west' : 'east'}`; // +
} // +

function Greeting ({}, greeting) {
	const { time, latitude, longitude } = state

	const place = stew(lookupLocation, [latitude, longitude], 'Somewhere', 'Nowhere'); // +

	return ['', null,
		['h1', { className: 'greeting' }, `${greeting}, ${place}!`],
		['p', null, 'the time is ', state.time],
	]
}

setInterval(() => {
	state.time = new Date().toLocaleTimeString();
}, 1000);

setInterval(() => { // +
	state.latitude = Math.random() * 180 - 90; // +
	state.longitude = Math.random() * 360 - 180; // +
}, 5000); // +

return [Greeting, {}, 'Hello']

```

Markdown can be rendered, and stored in a memo, by passing its string before the dependencies array.

```demo
const content = stew('# Hello World!', []) // +
return content // +

```

## Effects

```demo
const state = stew({ isGreeting: false }) // +

function Greeting ({}, button) { // +
	let ref; // +

	stew(null, [], () => { // +
		const [button] = ref[0] // +
		button.focus() // +
		console.log('Hello, Console!') // +
		return () => console.log('Goodbye, Console!') // +
	}) // +

	return ref = ['', null, button] // +
}

function App () { // +
	const { isGreeting } = state // +

	const button = ['button', { // +
		type: 'button', // +
		onclick: () => state.isGreeting = !isGreeting, // +
	}, 'Say ', isGreeting ? 'Goodbye' : 'Hello'] // +

	return isGreeting ? [Greeting, {}, button] : button // +
}

return [App] // +

```

Code can be scheduled to run once the layout has rendered by putting its function after the dependencies array. You can return a function to run when the component is removed from the layout, or if any of the values in the dependencies change, causing the effect to run again. Rendered elements can be read from the start of the fragments array if you need to use them in your effect, but you should avoid modififying their layouts manually.

## Data

Each section of your URL represents a note, and the layout from each one is passed to the one before. Additional data is passed along as well if the container note had fields defined. These can be set at the top of the note, along with styles and additional resources.

```
/some/other/styles.css
/some/other/script.mjs
{
	string: '// String',
	number: '/.. Number',
	boolean: '/ Boolean',
	reference: '/path/to/data// Reference',
	object: {
		'': 'Object',
		pattern: '/[a-z]/i Pattern',
		range: '/0..9 Range',
	},
	array: ['/.. Array',
		'// String',
		'/.. Number',
	],
	choice: ['/ Choice',
		'first / First',
		'second / Second',
	],
}
img {
	width: 100%;
}
```

These fields will show up in an expandable left when editing a note directly below the one where they were defined. The data and child note content can be accessed at the top of your function like so.

```
const [props, content] = arguments;
```
