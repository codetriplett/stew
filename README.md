# Stew
Interactive HTML from a single function. It supports local states and refs, client side hydration and effects, server side rendering and tagged templates. The examples below use tagged templates, but those are completely optional. The alternate method is shown in the section after Outlines.

```js
// start by importing stew onto your page and give it the name you prefer
import $ from '@triplett/stew'
```

## Outlines
These provide instructions for how an element or component should be created or updated. They are passed as children to other elements and components.

### HTML

```js
$`
	<div class="image">
		<img src="/image.jpg" alt="">
		<p>Lorem ipsum</p>
	</div>
`
```

### Variables

```js
$`
	<div class="image">
		<img src=${src} alt=${alt}>
		<p>${caption}</p>
	</div>
`
```

### Components

```js
function Image ({ src, alt }, ...children) {
	return $`
		<div class="image">
			<img src=${src} alt=${alt}>
			${children}
		</div>
	`
}

$`
	<${Image}>
		<p>${caption}</p>
	</>
`
```

The element and component tags can also be self-closing if there is no need to include children.

```js
$`<div />`
$`<${Image} src=${src} alt=${alt} />`
```

### State

```js
// state is available on the '' key of props
// the state updating function is available on the '' key of state
// your view will update automatically to reflect the changes when the state function is called
function Image ({
	'': { '': state, showCaption },
	src, alt
}, ...children) {
	return $`
		<div class="image">
			<img src=${src} alt=${alt}>
			${showCaption && children}
			${!showCaption && $`
				<button type="button" onclick=${() => {
					state({ showCaption: !showCaption })
				}}>
					Show Caption
				</button>
			`}
		</div>
	`
}

$`
	<${Image}>
		<p>${caption}</p>
	</>
`
```

### Variables from Object
An initial set of properties can be defined as an object before any of the other props. An identifier can be set on the '' key of this object to make sure the state of the element or component is maintained even if its position changes within its containing component.

```js
$`
	<div ${{ '': 'wrapper' }} class="image">
		<img ${{ src, alt }}>
		<p>${caption}</p>
	</div>
`
```

### Effects
Functions that are set as children will only run client side. They are called from the bottom to the top so they will have access to the current refs of the children below them (through the state function). The previous component props will be included as a parameter after the first render and the '' key of those props will hold the previous return value of the effect function. If a function is returned, it will be called when the component is removed from the view.

```js
function Image ({
	'': { '': state, showCaption },
	src, alt
}, ...children) {
	return $`
		${prev => prev && state('wrapper').focus()}
		<div ${{ '': 'wrapper' }} class="image">
			<img src=${src} alt=${alt}>
			${showCaption && children}
			${!showCaption && $`
				<button type="button" onclick=${() => {
					state({ showCaption: !showCaption })
				}}>
					Show Caption
				</button>
			`}
		</div>
	`
}

$`
	<${Image}>
		<p>${caption}</p>
	</>
`
```

### Custom Fragment Tag
If you need to set an identifier for an array or you want to render HTML included in your variables, you will need to use the custom fragment tag. This looks like any other element tag except its type is empty. The HTML found in its direct children will not be escaped, but script and style tags will be removed. Accessing the ref of this tag through the state function will return the first child that is either an element or text node.

```js
const html = '<strong>Author:</strong> Jeff Triplett':
$`<>${html}</>`

$`
	<${ '': 'content' }>
		<img ${{ src, alt }}>
		<p>${caption}</p>
	</>
`
```

## Alternate to Tagged Templates
Outlines can be created by calling the stew function with the following parameters. The tag can be a string to define an element or a function to define a component.

```js
$(tag, props, ...children)
```

## Attaching Outlines to the View
Calling the stew function without a tag parameter will set up a root element. Outlines that are passed as children will be attached to that element. This can be used to either render HTML or DOM elements.

```js
// render HTML
// div is the default tag if one isn't provided
$({ '': 'div', ...props }, ...children)

// render Element
// locate an existing node or create a new one to pass in as '' key
const node = document.querySelector(selector)
$({ '': node, ...props }, ...children)
```

## Steward
Check out @triplett/steward for some useful tools to help manage your stew app.
