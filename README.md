# Stew
A stateful virtual DOM for any purpose. It supports local states and refs, client-side hydration and effects, server-side rendering, and portals. The document used to create elements can be overriden to support whatever you want to display. The total uncompressed size is only 7.5kB, and it does not rely on any other dependencies.

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
Ref attributes provides access to DOM elements created from your layout. You can pass it a function that will receive the DOM element as a parameter, or you can pass it an array that you want the element pushed to. Elements are stored after the layout has been processed but can be accessed by code that you have delayed, such as event listeners or effects. See the useMemo section for more info on effets.

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
This one works the same as useMemo, except the input function will wait for all current rendering tasks to finish. It will also be ignored when server-side rendering. If its return value is a function, that function will be called if the parent component maintaining this hook leaves the page.

### useState
This one works the same as useMemo, except it will use the return value to set up a new state. Components will receive the state object from their most immediate parent fragment and will automically subscribe to changes to the props it reads while rendering. State objects can be created at any level and can be used by any component in the layout, whether or not they were passed as a parameter.

```js
stew.useState({ expanded: false }) // create state
stew.useState({ expanded: false }, 'state') // also adds a reference to itself under a name you choose
stew.useState((...memoParams) => ({ expanded: false }), [...memoDependencies]) // memoize state
stew.useState((...memoParams) => ({ expanded: false }), 'state', [...memoDependencies]) // add reference to itself and memoize
```

Since the state values are updated by setting them directly, adding a reference to itself is just a conveient way of maintaining this ability when destructuring the rest of its properites. Any changes made to either one will dispatch those updates to functions that had used them, except when server-side rendering.

### useImpulse
This one works the same as useMemo, except they will also subscribe to state changes, just like component functions in your layouts. Also, just like component functions, they will not force their parent to execute again when state changes are detected for properties that only they have read from the state.

## Custom Documents
Stew can work with other document models beyond HTML. The third and final parameter passed to stew can be provided to override how DOM elements are created and updated. This paramter should be an array containing the new document object, updater function, and an object of default attributes for elements. The default attributes object will be filled in automatically as new elements are created if that elements type is missing. The document object needs a 'createTextNode' function that accepts a string and returns an object containing that string as the 'nodeValue' prop, and a 'createElement' function that accepts a string and returns an object containing that string as the 'tagName' prop. 'createElement' also needs to have a 'childNodes' prop that is an array and 'appendChild', 'insertBefore', and 'removeChild' functions that add and remove nodes from that array.

```js
stew(container, layout, framework) // use a custom document and updater function
```

### Cues
Cues are short-lived state properties. The values set to them only stay active during the next round of rendering before they reset to undefined. They can be useful for custom documents that makes changes to an element's properties outside of what the layout has described, like setting the initial speed of an object and letting gravity affect it from that point on. They are defined on the state by setting an initial value on the property that will become the states self reference (see useState for more info on that).

```js
stew.useState({ state: ['verticalSpeed'] }, 'state') // sets up 'verticalSpeed' as a cue property
stew.useMemo(() => { ... }, ['verticalSpeed', 'other'], 1) // ignores undefined values for the first n items in dependency array
```
