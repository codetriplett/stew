# Stew

A stateful virtual DOM for any purpose. It supports local states and refs, client-side hydration and effects, server-side rendering, portals, and custom document models. The total uncompressed size is less than 6kB and it does not rely on any other dependencies.

## Layouts

The data types encountered in your layout determine the type of node it will become. Strings and numbers will be treated as text, arrays will be treated as elements or fragments, objects will be treated as-is. Functions set up an active portion of your layout that automatically updates the DOM in response to state changes. Boolean false and nullish values are ignored. Boolean true maintains whatever existed in its place in the previous render, which is useful for skipping an update within a function or keeping a static DOM node during hydration without having to redefine the data and layout used to generate it.

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

#### States
Since attributes don't apply to fragments, that part of the array can be used to add unique functionality. A new local state can be set by including an object in that space, which will set up the initial values. See the section later on about how to set up global states that can be shared across layouts.

```js
['', {
	expanded: false,
	setExpanded (expanded) {
		this.expanded = expanded;
	}
}, ...children]
```

#### Effects
Effects can also be set in place of a state to perform an action whenever the group is created or updated. They are only called client-side or when a custom document is used. The function will be passed an array containing the previous return value and an object of similar arrays for its children that have keys. If the effect returns a function, that function will be called when the fragment is destroyed.

```js
['', ref => {
	const prev = ref[0];
	if (!prev) console.log('fragment has mounted')
	else console.log('fragment has updated')
	return () => console.log('fragment has unmounted')
}, ...children]
```

#### Memoization
Allowing Stew to handle all updates automatically may be fast enough in most cases, but there is a method of informing the layout if it even needs to try for sections you choose. Simply pass in an array of all the variables used within a fragment to have it compare those values between renders. If none of them have changed, it will skip over processing the contents of the fragment.

```js
['', [expanded], ...children]
```

### Impulses
Impulses are sections of the layout that respond to state changes. They exist in your layout as functions and are passed the latest state of their closest parent that had one defined. Any top-level property read from this state during execution will subscribe the function to changes to those properties, which will trigger an update. Updates only run client-side or when custom documents are used.

```js
({ expanded }) =>
	['p', {}, 'Hello World']
```

## Initializing
To initialize a layout into the DOM, simply call the stew function passing the container element as the first parameter, and the layout as the second. A string selector can be used to have stew find the container element itself, or create a new one with the necessary signature if none is found.

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

### Contexts
Contexts behave similarly to local states, but can be used in any place within a layout, or even between separate layouts, to create a global state. Pass an object as the only param to the stew function to create one and reference this state anywhere within your layout. Any properties read from this state will subscribe that impulse function to subscribe to changes and any new values set to those properties will cause all subscribed functions to update.

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

### Setter
As a shortcut for creating setter functions in your state, pass the name of the value you want the setter to update.

```js
['', {
	expanded: false,
	setExpanded: stew('expanded')
}, ...children]
```

### custom document
A custom document object can be passed as the third parameter to set up a custom DOM. It just needs a 'createTextNode' function that accepts a string and returns an object containing that string as the 'nodeValue' prop, and a 'createElement' function that accepts a string and returns an object containing that string as the 'tagName' props. 'createElement' also needs to have a 'childNodes' prop that is an array and 'appendChild', 'insertBefore', and 'removeChild' functions that add and remove nodes from that array.
