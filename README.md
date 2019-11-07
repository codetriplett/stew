# Stew
This library offers a simple way to create interactive components without having to write any of your own JavaScript.

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

## Styles
Set a style attribute on the root tag of your component to define a stylesheet. That stylesheet will be automatically be loaded on any page where your component is included. The name of that file will be also be added as a class on your component. Multiple paths can be defined by separating them with a space.
```html
<div style="css/page css/component">...</>
```

## Fetching Data
Any tag that accepts children can contain references to other components. You can either provide attributes to create a new state for the component or have it fetch its own data.
```html
<div>
	<component name={value} />
	<component /path/to/data>
</>
```

## Builds
There is a Grunt task that can be used to convert your markup into JSON.
```js
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

	require('@triplett/stew').task(grunt);
	grunt.registerTask('default', ['stew']);
};
```

## Server
Pass a port and folder path to the server function to start a node server. It can be used to request resources or pages relative to that folder.
```js
require('@triplett/stew').server(8080, __dirname);
```
Here is an exmaple of the folder structure for templates and data. JSON files immediately below the root folder won't be rendered with their own data, but the ones in child folders will.
```txt
/ (path you provided to the server)
	404.html (error page)
	200.json (template for /)
	landing.json (template for /landing)
	landing
		200.json (template for /landing/...)
		feature.json (data for /landing/feature)
		...
```
Templates for pages must be wrapped in html tags. It will automatically add the scripts and stylesheets that your components require.
```html
<html style="styles/main">
	<head>
		<title>Hello World</>
	</>
	<body>
		<h1>Hello World</>
		<component /data>
	</>
</>
```
