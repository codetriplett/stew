import stew from './stew';
import { extractCode } from './code';

beforeEach(() => {
	globalThis.stew = stew;
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
