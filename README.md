# Stew

A stateful virtual DOM for any purpose. It supports local states and refs, client-side hydration and effects, server-side rendering, portals, and custom document models (see 2D graphics example). The total size is under 5kB (uncompressed), and it does not rely on any other dependencies.

## Outlines

The type of data encountered for children in your outline determines the type of node it will become. Strings and numbers will be treated as text nodes, arrays will be treated as element nodes or fragments, objects will be treated as-is. Functions set up an active portion of your layout that will automatically subscribe to state properties it reads from and updates when any of those properties are changed.

### Elements
The first and second value are reserved for the elements type and attributes. The remaining values set its children. Booleans and nullish values are ignored. A key can be set along with the tag to ensure the reference to the DOM node and this outline is maintained between renders, even if its order within its parent node is changed.

```js
['div', { className: 'element' }, ...children]
['div:key', { className: 'element' }, ...children]
```

### Fragments
Fragments allow you to create a group of children that will be place under the most immediate parent element. They are a useful way of affecting a set of nodes without having to create an unnecessary container element. Like with elements, keys are also supported.

```js
['', null, ...children]
[':key', null, ...children]
```

A new local state can be set by including an object of default values as its 'attributes'. Only the children of this fragment will have access to this new state and only the properties included in this initial state will be active.

```js
['', { expanded: false }, ...children]
```

Effects can also be set in place of states within a fragment to perform an action whenever the group is updated. They are only called client-side or when a custom document is used. The fragment's ref is passed as the only parameter. Refs are arrays containing the DOM element (or previous effect return value for fragments) and child refs by key, with the remaining values listing all child refs in their proper order. If the effect returns a function, that function will be called when the group leaves the DOM. 

```js
['', ref => {
	const prev = ref[0];
	if (!prev) console.log('fragment has mounted')
	else console.log('fragment has updated')
	return () => console.log('fragment has unmounted')
}, ...children]
```

### Impulses
Impulses are child nodes that respond to state changes. They are defined as functions with their most immediate local state as the only parameter. Any top-level property read from this state during render will subscribe the function to changes to those properties, which will trigger an update. Updates only run client-side or when custom documents are used.

```js
({ expanded }) =>
	['p', {}, 'Hello World']
```

## Initializing
To initialize an outline into the DOM, simply call the stew function with the first parameter as the container element, and the second paramater as the outline for its content. A selector can be used to have stew find the container element itself, or create a new one with the necessary signature if none is found.

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
Show 2D example here
