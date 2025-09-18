# Markdown

Markdown is a popular way of converting notes to HTML. Most of its formatting is based on a few symbols placed around text, so it is quick to learn and easy to read.

## Headings

Headings are created by placing `#` symbols before your text. Six sizes are supported, based on the number of symbols you use. Alternatively, a line of `=` or `-` symbols can be set below your heading to create the two largest sizes.

```demo markdown
# Largest
###### Smallest

# Descriptive Heading {#short-heading}

Primary Heading
===============

Secondary Heading
-----------------
```

## Paragraphs

Text that doesn't use any formatting symbols will show up as a paragraph. Paragraphs can be separated by adding a blank line between them. Line breaks can be added within a paragraph by adding two spaces to the end of a line, and placing the text directly below that line.

```demo markdown
Paragraph text.

Separate paragraph that ends with two spaces.  
Text to display on its own line within this paragraph.
```

## Links

Links are defined by placing the display text in square brackets, followed by the URL in parentheses. A title can be included as well that is display on hover.

```demo markdown
[Link text](/path/to/page)  
[Link text](/path/to/page "title")
```

URLs can be stored in your note for later use instead of writing them out each time. Do this by setting a name in square brackets, followed by a colon, and then your URL. These can be referenced with square brackets, instead of the parentheses used for setting a URL.

```demo markdown
[link]: /path/to/page
[link]: /path/to/page "title"

[Link text][link]
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
:smile: :rotfl: :sob: :think: :upsidedown: :skull: :shrug: :facepalm: :eyes: :thumb:  :hundred: :fire: :sparkle: :check: :heart: 
```

## Spoilers

Text can be hidden until clicked by wrapping it in double `|` symbols. Since tables also use this symbol, it is good practice to include at least one space between cells so they aren't recognized as spoilers instead.

```demo markdown
Click to reveal the ||spoiler text||
```

## Lists

List items are created by putting a `-` symbol and space before your text. `+` or `*` symbols can also be used if you prefer. Content can be nested under list items by indenting it at least 2 spaces after the start of the text above it, but less than 4.

```demo markdown
- First Item
- Second Item
	- Nested Item
```

## Numbered Lists

Numbered lists are created by using a number and `.` or `)` symbol instead. The numbers will count up from whatever was set as the first one in the list. 

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

A checkbox can be put in front of your list item text by using square brackets and either filling it in with an `x` or a space.

```demo markdown
- [x] abc
- [ ] xyz
```

## Tables

Tables are created by separating each of their cells with `|` symbols. A row of cells that contain only dashes will separate the header row from the rest. A `:` can either be put before the dashes to left align the text in the column, after the dashes to right align them, or both to center align them.

```demo markdown
| Left Heading | Center Heading | Right Heading |
| :----------- | :------------: | ------------: |
| Left Cell    | Center Cell    | Right Cell    |
```

## Block Quote

Notes can be embedded by placing `>` symbols before each line. These can contain any of the features outlined on this page, as well as other block quotes.

```demo markdown
> Paragraph text.
> 
> - List item
```

## HTML

HTML tags are only partially supported at this stage. The angle brackets for each tag must exist on the same line, and their content is taken as-is instead of being processed as markdown. These limitations will be fixed in a future update.

```demo markdown
<b>Inner text</b>
```

## Preformatted Text

Text can be displayed as-is and with monospaced font by indenting it by 1 tab (4 spaces), or by wrapping it in three or more `` ` `` symbols.

`````demo markdown
    Indented text

```
Wrapped text
```
`````

Custom formatters can be used to completely customize the output. The `export` formatter is the only reserved one, and it is what allows for embedding code in your notes. Custom formatters are found in [index](/index), where you can set your own or modify the existing ones. Props can be included after the formatter name. Any props not wrapped in quotes will be converted to their appropriate non-string type, where possible.

````demo markdown
```capitalize
lowercase text
```

```capitalize repeat=2 separator=", " all
lowercase text
```
````
