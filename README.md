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
Using a tag name of '' will behave similar to an array except it will bend the rules for its immediate children. Strings will be interpreted as HTML, but script and style blocks will be removed. Functions will run both server-side and client-side and the result will be used in its place as the child. An empty object will be passed to the function on the first client-side call to differentiate it from the server-side call. An identifier can also be set on this tag. The ref it returns is the first element or text node it finds within its children.

```js
// accepts HTML from props which would normally be escaped
const html = '<strong>Author:</strong> Jeff Triplett':
$`<>${html}</>`

// allows for more customized children
$`<>${prev => $`<p>Was: ${prev}, Is: ${prop}</>`}</>`

// allows identifiers and uses first node as the ref
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
