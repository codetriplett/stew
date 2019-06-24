# Stew
This library provides a streamlined way to hydrate elements and maintain their states using a central store of data. Updating the central store directly will cause the appropriate elements to update. All setup is achieved through the use of a single function.

## Initialize State
A state is created by providing an actions function. This function provides access to the state so the actions can make modifications. These actions can be accessed directly from the state that is returned.

```js
const state = stew(state => ({
    toggleMenu: () => state.expanded = !state.expanded
}));

state.toggleMenu();
```

## Register Components
Each component is set up with a mount function. This function is called whenever an existing element needs to be hydrated. The first parameter is the update function. When a function is passed to the update function, it will be called whenever the properties for that component change. The update function also adds the properties for the component to the state and returns those properties so they can be used in the initial render.

```js
const component = state((update, element) => {
	const props = update(state => {
		element.className = state.expanded ? 'expanded' : '';
	});

	element.addEventListener('click', () => props.toggleMenu());
});
```

## Hydrate Elements
Pass a selector and properties to the component function to hydrate existing elements. The mount function shown above will be called for each element the selector locates. The main stew function can be used to extract data from each element to build its properties. The properties will be added to the central store and any updates to these properties will trigger the element to update. Additional parameters you provide will be passed to the mount function after the element.

```js
component('.menu', {
	expanded: false, // literal property
	// the properties below will read from each '.menu' element
	href: stew('href'), // its href attribute
	disabled: stew('disabled?'), // a boolean attribute
	value: stew(), // its inner text
	// an additional selector can be used to locate a child element
	type: stew('.toggle', 'type'), // the type attribute of a child element
	expandable: stew('.toggle', '?'), // a boolean indicating if child exists
	label: stew('.toggle'), // the inner text of a child element
	// an array will be returned if the selector ends with an asterisk
	links: stew('.links*', {
		url: stew('href'), // the href of the current child element
		text: stew() // the inner text of the current child element
	}),
	// classes in the selector will be removed from the class attribute
	status: stew('.toggle', 'class') // will exclude 'toggle' from value
});
```

## Combining Calls
Each stage in the examples above return a function that accepts parameters to define the next stage. If you only have one component that uses the state or one selector that captures all elements that use a component, you can pass them all immediately. The actions will still be available on the function returned.

```js
const state = stew(state => ({
    toggleMenu: () => state.expanded = !state.expanded
}), (update, element) => {
	const props = update(state => {
		element.className = state.expanded ? 'expanded' : '';
	});

	element.addEventListener('click', () => props.toggleMenu());
}, '.menu', {
	expanded: false
});

state.toggleMenu();
```

## React or Other Libraries
You can use any third party library to render your components as long as they provide a function that can be called to update them. The following shows how to make this work with React components. The Stew wrapper component shown here is just an example. You can create your own to serve your needs.

```js
import React, { Component, Children, createElement } from 'react';
import { hydrate } from 'react-dom';
import Menu from './menu';

class Stew extends Component {
	constructor (props) {
		super(props);
		this.state = this.props.update(this.setState.bind(this));
	}

	render () {
		return Children.map(this.props.children, ({ type }) => {
			return createElement(type, this.state);
		});
	}
}

const state = stew(state => ({
    toggleMenu: () => state.expanded = !state.expanded
}), (update, element, Component) => {
    hydrate(<Stew update={update}><Component /></Stew>, element.parentNode);
});

state('.menu', { expanded: false }, Menu);
state.toggleMenu();
```
