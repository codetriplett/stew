# Stew
This library offers a simple way to create interactive components without having to write any client-side JavaScript.

## Variables
Curly braces are used to insert values into your HTML. They can be set in place of or adjacent to regular attribute text or anywhere within the inner text of an element. Any number of strings and variables can be used to form the final value.
```html
<p>{text}</>
<img src="https://domain.com/"{src}".jpg" alt={alt}>
```

## Conditions
A second value can be passed within curly braces to compare the variable against. If the variable matches the expected value, the text that follows it will be included. If a condition is placed last, it will control whether to include the attribute or inner text at all. When comparing against false, the condition will be satisfied if the value is either false, undefined or null.
```html
<p class="status "{ready true}"ready">
<button disabled={ready false}>Click here</>
```

## Scope
A variable can be applied directly to an element to set a new scope for itself and its children. Place a curly brace after the tag name but before any attributes to achieve this. If the scope is empty, the element will not render. If the scope is an array, an element for each item in the array will be rendered. If the scope is a condition, it will control whether the element renders but will not affect its scope.
```html
<img {image} "https://domain.com/"{src}".jpg" alt={alt}>
<p {valid false}>There was an error: {error}</>
<ul>
	<li {items}>{text}</>
</>
```

## Listeners
If a variable is set to an onclick attribute, its value will toggle between true and false and it will trigger the component to update whenever it is clicked. If a number is provided as the second value, it will increment the variable each time it is clicked and reset to zero once the number is exceeded. If the second value is preceded by a dash, it will decrement the variable and reset to the number once the value crosses zero. An array followed by a dot can also be passed as the second value to use its maximum index as the upper limit.
```html
<button onclick={expanded}>Click here to toggle the value</>
<button onclick={index array.}>Click here to increment the value</>
<button onclick={index -array.}>Click here to decrement the value</>
```

## Dot Features
Dots can separate multiple keys to look up a variable nested deep within an object. Dots at the start of the key will backtrack to a parent scope before accessing its properties. A dot at the end of a key for an array will return the maximum index of that array. A dot at the end of a key for a string or a number will ensure that it exists in the component's state when rendered client-side. A dot at the end of the second value in a condition will treat it as a key instead of a boolean or a string.
```html
<p>String inside an object property: {object.string}</>
<p>String adjacent to current scope: {.string}</>
<p>String stored for hydration: {string.}</>
<p>Maximum index of an array: {array.}</>
<p>String compared against another propery: {string value.}</>
```

## Building templates
Pass your markup to the main function of this library to have it converted into a template.
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
Pass a template on its own to activate components on the page. The template will be used to locate the appropriate elements and extract content from them to form their original states. It will also attach the event listeners so they respond to user interaction.
```js
stew(template);
```

## Grunt Task
There is a Grunt task that can be used to simplify builds. It will convert markup in the files you provide and create their .js files. These files can be used either server-side to import templates or client-side to activate components. Be sure to place the scripts on the page below the elements they are meant to activate. Also be sure the main stew script is already loaded onto the page.
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
