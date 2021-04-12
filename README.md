# Stew
This library offers a simple way to create interactive components. It has features similar to other reactive libraries including local states and hydration of server rendered content. The minified file is around 7kB (unzipped) and the API is as simple as it could possibly be. Here is an example of how it is used.

```js
import $ from '@triplett/stew';

$(type, props, children)(node);
```

## type

This can be either a string (for elements) or a function (for components). If a function is provided, the props and children will be passed to it and the return value will be used as a fragment within the app.

## props

This is either the set of attributes to apply to the element or props to pass to the component. The state function will be stored on the '' key of the props object when it is passed to the component. The current state can be accessed by calling that function without any params and can be modified by passing an object back to it. This will trigger the component to render again and will automatically update the DOM. Refs are accessed by passing a string to the state function.

## children

An array of children that will be used as the contents of the element. It can also be passed to components where it can be placed where it is needed. When an element or component is updated as a result of a state change, it will compare the new children against the old and only update what is needed in the DOM. A '' key can be provided in the props of a child to identify them even if their order changes.
