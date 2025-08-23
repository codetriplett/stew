import stew from './stew';
import { format, extractCode } from './code';

beforeEach(() => {
	globalThis.stew = stew;
});

describe('format', () => {
	it('array', () => {
		const actual = format([123, '123']);

		expect(actual).toEqual(
`[123,
    \'123\',
]`
		);
	});

	it('object', () => {
		const actual = format({
			abc: 123,
			'': 'lmno',
			xyz: '789',
		});

		expect(actual).toEqual(
`{
    '': 'lmno',
    abc: 123,
    xyz: '789',
}`
		);
	});

	it('mix', () => {
		const actual = format({
			'': {
				abc: 'abc',
			},
			lmno: ['lmno', {
				xyz: 'xyz',
			}],
		});

		expect(actual).toEqual(
`{
    '': {
        abc: 'abc',
    },
    lmno: ['lmno',
        {
            xyz: 'xyz',
        },
    ],
}`
		);
	});
});

describe('extractCode', () => {
	it('extracts code', () => {
		const actual = extractCode(`
\`\`\`export
/style.css
/script.mjs
{
	place: '// Place',
}
* {
	color: blue;
}
\`\`\`

# Component

[Documentation](/documentation)
[](/named#abc#xyz#)
[](/alias#lm#no# "ml on mlon")
[](/barrel "onml")

\`\`\`export
const [place] = arguments;
return \`Hello \${place}\`;
\`\`\`

## State

\`\`\`export
{
	number: 123,
	string: 'abc',
}
\`\`\`
		`);

		expect(actual).toEqual(
`import named, { abc, xyz } from '/named.mjs';
import mlon, { lm as ml, no as on } from '/alias.mjs';
import * as onml from '/barrel.mjs';

export const state = stew({
    number: 123,
    string: 'abc',
});

export function component () {
	const [place] = arguments;
	return \`Hello \${place}\`;
}

export default [component, {
    '': 'Component',
    place: '// Place',
}, ['style', null, \`
* {
    color: blue;
}
\`],
    ['link', { href: '/style.css', rel: 'stylesheet' }],
    ['script', { src: '/script.mjs', type: 'module' }],
];
`
		);
	});

	it('minimal code', () => {
		const actual = extractCode(`
\`\`\`export
{}
\`\`\`

# Component

\`\`\`export
return 'Hello World';
\`\`\`
		`);

		expect(actual).toEqual(
`export function component () {
	return 'Hello World';
}

export default [component, {
    '': 'Component',
}];
`
		);
	});

	it('no summary', () => {
		const actual = extractCode(`
\`\`\`
{}
\`\`\`

# Component

\`\`\`export
return 'Hello World';
\`\`\`
		`);

		expect(actual).toEqual(
`export function component () {
	return 'Hello World';
}

export default component;
`
		);
	});

	it('no default', () => {
		const actual = extractCode(`
\`\`\`export
{}
\`\`\`

# Component

\`\`\`
return 'Hello World';
\`\`\`
		`);

		expect(actual).toEqual(
`export default [null, {
    '': 'Component',
}];
`
		);
	});

	it('no code', () => {
		const actual = extractCode(`
\`\`\`
{}
\`\`\`

# Component

\`\`\`
return 'Hello World';
\`\`\`
		`);

		expect(actual).toEqual(undefined);
	});

	it('with definition', () => {
		const actual = extractCode(`
\`\`\`export
{
	'': '// Choose an item',
}
\`\`\`

# Component

\`\`\`
return 'Hello World';
\`\`\`
		`);

		expect(actual).toEqual(
`export default [null, {
    '': 'Component // Choose an item',
}];
`
		);
	});

	it('alternate heading', () => {
		const actual = extractCode(`
\`\`\`export
{
	'': 'Heading',
}
\`\`\`
		`);

		expect(actual).toEqual(
`export default [null, {
    '': 'Heading',
}];
`
		);
	});
});
