# Stew
This library offers a steamlined way to create interactive websites. Components are written in plain text markup that resembles HTML. Elements on the page automatically update when changes are made to the data that was used to render them.

## Components
Pass markup to have it parsed into a template object. Pass the template along with data to produce html.

```js
const component = stew('<p>{content}</p>');
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
Any valid HTML will serve as markup for a component. Use curly braces in place of or next to quotes or within inner text to use values from the state. You can also use curly braces after the tag name and before any attributes to affect the scope of that element. If the new scope is undefined, the element will not render. If it is an array, an element will be rendered for each item. A second value can be provided after the key in the curly braces to have the next quoted text render only if the value from the state matches the given value. If a key starts with a dot, it will ignore its current scope.

```html
<div>
	<img src="http://image.com/"{name}".jpg">
	<p {paragraphs}>{}</p>
	<a {link} href={url}>click here</a>
</div>
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
