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

Your custom code will also wrap the content of notes that live beneath it in the URL. The child notes will provide data in addition to their layout which can be read from the arguments. These arguments are empty when viewing the parent page on its own, with a trailing slash, so you can customize the behavior for each.

```
const [props, content] = arguments;
```

You will need to define a schema in order to edit the prop data passed in. This is defined at the top of the file in the object we mentioned earlier. These fields will show up in an expandable left nav when editing a child note of the current page.

```
/some/other/styles.css
/some/other/script.mjs
{
	'': 'Heading',

	// display a field that accepts only text
	string: '// String',
	pattern: '/[a-z]+/ Pattern',

	// display a field that accepts only numbers
	number: '/.. Number',
	range: '/0..9 Range',

	// display a checkbox that stores true if selected
	boolean: '/ Boolean',

	// fields can set placeholder text to give some extra context
	name: 'Enter a name /[a-z]+/ Name',

	// fields can be set to required by placing a * before their type definition
	age: '*/0..128 Age'

	// required booleans will use their placeholder text as a static value to set instead
	static: 'static */ Static',
	// these are useful within the array options below to select preset values
	
	// path is used to embed existing schema, and locate existing data under it
	reference: '/path/to/data// Reference',

	// more complex data can be defined in objects
	object: {
		'': 'Object', // path can also be included here to override existing schema
		// set additional fields here
	},

	// allows for a collection of items that match one of the provided types
	array: ['/.. Array',
		'// String',
		'/.. Number',
	],
	// can set a min and max value, like with number fields, to limit the size of the array

	// !!! the rest aren't finished at this time. I started to run out of steam here. !!!

	// allows selecting one
	select: ['/ Select',
		'first / First',
		'second / Second',
	],

	// allows selecting from multiple options, but only one time each
	multiselect: ['Multiselect',
		'first / First',
		'second / Second',
	],

	// objects can be defined where the keys are custom, but value types are predefined
	properties: ['// Properties',
		'// String',
		'/.. Number',
	],
}
img {
	width: 100%;
}
```
