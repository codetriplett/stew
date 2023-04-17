# Stew
This library manages stateful fontend layouts built for any purpose. It supports global and local states and refs, client-side hydration and effects, server-side rendering, portals, and basic testing. The total uncompressed size is 7.5KB and requires no additonal dependencies. It is highly extensible, and even allows the document to be overriden.

## Quick Pitch
For those already familiar with declarative layout management libraries, here is an example of how a basic layout would be authored using Stew.

```js
// creates a global state
const state = useState({ expanded: false });

// creates an active fragment
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
The code above applies to both the server and client environment. The server will use a simulated dom whose nodes are converted to HTML when cast to strings. Dynamic aspects of the library are skipped while server rendering, but this behavior can be overriden to unit test layout changes.

```js
// override flag to enforce client mode (not necessary when running in actual browser)
stew.isServer = false;
const actual = stew('', [...layout], []);
// empty array as third param ensures the simulated dom is used

// basic support exists for querySelector and all nodes stringify into HTML
const button = actual.querySelector('button');
expect(String(actual)).toEqual('<button type="button">Expand</button>');

// useEffect returns a promise that resolves when the layout has been updated
button.onclick();
await useEffect();
expect(String(actual)).toEqual('<button type="button">Collapse</button><p>Hello World!</p>');
// attributes will exist in alphabetical order when running simulated dom in client mode
```

## Render
To render a layout, pass it to the stew function after the DOM element that should hold the content. If the container element already contains content, it will be hydrated instead of replaced. A selector string can also be passed in instead of an existing DOM element to have stew locate the container element itself. This will be ignored when server-side rendering, and can be used to simulate a portal into another part of your page. If the selector is an empty string, a new fragment will be created as the container. The fragment will also be returned from the stew function so you can append it where you need it to be.

```js
stew(container, layout) // render in provided container
stew('#app', layout) // render in portal elsewhere on the page (client-side only)
stew('', layout) // render in a new fragment (returns fragment container)
```

## Layouts
This library allows you to define your components declaratively, similar to libraries like React, except layouts are completely defined using arrays, objects, and strings. Functions can also be used in place of any of these to make a section of your layout dynamic, updating automatically in response to state changes. Nullish and boolean false values will be ignored, and boolean true will maintain whatever existed previously.

```js
'Hello World' // text node
['div', { ...attributes }, ...children] // element
['', state, ...children] // fragment
({ ...state }) => { ...dynamicContent } // component
element // preprocessed element (non-array objects only)
```

Functions return their own portion of the larger layout, and have access to values that can persist between renders (see useMemo section further down). Preprocessed elements are essentially DOM elements that have already been created. They allow you to include content that is controlled by other libraries, like React, if you wish.

### Attributes
The names of attributes you set follow their property names in JS, not what would normally be set in HTML, and need to honor the data types JavaScript expects for those properties. For example, setting tabIndex as a number instead of a string will lead to unexpected results, but boolean attributes, like 'selected', should not be cast to strings. However, names that contain dashes will be processed as HTML attributes instead of properties.

### Keys
DOM nodes are only created if there was no previous instance to update, or if the previous one is incompatible with the type that needed. If you are changing the order of the child nodes, but want to maintain their references, include a key. Keys are set after the tag name, separated by a colon.

```js
['div:item-0', { ...attributes }, ...children] // element with key
[':item-0', null, ...children] // fragment with key
```

### Refs
Ref attributes provide access to DOM elements created from your layout. You can pass it a function that will receive the DOM element as a parameter, or you can pass it an array that you want the element pushed to. Elements are stored after the layout has been processed but can be accessed by code that you have delayed, such as event listeners or effects. See the useMemo section for more info on effets.

```js
const ref = [];
['div', { ref }, ...children] // add node to existing ref array
['div', { ref: node => { ... } }, ...children] // pass node to callback
```

## useMemo
All hooks use this one at their core. It accepts a function and an optional dependency array and will only execute the function if any of the values in the dependency array have changed since the previous render. The callback will receive its previous return value and previous values of the dependency array as parameters. useMemo will return the new or previous return value of the callback function.

```js
// call function only if memoDependencies differ from what they were when this ran previously
const value = stew.useMemo((prevValue, ...prevDependencies) => {
	...createValue
}, [...memoDependencies])
// value will remain the same as it was in the previous render if function passed to useMemo isn't called
```

### useEffect
This one works the same as useMemo, except the input function will wait for all current rendering tasks to finish. It will also be ignored when server-side rendering. If its return value is a function, that function will be called if the parent component maintaining this hook leaves the page. useEffect itself returns a promise that resolves when the effect has completed and the layout has updated.

### useState
This one works the same as useMemo, except it will use the return value to set up a new state. Component functions in your layout will automically subscribe to changes to the props of any states it reads while rendering.

```js
stew.useState({ expanded: false }) // create state
stew.useState('state', { expanded: false }) // also adds a reference to itself under a name you choose
stew.useState((...memoParams) => ({ expanded: false }), [...memoDependencies]) // memoize state
```

Since the state values are updated by setting them directly, adding a reference to itself is just a conveient way of maintaining this ability when destructuring the rest of its properites. Any changes made to either one will dispatch those updates to functions that had used them, except when server-side rendering.

## Custom Documents
Stew can work with other document models beyond HTML. The third and final parameter passed to stew can be provided to override how DOM elements are created and updated. This parameter should be an array containing the new document object, updater function, and an object of default attributes for elements. The default attributes object will be filled in automatically as new elements are created if that elements type is missing. The document object needs a 'createTextNode' function that accepts a string and returns an object containing that string as the 'nodeValue' prop, and a 'createElement' function that accepts a string and returns an object containing that string as the 'tagName' prop. 'createElement' also needs to have a 'childNodes' prop that is an array and 'appendChild', 'insertBefore', and 'removeChild' functions that add and remove nodes from that array.

```js
stew(container, layout, framework) // use a custom document and updater function
stew(container, layout, []) // ensure simulated dom is used
stew(contaienr, layout, [document]) // partial override of simulated dom
```

### Cues
Cues are short-lived state properties. The values set to them only stay active during the next round of rendering before they reset to undefined. They can be useful for custom documents that makes changes to an element's properties outside of what the layout has described, like setting the initial speed of an object and letting gravity affect it from that point on. They are defined on the state by setting an initial value on the property that will become the states self reference (see useState for more info on that). Cues can be used in dependency arrays, but should be flagged so only their intentional values count as changes. An integer can be passed in after a dependency array to specificy the number of cues at the start of the array.

```js
stew.useState('state', { state: ['verticalSpeed'] }) // sets up 'verticalSpeed' as a cue property
stew.useMemo(() => { ... }, ['verticalSpeed', 'other'], 1) // ignores undefined values for the first n items in dependency array
```
