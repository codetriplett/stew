# Stew
This library offers a simple way to create interactive components without having to write any client-side JavaScript.

## Variables
Curly braces are used to insert values into your HTML. They can be set in place of or adjacent to regular attribute text or anywhere within the inner text of an element. Any number of strings and variables can be used to form the final value.
```html
<p>{text}</>
<img src="https://domain.com/"{src}".jpg" alt={alt}>
```

## Conditions
A second value can be passed within curly braces to compare the variable against. If the variable matches the expected value, the text that follows it will be included. If a condition is placed last, it will control whether to include the attribute or inner text at all. Conditions will create boolean attributes if there is no adjacent text. When comparing against false, the condition will be satisfied if the value is either false, undefined or null.
```html
<p class="status "{ready true}"ready">
<button disabled={ready false}>Click here</>
```

## Scope
A variable can be applied directly to an element to set a new scope for itself and its children. Place a curly brace after the tag name but before any attribute names to achieve this. If the scope is empty, the element will not render. If the scope is an array, an element for each item in the array will be rendered. If the scope is a condition that is satisfied, the element will render but its scope will not change.
```html
<img {image} "https://domain.com/"{src}".jpg" alt={alt}>
<p {valid false}>There was an error: {error}</>
<ul>
	<li {items}>{text}</>
</>
```

## Listeners
If a variable is set to an onclick attribute, its value will toggle between true and false and it will trigger the component to update whenever it is clicked.
```html
<button onclick={expanded}>Click here</>
```

## Building templates
Pass your markup to the main function of this library to have it converted into a template that can be used to generate html.
```js
import stew from 'stew';
const template = stew('<div class="component">...</div>');
```

## Rendering HTML
Pass a template along with data to generate HTML.
```js
import stew from 'stew';
const html = stew(template, { text: 'Lorem ipsum' });
```

## Activating Elements
Pass a template on its own to cause it to locate all matching elements and set them up for user interactions. The template will be used to extract content from the DOM and form the original state of each component.
```js
stew(template);
```

## Grunt Task
There is a Grunt task that can be used to simplify builds. It will convert markup in the files you provide and create their .js files. These files will export the template for use in server-side code or trigger elements to activate when placed on the page. Be sure to place the scripts below the elements they are meant to activate. Also be sure the main stew script is already loaded onto the page.
```js
const stew = require('./lib/stew');

module.exports = function (grunt) {
	grunt.initConfig({
		stew: {
			main: {
				files: [
					{
						cwd: 'src/',
						src: '**/*.stew',
						dest: 'dist/'
					}
				]
			}
		}
	});

	stew.grunt(grunt);
	grunt.registerTask('default', ['stew']);
};
```
```html
<body>
	<div class="component">...</div>
	<script src="/stew.min.js">
	<script src="/component.js">
</body>
```
