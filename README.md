# Stew
This library manages stateful frontend layouts built for any purpose. It supports global and local states and refs, client-side hydration and effects, server-side rendering, portals, and basic testing. The total uncompressed size is under 7KB and requires no additional dependencies. It is highly extensible, and even allows the document to be overridden.

## Quick Pitch
For those already familiar with declarative layout management libraries, here is an example of how a basic layout would be authored using Stew.

```js
// creates a global state
const state = createState({ expanded: false });

// creates an active fragment to append somewhere on your page
const actual = stew('', () => ['', null,
	['button', {
		type: 'button',
		onclick: () => state.expanded = !state.expanded,
	}, state.expanded ? 'Collapse' : 'Expand'],
	state.expanded && ['p', {}, 'Hello World!'],
]);
// functions will automatically subscribe to props read from state
```

## Testing
The code above on both the server and client environment. The server will use a simulated DOM whose nodes are converted to HTML when cast to strings. Dynamic aspects of the library are skipped while server rendering, but this behavior can be overridden to support unit testing client-side functionality.

```js
// override flag to enforce client mode (not necessary when running in actual browser)
stew.isServer = false;
const actual = stew('', [...layout], []);
// empty array as third param ensures the simulated dom is used

// basic support exists for querySelector and all nodes stringify into HTML
const button = actual.querySelector('button');
expect(String(actual)).toEqual('<button type="button">Expand</button>');

// onRender returns a promise that resolves when the layout has been updated
button.onclick();
await stew.onRender();
expect(String(actual)).toEqual('<button type="button">Collapse</button><p>Hello World!</p>');
// attributes will exist in alphabetical order when running simulated dom in client mode
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
The names of attributes you set follow their property names in JavaScript, not what would normally be set in HTML, and need to honor the data types JavaScript expects for those properties. For example, setting tabIndex as a number instead of a string will lead to unexpected results, but boolean attributes, like 'selected', should not be cast to strings. However, names that contain dashes will be processed as HTML attributes instead of properties.

### Keys
DOM nodes are only created if there was no previous instance to update, or if the previous one is incompatible with the type that needed. If you are changing the order of the child nodes, but want to maintain their references, include a key. Keys are set after the tag name, separated by a colon.

```js
['div:item-0', { ...attributes }, ...children] // element with key
[':item-0', null, ...children] // fragment with key
```

### Refs
Ref properties provide access to DOM elements created from your layout. You can pass it a function that will receive the DOM element as a parameter, or you can pass it an array that you want the element pushed to. Elements are stored after the layout has been processed but can be accessed by code that you have delayed, such as event listeners or effects.

```js
const ref = [];
['div', { ref }, ...children] // add node to existing ref array
['div', { ref: node => { ... } }, ...children] // pass node to callback
```

## createState
Component functions in your layout will automically subscribe to changes to the props of any states it reads while rendering. To create a state, pass its initial values to the createState function. States aren't tied to any component and can be used anywhere within your layout. States can be set in fragments in place of an attributes object to have it pass that state along to any component functions that reside within it.

```js
const state = stew.createState({ expanded: false }) // create state
const state = stew.createState({ ... }, ['speed']) // add cue propes

// set the state for child components to receive as a parameter
['', state, ...children]
// it isn't necessary for states to be passed along this way, but it can be convenient
```

Cue props are ones that reset to undefined after the layout has updated and are only really useful for custom documents, like ones that have internal physics.

## Memoization
Component functions are provided an array after the state param. This array can hold whatever values you need to persist between renders. It can be used to support memoization by storing a set of parameters from the previous render and the value that was produced by them.

```js
// on mount example
(state, memos) => {
	if (!memos.length) {
		memos.push(expensiveObject);
	}
}

// on update example that detects change
(state, memos) => {
	if (state.speaker !== memos[0]) {
		memos[0] = state.speaker;
		console.log('Hello', state.speaker);
	}
}
```

## onRender
You may have code that you want to delay and run as a follow-up to your layout updates. This can be be done by using the onRender function. It will accept a function that will run once the current rendering task has finished and returns a promise that resolves with that callback's return value. If the return value is a function, it will also be treated as a teardown function for the component. Teardown functions run when the component unmounts, or is no longer a part of the layout. onRender does not require a callback function if you just want to know when the render has completed, like in your unit tests.

```js
// set up subscriptions
(state, memos) => {
	if (!memos.length) {
		// schedules code to run after initial render completes
		memos[0] = onRender(() => {
			...setup;
			return () => { ...teardown };
		});
		// promise is stored to memo in this case to prevent effect from running again
	}
}

// standalone effect (callback is optional)
await onRender();
```

## Custom Documents
Stew can work with other document models beyond HTML. The third and final parameter passed to stew can be provided to override how DOM elements are created and updated. This parameter should be an array containing the new document object, updater function, and an object of default attributes for elements. The default attributes object will be filled in automatically as new elements are created if that element's type is missing. The document object needs a 'createTextNode' function that accepts a string and returns an object containing that string as the 'nodeValue' prop, and a 'createElement' function that accepts a string and returns an object containing that string as the 'tagName' prop. 'createElement' also needs to have a 'childNodes' prop that is an array and 'appendChild', 'insertBefore', and 'removeChild' functions that add and remove nodes from that array.

```js
stew(container, layout, framework) // use a custom document and updater function
stew(container, layout, []) // ensure simulated dom is used
stew(container, layout, [document]) // partial override of simulated dom
```
