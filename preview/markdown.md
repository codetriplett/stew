Markdown summary.

# Markdown

Markdown is a well-establish way of converting notes to HTML. Most of its formatting is based on symbols people naturally include while writing, so it is quick to learn and easy to read.

## Headings

Headings are created by placing `#` symbols before your text. Six sizes are supported, from largest to smallest, based on the number of symbols you use. A space is needed before the text you want displayed, but not between the symbols.

	# Largest
	###### Smallest

These will be included in the navigation to the left of your note, allowing you to jump to each section. If you want to customize the ID it uses to do this, you can include one yourself, otherwise it will create one based on the text.

	# Descriptive Heading {#short-heading}

They can also be created by putting any number of `=` symbols on a line directly below your text, for the largest size, or `-` symbols for the second largest. This is just a matter of preference, but you do lose the ability to customize the ID.

## Paragraphs

## Lists

List items are created by putting a `-` symbol and space before your text. It will group adjacent lines with this format into a single list, spacing them out if separated by an empty line. `+` and `*` can also be used if you prefere. Numbered lists are created by adding a number followed by a `.` or `)` and a space. The first number in each set will determine where it starts counting from, and the rest will continue from there.

	- First
	- Second

	1. First
	2. Second

Content can be nested under existing list items by indenting them.

	1. Task
	   - Detail
