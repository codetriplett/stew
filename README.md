# Stew
A stateful virtual DOM for any purpose. It supports local states and refs, client-side hydration and effects, server-side rendering, and portals. The document model used to create elements can be overriden to support whatever you want to display. The total uncompressed size is 6kB and it does not rely on any other dependencies.

## Layouts
For those familiar with the type of declarative programming used by libraries like React, here is a short overview of the similar features supported by Stew. Each of the following can exist in your layout wherever child nodes are allowed. Nullish and boolean false values will be ignored, while boolean true will maintain whatever existed previously in its place.

```js
'Hello World' // text node
['div', { ...attributes }, ...children] // element
['', null, ...children] // fragment
['', { ...props }, ...children] // use state
['', () => { ...effect }, ...children] // use effect
['', [...memo], ...children] // use memo
({ ...state }) => { ...dynamicContent } // component
element // preprocessed element (objects only)
```

## Keys
DOM nodes are only created if there was no previous node to update, or if the previous one is incompatible. If you are changing the order of the child nodes, but want to maintain their references, include a key. Keys are set after the tag name, separated by a colon, and can be whatever text you wish.

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

## States
In place of attributes for fragments, an object can be set to create a new local state. This will be passed to all component functions found at any level within the fragment unless overriden by another local state. Component functions will automatically subscribe to changes to properties they read within the state while rendering. To dispatch an update to the subscribed functions, simply update the propert value of the state. An object can be passed to the stew function as the only parameter, to create a global state. These behave just like local states, execept they can be used by any layout.

```js
['', { ...props }, ...children] // use local state
const state = stew({ ...props }) // create global state
```

## Effects
A function can be set in place of a state object to define an effect. This is code that should run right after the fragment's content has rendered. It is passed the view ref of the fragment, where references to the actual DOM elements can be accessed. View refs are arrays where the first value is the previous return value of the effect and the second value is an object of all child elements that has set keys. Child refs follow this same structure, allowing you to access deeply nested DOM references. If the effect returned another function, it will be called once the fragment leaves the DOM.

```js
['', () => { ...effect }, ...children] // use effect
```

## Memoization
An array can be set in place of a state object to memoize the fragment. The values in the array will be compared with their values during the last render, and if they are identical, all component functions in the fragment will use persist their previous values. While, not strictly necessary, this will allow you to optimize your code by preventing unnecessary processing, but does require you to keep the memo array updated with all the dynamic values used within the fragments components.

```js
['', [...memo], ...children] // use memo
```

### Custom Documents
Stew can work on other document models beyond HTML. The fourth and final parameter passed to stew can be provided to override how DOM elements are created and updated. This paramter should be an array containing the new document object and updater function. The document object needs a 'createTextNode' function that accepts a string and returns an object containing that string as the 'nodeValue' prop, and a 'createElement' function that accepts a string and returns an object containing that string as the 'tagName' prop. 'createElement' also needs to have a 'childNodes' prop that is an array and 'appendChild', 'insertBefore', and 'removeChild' functions that add and remove nodes from that array.
