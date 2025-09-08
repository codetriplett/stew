# Stew

Notes can be embedded with code to make them more interactive. This is done using [preformatted text](/markdown#preformatted-text) blocks with the `export` formatter set. Placing one under your main heading and adding a trailing slash to your URL will render the custom layout.

````
```export
return 'Hello, World!'
```

````

## Elements

```demo
return ['h1', { className: 'greeting' }, 'Hello, World!'] // +

```

These are ultimately what gets displayed to the user. The attributes follow the naming used by JavaScript, not HTML. You can pass in an object for the 'style' and 'dataset' attributes to set their properties. Numbers can be used in place of heading names to make it easy to increase their level. A `canvas` element type can be even be included in your layout to create [2D and 3D games](/webgl).

## Fragments

```demo
return ['', null, // +
	['h1', { className: 'greeting' }, 'Hello, World!'],
	['p', null, 'The time is now'], // +
]

```

Using an empty value in place of the tag name will create a sublayout. These are useful when you need to control the display of several elements, without having to wrap them in a container. Instead of setting attributes, properties you include will extend the context, which can be accessed by components on the '' property.

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

Functions can be used in place of an element type string to create dynamic and reusable layouts. The properties and children will be passed directly to the function for processing. It will also automatically update its layout when values from states it read from are changed.

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

States hold properties that cause your components to refresh when changed. They can be created anywhere in your layout, but if you create one within a component, be sure to include any values it depends on as a second parameter to create a memo.

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

Custom values can be reused between renders by passing in a function to create them. This function is only called the first time your component runs, or if any of the values in the second parameter have changed. If your function returns an async value, you can provide a fallback value to use in the meantime. The component will update once the async value has finished resolving. Another value can be provided to use in cases where the async action fails.

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

Markdown can be rendered and stored in a memo by passing in a string.

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

Code can be scheduled to run once the layout has rendered by putting its function after the dependencies array intead of as the first parameter. This is where you would put code that sets up other functionality on your page, but doesn't directly modify your layout. If you return a function, it will be called when your component is removed from the layout, or if the effect is triggered to run again. Avoid updating state values in effects, since it can lead to endless render loops if not done carefully.

## Data

Your code blocks will also be used to wrap the layouts of child notes. An export can be set above your main heading to define the structure of the properties that will be provided along with the note content. These are read from the arguments variable, preferably at the top of your code block.

```
const [props, content] = arguments;
```

In their simplest form, each field definition follows the format of `Label /pattern/range Placeholder`. The label, pattern, and placeholder are optional. 

```demo form
{
	string: '//',
	stringWithPattern: '/[a-z]+/',
	number: '/..',
	numberInRange: '/0..9',
	boolean: '',
	static: '/ static value',
}
```

Labels and placeholders can be included to provide better labels to fields in the form, and instructions within the inputs.

```demo form
{
	string: 'String // Enter a string',
	number: 'Number /.. Enter a number',
	boolean: 'Boolean',
}
```

Objects can be used to group fields. Click the down arrow to expand the fields. The '' property is used to set a Label for the object in the form.

```demo form
{
	object: {
		'': 'Object',
		string: 'String // Enter a string',
		number: 'Number /.. Enter a number',
		boolean: 'Boolean',
	}
}
```

Sets of fields from other notes can be embedded by including a path before the pattern slashes. A dropdown will show all the available notes of that type which can be used to prefill the fields if you wish. These prefilled values can be overridden by clicking their label, or reset by clicking the close icon that appears next to the label. If you also provide a pattern, it will only include items in that list which have names that match the pattern.

```demo form
{
	quest: 'Quest /quest// Select a quest',
}
```

A field can be defined with a set of options to choose from by setting those types after a boolean or static type definition in an array. This example only uses static values, but any other type can be used as well, and those fields will show up below the dropdown if selected.

```demo form
{
	color: ['Color / choose a color',
		'Red / #f00',
		'Green / #0f0',
		'Blue / #00f',
	],
}
```

Arrays of values can be defined by setting a range in the first definition in the array. Each item will show as a line in the text area, and can be removed or rearranged withing that field. New items are added with the plus buttion, if there is only one option, or with a drop down if there are more. Selecting text within this field will show the fields for those rows below the textarea. It isn't working on this page, but you can view an example by editing one of the daily notes on the [journal](/journal/) page.

```demo form
{
	friends: ['Friends /..20 Choose a friend',
		'Person /party//',
	],
}
```

# Styles

CSS is used to style the HTML on your page, and can be set after your field definitions in the export block above your main heading.

````
```export
{}
img {
	width: 100%;
}
```
````

## Imports

Code can be included in other sections of your note as well to create functions that can be called on demand, or to create global states, if an object is exported. These can even be imported for use in other notes by including a link to the source note with an empty label. Hash values on your links will control what is imported.

```
[](/helpers#helperName)
[](/helpers# "defaultAlias")
```
