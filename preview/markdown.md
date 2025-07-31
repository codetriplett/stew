# Markdown

Markdown is a popular way of converting notes to HTML. Most of its formatting is based on a few symbols placed around text, so it is quick to learn and easy to read.

```render
return ['style', null, `
@media (max-width: 720px) {
	.stew-demo {
		display: block !important;

		> *  + * {
			margin-top: 16px;
		}
	}
}
`]
```

## Headings

Headings are created by placing `#` symbols and a space before your text. Six sizes are supported, from largest to smallest, based on the number of symbols you use. Alternatively, the two largest sizes can be created by putting a string of `=` or `-` symbols directly below your text.

```demo markdown
# Largest
###### Smallest

# Descriptive Heading {#short-heading}

Primary Heading
===============

Secondary Heading
-----------------
```

## Links

Links are defined by placing the display text in square brackets, followed by the URL in parentheses. A title can be included as well that is display on hover.

```demo markdown
[Link text](/path/to/page)  
[Link text](/path/to/page "title")
```

URLs can be stored in your note for later use instead of writing them out each time. Do this by setting a name in square brackets, followed by a colon and then your URL. These are references

```demo markdown
[link]: /path/to/page
[link]: /path/to/page "title"

[Link text][link]
```

## Lists

List items are created by putting a `-`, `+`, or `*` symbol and space before your text. Content can be nested under list items by indenting it

```demo markdown
- First Item
- Second Item
	- Nested Item
```

## Numbered Lists

Numbered lists are created by using a number and `.` or `)` symbol instead. 

```demo markdown
1. First Item
2. Second Item
```

## Definition Lists

Definition lists are created by using a `:` symbol before your defintions. The text above your list will be the term that is being defined.

```demo markdown
Markdown
: A note-taking syntax that converts notes to HTML
```

## Task Lists

A checkbox can be put in front of your list item text by using square brackets, and either filling it in with an `x` or a space.

```demo markdown
- [x] abc
- [ ] xyz
```

## Tables

Tables are created by separating each of their cells with `|` symbols. A header row is created by including a row that has dashes in each of its cells. A `:` can be put before the dashes to left align the text in the column, after the dashes to right align them, or both to center align them.

```demo markdown
| Column 1 | Column 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
```

## Block Quote

Notes can be embedded by placing `>` symbols before each line. These can contain any of the features outlined on this page, as well as other block quotes.

```demo markdown
> Paragraph text.
> 
> - List item
```

## Paragraphs

Text that doesn't us any of the above symbols will show up as a paragraph. Paragraphs can be separated by adding a blank line between them. Line breaks can be added within a paragraph by adding two spaces at the end of a line, and placing the text directly below that line.

```demo markdown
Paragraph text.

Separate paragraph that ends with two spaces.  
Text to display on its own line within this paragraph.
```

## Preformatted Text

Text can be displayed with monospaced font and no additional processing by indenting it with a tab, four spaces, or by wrapping it in three `` ` `` symbols, or more if needed to prevent closing out your text by those same symbols.

`````demo markdown
    Indented text

```
Wrapped text
```

````
```
Wrapped text with backticks to display
```
````

```capitalize
lowercase text
```

```capitalize all
lowercase text
```
`````

Formatters are code that is exported from [index](/index). The flags are passed as an object as the first parameter, and the inner text is passed as the second. Whatever is returned will replace the preformatted block, and it can include interactive [stew](/stew) layouts.

## HTML

HTML tags are only partially supported at this stage. The angle brackets for each tag must exist on the same line, and their content is taken as-is instead of being processed as markdown. These limitations will be fixed in a future update.

```demo markdown
<b>Inner text</b>
```

## Bold and Italics

The `*` or `_` symbols can be wrapped around text you want italicized, or bolded if two are used. Do not include spaces after the opening symbol or before the closing symbol.

```demo markdown
*italics* or _italics_  
**bold** or __bold__  
*italics **bold***  
```

## Highlight

Text an be highlighted by wrapping it in double `:` characters.

```demo markdown
::Highlighted text::
```

## Emoji

Custom emoji can be used by wrapping the name in `:` symbols. The list of available emoji is provided by the [index](/index) note.

```demo markdown
:smile:
```

## Spoilers

Text can be hidden until clicked by wrapping it in double `|` symbols. For this reason, it is good practice to include at least one space between cells in your tables.

```demo markdown
Click to reveal the ||spoiler text||
```
