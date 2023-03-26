# Stew
A stateful virtual DOM for any purpose. It supports local states and refs, client-side hydration and effects, server-side rendering, and portals. The document model used to create elements can be overriden to support whatever you want to display. The total uncompressed size is around 6kB and it does not rely on any other dependencies.

## Layouts
For those familiar with the type of declarative programming used by libraries like React, here is a short overview of the similar features supported by Stew. Each of the following can exist in your layout wherever child nodes are allowed. Nullish and boolean false values will be ignored, while boolean true will maintain whatever existed previously in its place.

```js
'Hello World' // text node
['div', { ...attributes }, ...children] // element
['', null, ...children] // fragment
['', { ...state }, ...children] // use state
['', () => { ...effect }, ...children] // use effect
['', [...memo], ...children] // use memo
({ ...state }) => { ...dynamicContent } // component
element // preprocessed element (objects only)
```

DOM nodes are only created if there was no previous node to update, or if the previous one is incompatible. If you are changing the order of the child nodes, but want to maintain their references, include a key. Keys are set after the tag name, separated by a colon, and can be whatever text you wish.

```js
['div:item-0', { ...attributes }, ...children] // element with key
[':item-0', null, ...children] // fragment with key
```

## Render and Hydrate
To render a layout, pass it to the stew function as the second parameter preceeded by the DOM element that should hold the content. A selector string can be passed in place of an element to have stew locate the element itself, but it must contain a dot or hash symbol. If the container element already contains content, it will be hydrated instead of replaced. The end result will still match the layout you set, but child nodes will only be created or updated when necessary.

```js
stew('#app', [...layout]);
```

## Local and Global States
In place of attributes for fragments, an object can be set to create a new local state. This will be passed to all component functions found at any level within the fragment unless overriden by another local state. Component functions will automatically subscribe to changes to properties they read within the state while rendering. To dispatch an update to the subscribed functions, simply update the propert value of the state. An object can be passed to the stew function as the only parameter, to create a global state. These behave just like local states, execept they can be used by any layout.

## Effects and Memoization
A function can be set in place of a state object to define an effect. This is code that should run right after the fragment's content has rendered. It is passed the view ref of the fragment, where references to the actual DOM elements can be accessed. View refs are arrays where the first value is the previous return value of the effect and the second value is an object of all child elements that has set keys. Child refs follow this same structure, allowing you to access deeply nested DOM references. If the effect returned another function, it will be called once the fragment leaves the DOM.

An array can be set in place of a state object to memoize the fragment. The values in the array will be compared with their values during the last render, and if they are identical, all component functions in the fragment will use persist their previous values. While, not strictly necessary, this will allow you to optimize your code by preventing unnecessary processing, but does require you to keep the memo array updated with all the dynamic values used within the fragments components.

## Portals and Cross Compatibility
The container element will be returned from the stew function when called, and since layouts treat non-array objects as preprocessed elements, you can include a stew call as a child within another layout to simulate a portal. Preprocessed elements that already exist within the DOM under a different parent element will not be moved, but its contentn will be updated. Pass a local state object as the third param to the stew function to share it with the nested layout. Also, DOM elements can be included even if they aren't controlled by Stew. This means you can include nested content that is controlled by another library, such as React.

### Custom Document
Stew can work on other document models beyond HTML. The fourth and final parameter passed to stew can be provided to override how DOM elements are created and updated. This paramter should be an array containing the new document object and updater function. The document object needs a 'createTextNode' function that accepts a string and returns an object containing that string as the 'nodeValue' prop, and a 'createElement' function that accepts a string and returns an object containing that string as the 'tagName' prop. 'createElement' also needs to have a 'childNodes' prop that is an array and 'appendChild', 'insertBefore', and 'removeChild' functions that add and remove nodes from that array.
