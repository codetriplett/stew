export function category () {
const [props, ...children] = arguments;

if (!props) {
    return ['p', null, 'Category Landing'];
}

const { page } = props;

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
