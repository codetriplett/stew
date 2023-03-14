# Stew

A stateful virtual DOM for any purpose. It supports local states and refs, client-side hydration and effects, server-side rendering, portals, and custom document models. The total uncompressed size is under 5kB and it does not rely on any other dependencies.

## Outlines

The data types encountered in your outline determine the type of node it will become. Strings and numbers will be treated as text, arrays will be treated as elements or fragments, objects will be treated as-is. Functions set up an active portion of your layout that automatically updates the DOM in response to state changes. Booleans and nullish values are ignored.

### Elements
The first and second value of an array are reserved for the element's type and attributes. The remaining values describe its children. A key can be set along with the type to ensure the same DOM node is used when making updates, even if its order changes within its parent layout.

```js
['div', { className: 'element' }, ...children]
['div:key', { className: 'element' }, ...children]
```

### Fragments
Fragments allow you to create a group of nodes that are added to the DOM without needing an extra element node to contain them. Keys are also supported to identify them, but unlike elements, no type is set.

```js
['', null, ...children]
[':key', null, ...children]
```

Since attributes don't apply to fragments, that part of the array can be used to add unique functionality. A new local state can be set by including an object in that space, which will set up the initial values.

```js
['', { expanded: false }, ...children]
```

Effects can also be set in place of a state to perform an action whenever the group is created or updated. They are only called client-side or when a custom document is used. The function will be passed an array containing the previous return value and an object of similar arrays for its children that have keys. If the effect returns a function, that function will be called when the fragment is destroyed.

```js
['', ref => {
	const prev = ref[0];
	if (!prev) console.log('fragment has mounted')
	else console.log('fragment has updated')
	return () => console.log('fragment has unmounted')
}, ...children]
```

### Impulses
Impulses are sections of the layout that respond to state changes. They are defined as functions and are passed their most immediate local state. Any top-level property read from this state during its execution will subscribe the function to changes to those properties, which will trigger an update. Updates only run client-side or when custom documents are used.

```js
({ expanded }) =>
	['p', {}, 'Hello World']
```

## Initializing
To initialize an outline into the DOM, simply call the stew function passing the container element as the first parameter, and the outline as the second. A string selector can be used to have stew find the container element itself, or create a new one with the necessary signature if none is found.

```js
import $ from '@triplett/stew'

const container = stew('#container', ['', {
	expanded: false,
	setExpanded (expanded) {
		this.expanded = expanded
	}
},
	['p', {}, 'Click the button'],
	({ expanded, setExpanded }) =>
		['button', {
			type: 'button',
			onclick: () => setExpanded(!expanded)
		}, expanded ? 'Collapse' : 'Expand'],
	({ expanded }) =>
		['p', {}, 'Hello World']
]
```

### custom document
A custom document object can be passed as the third parameter to set up a custom DOM. It just needs a 'createTextNode' function that accepts a string and returns an object containing that string as the 'nodeValue' prop, and a 'createElement' function that accepts a string and returns an object containing that string as the 'tagName' props. 'createElement' also needs to have a 'childNodes' prop that is an array and 'appendChild', 'insertBefore', and 'removeChild' functions that add and remove nodes from that array.
