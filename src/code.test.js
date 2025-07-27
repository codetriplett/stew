import stew from './stew';
import { format, extractCode } from './code';

beforeEach(() => {
	globalThis.stew = stew;
});

describe('format', () => {
	it('array', () => {
		const actual = format([123, '123']);
		expect(actual).toEqual('[123, \'123\']');
	});

	it('object', () => {
		const actual = format({
			abc: 123,
			'': {},
			xyz: '789',
		});

		expect(actual).toEqual(
`{
    '': {},
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
    lmno: ['lmno', {
        xyz: 'xyz',
    }],
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

[Named](/path#abc#xyz# "abc xyz lmno")
[Alias](/path#lm#no# "ml on mlon")
[Barrel](/path "onml")

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
`import lmno, { abc, xyz, lm as ml, no as on, default as mlon } from '/path';
import * as onml from '/path';

const state = stew({
    number: 123,
    string: 'abc',
});

export function component () {
	const [place] = arguments;
	return \`Hello \${place}\`;
}

export default [component, {
    '': {
        '': 'Component',
    },
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
    '': {
        '': 'Component',
    },
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
    '': {
        '': 'Component',
    },
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
});
