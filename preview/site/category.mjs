export function category () {
const [{ page }, ...children] = arguments;

return ['', {},
    ['nav', {}, page],
    ...children,
];
}

export default [category, {
    '': 'Category',
    page: '// Page',
}, ['style', null, `
nav {
    width: 240px;
    background: lightgray;
}
`]];
