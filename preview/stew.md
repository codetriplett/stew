# Stew

Stew layouts are made up of arrays that give instructions for what should be displayed. The first item in each array defines its behavior, the second provides its properties, and the rest allows you to embed additional layouts within.

```run
return ['style', null, `
@media (max-width: 720px) {
	.stew-demo {
		display: block !important;

		> *  + * {
			margin-top: 16px;
		}
	}
}
`]
```

## Elements

```demo
return ['h1', { className: 'greeting' }, 'Hello, World!'] // +

```

These are ultimately what gets displayed to the user. The attributes follow the naming used by JavaScript, not HTML. You can pass in an object for the 'style' and 'dataset' attributes to set their properties. Numbers can be used in place of heading names to make it easy to increase their level.

## Fragments

```demo
return ['', null, // +
	['h1', { className: 'greeting' }, 'Hello, World!'],
	['p', null, 'The time is now'], // +
] // +

```

A subsection of a layout can be wrapped as a single unit using a fragment. The properties you pass are accessible by inline functions no matter the depth, as long as another fragment inside its layout doesn't override them with their own.

```demo
const state = { time: 'now' } // +

return ['', { state }, // +
	['h1', { className: 'greeting' }, 'Hello, World!'],
	({ state }) => ['p', null, 'The time is ', state.time], // +
]

```

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

Functions can be used in place of HTML tags to create dynamic and reusable layouts. The props and children will be passed directly to it for processing.

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

States hold properties that can change over time. Whenever these values are updated, any components that read the affected values will automatically refresh their layouts. States can exist outside your layout code, or be created within components and passed along in fragment contexts. If you create a states within your components, be sure to include any values it depends on in an array as the second param. It will only create a new state if these values differ from the last time it was created. Otherwise it will return the previous one.

## Memos

Custom values can be created by passing in a function instead of an object. The values from the dependencies array will also be passed as params if you prefer the short version

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

If your function is async, you can provide a fallback value for use in the meantime. Once the function resolves, it will trigger a new render of its immediate component, similar to how state changes update the layout. Another value can be provided to use in cases where the async action failed.

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

Code can be scheduled to run once the layout has rendered by putting its function after the dependencies array. You can return a function to run when the component is removed from the layout, or if any of the values in the dependencies array have cause the effect code to run again.

Rendered elements will be written to the first value of the fragment array, allowing you to perform followup actions on them. It isn't recommended to modify the elements themselves, but it can be useful for things like setting focus to a form field.

## Markdown

```demo
const content = stew('# Hello World!', [])
return content

```

Markdown can be parsed into the stew layout format by passing in the string you want to process. It can be used as a memo as well if you include a dependencies array.
