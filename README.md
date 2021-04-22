# Stew
Interactive HTML from a single function. It supports local states, client side hydration and effects, server side rendering and tagged templates.

```js
import $ from '@triplett/stew';

// render html or DOM node
const htmlOrNode = $({ '': tagOrNode, ...props }, ...content)

// define item to pass as content
const outline = $(tag, props, ...content)

// tagged templates
const elementOutline = $`<div ${props} name="value">content</>`
const componentOutline = $`<${Component} ${props} name="value">content</>`

```

Server side HTML will render if you pass in a string as the the tagOrNode value above. Passing in a DOM node will update its attributes and children. If that node already contains children, they won't be replaced as long as they match up with the content definitions you have provided.

## tag
A string of the type of element to create or a component function to call to produce child elements.

## props
An object of values to apply as attributes to an element or pass to a component function.

### id
An empty string key can be included to set a reference to a node or component content. This allows their order to change within the content with minimal updates to the DOM. The reference node will also be accessible to your code through the state function so you can apply additional effects (e.g. focus).

### state
Components maintain their own local state which can be accessed on the empty string key of the props that are passed in. That state object contains another empty string key that holds an update function. Passing an object to this function will update those properties in the state and cause the component to update its elements within the DOM. A string can be passed to this function to get any reference nodes that were defined. Reference nodes from child components can be accessed by passing a set of strings to the state function.

## content
An array of outlines, strings, arrays or functions that will be used as the contents of the element or component. Items are processed and attached to the DOM starting from the bottom.

### effects
Functions as content are only called client side and will receive the props from the previous call of their parent component. The previous result of the current function will also be included on the empty string key of that object. If a function is returned, it will be used as the teardown function if the element or component is removed from the view.

## Examples
This repo contains a preview server to test its functionality. The code can be found in the root preview folder. Run 'npm start' to start the server and access the page at 'localhost:8080'.
