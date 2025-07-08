# Markdown

Markdown is a popular way of converting notes to HTML. Most of its formatting is based on a few symbols placed around text, so it is quick to learn and easy to read.

## Headings

Headings are created by placing `#` symbols and a space before your text. Six sizes are supported, from largest to smallest, based on the number of symbols you use. Alternatively, the two largest sizes can be created by putting a string of `=` or `-` symbols directly below your text.

	# Largest
	###### Smallest

	# Descriptive Heading {#short-heading}

	Primary Heading
	===============

	Secondary Heading
	-----------------

## Links

Links are defined by placing the display text in square brackets, followed by the URL in parentheses. A title can be included as well that is display on hover.

	[Link text](/path/to/page)
	[Link text](/path/to/page "title")

### Link references

URLs can be stored in your note for later use instead of writing them out each time. Do this by setting a name in square brackets, followed by a colon and then your URL. These are references

	[link]: /path/to/page
	[link]: /path/to/page "title"

	[Link text][link]

## Lists

List items are created by putting a `-`, `+`, or `*` symbol and space before your text. Content can be nested under list items by indenting it

	- First Item
	- Second Item
	  - Nested Item

### Numbered Lists

Numbered lists are created by using a number and `.` or `)` symbol instead. 

	1. First Item
	2. Second Item

### Definition Lists

Definition lists are created by using a `:` symbol before your defintions. The text above your list will be the term that is being defined.

	Markdown
	: A note-taking syntax that converts notes to HTML

Markdown
: A note-taking syntax that converts notes to HTML

### Task Lists

A checkbox can be put in front of your list item text by using square brackets, and either filling it in with an `x` or a space.

	- [x] abc

## Tables

Tables are created by separating each of their cells with `|` symbols. A header row is created by including a row that has dashes in each of its cells. A `:` can be put before the dashes to left align the text in the column, after the dashes to right align them, or both to center align them.

| Column 1 | Column 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |

## Block Quote

Notes can be embedded by placing `>` symbols before each line. These can contain any of the features outlined on this page, as well as other block quotes.

	> Paragraph text.
	> 
	> - List item

# Paragraphs

Text that doesn't us any of the above symbols will show up as a paragraph. Paragraphs can be separated by adding a blank line between them. Line breaks can be added within a paragraph by adding two spaces at the end of a line, and placing the text directly below that line.

	Paragraph text.

	Separate paragraph that ends with two spaces.  
	Text to display on its own line within this paragraph.


## Preformatted Text

Text can be displayed with monospaced font and no additional processing by indenting it with a tab, four spaces, or by wrapping it in three `` ` `` symbols, or more if needed to prevent closing out your text by those same symbols.

		Indented text

	```
	Wrapped text
	```

	````
	```
	Wrapped text with backticks to display
	```
	````

## HTML

HTML tags are only partially supported at this stage. They don't support attributes, and their content is taken as-is instead of being processed as markdown. I'd recommend using [Stew layouts](/stew) for now if you want to customize your notes further.

# Formatting

Text can be decorated further by wrapping symbols around what you want to see formatted.

## Bold and Italics

The `*` or `_` symbols can be wrapped around text you want italicized, or bolded if two are used. Do not include spaces after the opening symbol or before the closing symbol.

	*italics* or _italics  
	**bold** or __bold__
	*italics **bold***

## Highlight

Text an be highlighted by wrapping it in double `:` characters.

	::Highlighted text::

## Emoji

Custom emoji can be used by wrapping the name in `:` symbols. The list of available emoji is provided by an `index.mjs` file that can be foundn in the documenation for managing [Stew sites](/stew)

## Spoilers

Text can be hidden until clicked by wrapping it in double `|` symbols. For this reason, it is good practice to include at least one space between cells in your tables.

	Click to reveal the ||spoiler text||
	