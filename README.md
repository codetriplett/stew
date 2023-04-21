# Stew
This library manages stateful frontend layouts built for any purpose. It supports global and local states and refs, client-side hydration and effects, server-side rendering, portals, and basic testing. The total uncompressed size is under 7KB and requires no additional dependencies. It is highly extensible, and even allows the document to be overridden. Here is a quick overview, followed by more detail on each feature.

```js
// create a global state
const state = createState({ expanded: false });

// define a layout
const layout = () => ['', null,
	['button', {
		type: 'button',
		onclick: () => state.expanded = !state.expanded,
	}, state.expanded ? 'Collapse' : 'Expand'],
	state.expanded && ['p', {}, 'Hello World!'],
];

// render layout as detached fragment
const fragment = stew('', layout);

// render fragmetn as html on server
const html = String(fragment);
```

## Render
To render a layout, pass it to the stew function after the DOM element that should hold the content. If the container element already contains content, it will be hydrated instead of replaced. A selector string can also be passed in instead of an existing DOM element to have stew locate the container element itself. If the selector is an empty string, a new fragment will be created as the container. The fragment will also be returned from the stew function so you can append it where you need it to be.

```js
stew(container, layout) // render in provided container
stew('#app', layout) // render in portal elsewhere on the page (client-side only)
stew('', layout) // render in a new fragment (returns fragment container)
```

## Layouts
This library allows you to define your components declaratively, similar to libraries like React, except layouts are defined using arrays, objects, and strings. Functions can also be used in place of any of these to make a section of your layout dynamic, updating automatically in response to state changes. Nullish and boolean false values will be ignored, and boolean true will maintain whatever existed previously.

```js
'Hello World' // text node
['div', { ...attributes }, ...children] // element
['', state, ...children] // fragment
({ ...state }) => { ...dynamicContent } // component
element // preprocessed element (non-array objects only)
```

Functions return their own portion of the layout, and have access to values that can persist between renders (see memoization section further down). Preprocessed elements are essentially DOM elements that have already been created. They allow you to include content that is controlled by other libraries, like React, if you wish.

### Attributes
The names of attributes you set follow their property names in JavaScript, not what would normally be set in HTML, and need to honor the data types JavaScript expects for those properties. The key property is also available to help maintain references to the DOM nodes, even if the order of items in your layout has changed. The ref property will allow you store the rendered node for later use.

```js
['div', { key: 'item-0', ...attributes }, ...children] // maintain DOM reference using key prop
['div', { ref: refArray, ...attributes }, ...children] // push DOM node to an array using ref prop
['', { key: 'item-0', ref: refArray }, ...children] // work with fragments as well, but ref will store parent node
```

## createState
Component functions in your layout will automically subscribe to changes to the properties of any states it reads while rendering, and update when those properties change. To create a state, pass its initial values to the createState function. States are global by nature, but can be passed internally within your layout using contexts (see that section for more info).

```js
const state = stew.createState({ expanded: false }) // create state
const state = stew.createState({ ... }, ['speed']) // add cue propes
```

Cue props are ones that reset to undefined after the layout has updated and are only really useful for custom documents, like ones that have built-in physics.

## Memoization
Component functions are provided an array that values can be stored to and be retrieved from on the next render. This allows you identify when the component has first rendered, or when a specific property has chagned by storing its value in one render and comparing in the next. Detecting changes is a good way to prevent code from running unless you know it needs to update a value it may have created previously.

```js
// on mount example
memos => {
	if (!memos.length) {
		memos.push(expensiveObject);
	}
}

// on update example that detects change
memos => {
	if (state.speaker !== memos[0]) {
		memos[0] = state.speaker;
		console.log('Hello', state.speaker);
	}
}
```

## Contexts
A context prop can be used for fragments to store a value to pass to all of its component functions. This is a good way to store a state, or collection of states, for nested code to use without having to pass them through many layers of function calls. If a fragment does not set a context prop, it will continue to use the value of its parent component function for its children.

```js
['', { context: state }, ...children] // sets state for child component functions
['', { context: { gameState, uiState } }, ...children] // sets multiple states
(memos, context) => { ... } // context will be passed to component functions as the second parameter
```

## onRender
You may have code that you want to delay and run as a follow-up to your layout updates. This can be be done by using the onRender function. It will accept a function that will run once the current rendering task has finished and returns a promise that resolves with that callback's return value. If the return value is a function, it will also be treated as a teardown function for the component. Teardown functions run when the component unmounts, or is no longer a part of the layout. onRender does not require a callback function if you just want to know when the render has completed, like in your unit tests.

```js
// set up subscriptions
(memos, context) => {
	if (!memos.length) {
		// schedules code to run after initial render completes
		onRender(() => {
			...setup;
			return () => { ...teardown };
		});

		// set a value to memos array to prevent onRender from being called on update
		memos[0] = true;
		// the memos array can be used however you want to control when onRenders run
	}
}

// standalone effect (callback is optional)
await onRender();
// waits for next render of any active layout
```

## Testing
The simulated document used by the server can be overriden to support unit testing. Pass a third param to define a custom document. This is will be explained further in the next section, but for now, an empty array will be enough to unlock testing features, even on the client.

```js
// override flag to enforce simulated document is used in client mode
const actual = stew('', [...layout], []);

// basic support exists for querySelector
const button = actual.querySelector('button');
expect(String(actual)).toEqual('<button type="button">Expand</button>');
// any down within the simulated DOM will become HTML when converted to a string

// call event listener directly to simulate its action
button.onclick();
await stew.onRender();
expect(String(actual)).toEqual('<button type="button">Collapse</button><p>Hello World!</p>');
// attributes will exist in alphabetical order when running in this mode
```

## Custom Documents
Stew can work with other document models beyond HTML. The third and final parameter passed to stew can be provided to override how DOM elements are created and updated. This parameter should be an array containing the new document object, updater function, and an object of default attributes for elements. The default attributes object will be filled in automatically as new elements are created if that element's type is missing. The document object needs a 'createTextNode' function that accepts a string and returns an object containing that string as the 'nodeValue' prop, and a 'createElement' function that accepts a string and returns an object containing that string as the 'tagName' prop. 'createElement' also needs to have a 'childNodes' prop that is an array and 'appendChild', 'insertBefore', and 'removeChild' functions that add and remove nodes from that array.

```js
stew(container, layout, framework) // use a custom document and updater function
stew(container, layout, []) // ensure simulated dom is used
stew(container, layout, [document]) // partial override of simulated dom
```
