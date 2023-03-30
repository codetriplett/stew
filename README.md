# Stew
A stateful virtual DOM for any purpose. It supports local states and refs, client-side hydration and effects, server-side rendering, and portals. The document used to create elements can be overriden to support whatever you want to display. The total uncompressed size is around 6kB and it does not rely on any other dependencies.

## Layouts
This library allows you to define your components declaratively, similar to libraries like React, except the layouts are written using simple data types. Functions can also be included to add dynamic sections that keep themselves updated automatically. Each of the following can exist in your layout wherever child nodes are allowed. Nullish and boolean false values will be ignored, and boolean true will maintain whatever existed previously in its place.

```js
'Hello World' // text node
['div', { ...attributes }, ...children] // element
['', state, ...children] // fragment
({ ...state }) => { ...dynamicContent } // component
element // preprocessed element (non-array objects only)
```

Whatever the component function returns will be rendered in its place. These can also be chained if necessary. Each function will maintain its own set of hooks, which are mentioned further down. Preprocessed elements are essentially DOM elements that you have created manually. They should allow you to include content that is controlled by other libraries, like React, if you wish.

## State
Component functions will receive the state object from their most immediate parent fragment and will automically subscribe to changes to props read from that state. This only applies to props read during their own execution and not ones read in async blocks, like event listeners. All state objects are global, the fragment just adds the convenience of supplying one as a param instead of referencing it directly. You can use any number of state objects within your functions, and the subscriptions will work the same. To create a state, use createState and pass in the initial values.

```js
stew.createState({ expanded: false }) // create state
stew.createState({ expanded: false }, 'state') // also adds a reference to itself under a name you choose
```

Since the state values are updated by setting them directly, adding a reference to itself is just a conveient way of maintaining this ability when destructuring the rest of its properites. Any changes made to either will dispatch those updates to functions that had used them, except when server-side rendering.

## Keys
DOM nodes are only created if there was no previous node to update, or if the previous one is incompatible with the type that needed. If you are changing the order of the child nodes, but want to maintain their references, include a key. Keys are set after the tag name, separated by a colon.

```js
['div:item-0', { ...attributes }, ...children] // element with key
[':item-0', null, ...children] // fragment with key
```

## Render
To render a layout, pass it to the stew function as the second parameter preceeded by the DOM element that should hold the content. If the container element already contains content, it will be hydrated instead of replaced when possible. A selector string can also be passed in to have stew locate the container element itself, but will be ignored on the server.

```js
const container = stew.createElement('div') // create container node
stew(container, [...layout]) // render container content
stew('#app', [...layout]) // render portal content
```

## useMemo
All hooks use this one at their core. It accepts a function and an optional dependency array and will only execute the function if any of the values in the dependency array have changed since the previous render. The callback will receive its previous return value and previous values of the dependency array as parameters. useMemo will return the new or previous return value of the callback function

### useEffect
This one works the same as useMemo, except the input function will wait to execute until all main rendering tasks have finished. It will also be ignored when server-side rendering. If its return value is a function, it will be called if the parent function maintaining this hook leaves the page.

## useImpulse
This one works the same as useMemo, except they will also subscribe to state changes, just like functions in your layouts. Also, just like component functions, they will not force their parent to execute again when state changes are detected for properties that only they have read from the state.

### Custom Documents
Stew can work on other document models beyond HTML. The fourth and final parameter passed to stew can be provided to override how DOM elements are created and updated. This paramter should be an array containing the new document object and updater function. The document object needs a 'createTextNode' function that accepts a string and returns an object containing that string as the 'nodeValue' prop, and a 'createElement' function that accepts a string and returns an object containing that string as the 'tagName' prop. 'createElement' also needs to have a 'childNodes' prop that is an array and 'appendChild', 'insertBefore', and 'removeChild' functions that add and remove nodes from that array.
