# Stew
This library offers a steamlined way to create interactive websites. Components are written in plain text markup that resembles HTML. Conditions and loops are built into the syntax and elements update automatically when changes are made to the data that was used to render them.

## Components
Pass markup to have it parsed into a template object. Pass the template along with data to produce html.

```js
const component = stew('<p>{content}</>');
const html = stew(component, { content: 'Lorem ipsum.' });
```

## State
Pass a function to have it set up a state. This function must return the actions that will be used to modify the state. These actions can be used by components or called directly.

```js
const state = stew(state => ({
    toggleMenu: () => state.expanded = !state.expanded
}));

state.toggleMenu();
```

## Hydrate
Pass either markup or the template object to the state to hydrate any matching elements on the page. The original data will be extracted from each element it finds to populate the store. If any of this data is modified later on, the element will automatically update to reflect the changes.

```js
state(component);
```

## Markup
Any valid HTML will serve as markup for a component. Use curly braces in place of or next to quotes or within inner text to use values from the state. Be sure the root element has a class that is not conditional or is not the prefix for a conditional class (see below). This is needed to build the selector that finds elements to hydrate automatically. The tag name can be left out of the closing tag if you prefer.

```html
<div class="image">
	<img src="http://image.com/"{image}".jpg">
	<p>{caption}</>
</>
```

### Scope
You can use curly braces after the tag name and before any attributes to affect the scope of that element. If the new scope is undefined, the element will not render. If it is an array, an element will be rendered for each item. A dot can be used on its own to get the current index in the array. Keys in curly braces on an element that sets a scope will read from that new scope. The same will be true for its children. A dot can be placed before a key to read a value from the root state passed to the component. If a key is empty, it will use the scope as the value but only if it is a string, a number or a boolean value.

```html
<ul class="todo">
	<li {tasks}>
		{text}
		<a {url} href={}>{.label}</>
	</>
</>
```

### Conditions
A second value can be provided after the key in the curly braces to set a condition. These values should be separated by a space. If the value fetched from the state matches the expected value. It will return a boolean true value. If this condition is followed by quoted text, it will use that instead. Otherwise it will ignore the quoted text that immediately follows it. If a dot is used to compare the current index against a negative number, the array length will be added to that number first. If a dot is placed at the end of a key it will read the maximum index of an array.

```html
<div class="slideshow "{index 0}"start "{index slides.}"finish">
	<div {slides} class="slide "{. 0}"first "{. -1}"last "{.index .}"active">
		{text}
	</>
</>
```

### Listeners
Attributes that start will 'on' will be treated as listeners that respond to user input. Pass a key to one of the actions you created when setting up the store to set them up.

```html
<div class="accordion">
	<p {expanded true}>{text}</>
	<button type="button" onclick={slidePrev}>
		Show {expanded false}More{expanded true}Less
	</>
</>
```

## Compatibility
Pass a function in place of markup or template object to create a custom component. The function must accept a mount function and element as its first and second parameters. The remaining parameters will be whatever was passed to the custom component after the selector. Call the mount function first with the properties you wish to register to the state. Then call it with an update function that you wish to be called when those properties are modified. You can also call it with no parameters to have it stop listening to the state. The following example uses React.

```js
import React, { Component, Children, createElement } from 'react';
import { hydrate } from 'react-dom';
import Menu from './menu';

class Stew extends Component {
	constructor (props) {
		super(props);
		this.state = this.props.mount(this.setState.bind(this));
	}

	render () {
		return Children.map(this.props.children, ({ type }) => {
			return createElement(type, this.state);
		});
	}
}

const state = stew(state => ({
    toggleMenu: () => state.expanded = !state.expanded
}));

state((mount, element, props, Component) => {
	mount(props);
    hydrate(<Stew mount={mount}><Component /></Stew>, element.parentNode);
});

state('.menu', { expanded: false }, Menu);
state.toggleMenu();
```
