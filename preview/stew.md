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

Using an empty value for the node type will create a layout fragment. These are useful when you need to control the display of several elements without having to wrap them in an extra container element. Instead of setting attributes, properties you include will extend the context, which can be accessed by components on the `''` property. The initial context is made up of the available emojis, on the `default` property, and custom formatters on the remaining properties.

## Components

```demo
const state = { time: 'now' } // +

function Greeting ({ place }, ...children) { // +
	const { time } = state // +

	return ['', null,
		['h1', { className: 'greeting' }, `Hello, ${place}!`], // +
		['p', null, 'The time is ', state.time], // +
		...children, // +
	]
} // +

return [Greeting, { place: 'World' }, // +
	['p', null, 'Have a nice day!'], // +
] // +

```

Functions can be used as the node type to create dynamic and reusable layouts. The properties and children will be passed directly to the function for processing. It will also automatically update its layout when any of the values it reads from state objects have changed. If you have elements that shift their order between renders, include a unique key on the '' prop for each of them. This helps optimize how the layout reconciles the differences.

## States

```demo
const state = stew({ time: 'now' })

function Greeting ({ place }, ...children) {
	const { time } = state

	return ['', null,
		['h1', { className: 'greeting' }, `Hello, ${place}!`],
		['p', null, 'The time is ', state.time],
		...children,
	]
}

setInterval(() => { // +
	state.time = new Date().toLocaleTimeString(); // +
}, 1000); // +

return [Greeting, { place: 'World' },
	['p', null, 'Have a nice day!'],
]

```

States hold values that cause your components to refresh when changed. Use the stew function, and pass in an object of all the keys you want to track, along with their initial values to create one. They can be created anywhere in your layout, but if you create one within a component, be sure to include any values it depends on as a second parameter to avoid replacing it when the component updates.

## Memos

```demo
const state = stew({ time: 'now' })

function Greeting ({}, ...children) { // +
	const { time } = state

	const place = stew(() => { // +
		return Intl.DateTimeFormat().resolvedOptions().timeZone // +
	}, []) // +

	return ['', null,
		['h1', { className: 'greeting' }, `Hello, ${place}!`],
		['p', null, 'The time is ', state.time],
		...children,
	]
}

setInterval(() => {
	state.time = new Date().toLocaleTimeString();
}, 1000);

return [Greeting, {}, // +
	['p', null, 'Have a nice day!'],
]

```

Custom values can be reused between renders by passing a function to the stew function, along with an array of its dependencies. This function is only called the first time your component runs, or if any of the values in the second parameter have changed. If your function returns an async value, you can provide an intermediate value to use in the meantime. The component will update once the async value has finished resolving. Another value can be provided to use in cases where the async action fails.

```demo
const state = stew({ time: 'now', latitude: 0, longitude: 0 }) // +

async function lookupLocation (latitude, longitude) { // +
	// Typically you would fetch data here, but this is just a demo // +
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
return stew('# Hello World!', []) // +

```

Relative links, ones that start with `./` or `../`, will resolve based on the root URL you provide in the dependencies array. You can also include one or more hash values to limit the sections you want displayed, including the summary section above the main heading if a hash value is set with no name.

```demo
return stew(`
Summary Section

[Create a quest](./bake-a-cake)

# Hello World!

Main Section

`, ['/quest/#'])

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

Code can be scheduled to run once the layout has rendered by putting its function after the dependencies array intead of as the first parameter. This is where you would put code that sets up other functionality on your page, but doesn't directly modify your layout. If you return a function, it will be called right before your setup function runs again, or when your component is removed from the layout. Avoid updating state values in effects, since it can lead to endless render loops if not done carefully.

## Widgets

The same custom formatters you've set up to work within your markdown notes can be embedded into these layouts as well. To do so, include an object with its '' prop set to the name of the formatter you wish to use. You will only be able to pass in props here, unlike in markdown, where it will also receive the preformatted text.

```demo
return ['h1', { className: 'greeting' }, // +
	{ '': 'capitalize', all: true, text: 'Hello, World!' }, // +
]; // +
```

## Data

The same code block used to render a custom layout for your note will also be used to wrap the layouts of child notes. An export can be set above your main heading to define additional fields for the child notes to pass in as props, along with their note content. These are read from the arguments variable, preferably at the top of your code block.

```
const [props, content] = arguments;
```

In their simplest form, each field definition follows the format of `Label /pattern/range Placeholder`. The label and placeholder are optional, and the pattern and range are given based on what the desired type should be.

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

Labels and placeholders can be included to provide better names to fields in the form, and instructions within the inputs.

```demo form
{
	string: 'String // Enter a string',
	number: 'Number /.. Enter a number',
	boolean: 'Boolean',
}
```

Objects can be used to group fields. Click the down arrow to expand them. The '' property is used to set a Label for the object in the form.

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

Sets of fields from other notes can be embedded by including a path before the pattern. These fields will be imported and used like any other object, but a dropdown will be included to pick from existing notes to prefill the values. These prefilled values can be overridden by clicking their label, or reset by clicking the close icon that appears next to the label. If you also provide a pattern, it will only include items in that dropdown which have names that match the pattern. If there are no options to choose from, the dropdown will not display, so you will need to create a [quest](/quest/) first for this particular example to show it.

```demo form
{
	quest: 'Quest /quest// Select a quest',
}
```

A field can be defined with a set of options to choose from by setting those options in an array, with the first definition being a boolean one for the field itself. This example only uses static values, but any other type can be used as well, and those additional fields will show up below the dropdown if selected.

```demo form
{
	color: ['Color / choose a color',
		'Red / #f00',
		'Green / #0f0',
		'Blue / #00f',
	],
}
```

Arrays of values can be defined by setting a range in the first definition of the array. Each item will show as a line in the text area, and can be removed or rearranged within that field. New items are added with the plus buttion, if there is only one option, or with a dropdown if there are more. Selecting text within this field will show the fields for those rows below the text area. That isn't working on this page, but you can view an example by editing one of the daily notes on the [journal](/journal/) page.

```demo form
{
	quests: ['Quests /..5 Choose a quest',
		'Quest /quest//',
	],
}
```

## Styles

CSS is used to style the HTML on your page, and can be set after your field definitions in the export block above your main heading.

````
```export
{}
img {
	width: 100%;
}
```
````

## Fetch

Fetch functions are available to help read ahd process your local content. These include `fetchNote`, to get the note as a string, `fetchData`, to get the fields for the note, `fetchCode`, to get the code module of the note, and `fetchList`, to get the names of all child notes. Like with the regular `fetch` function, starting the path with a `/` will read from the root of the site, instead of the current page. When fetching data, it will fully hydrate the references to other notes, and set the overrides where appropriate.
