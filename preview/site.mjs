export function site () {
const [{ category }, ...children] = arguments;

return ['', {},
    ['header', {}, category],
    ['div', { className: 'container' }, ...children],
];
}

export default [site, {
    '': 'Site',
    category: '// Category',
}, ['style', null,
`header {
    height: 60px;
    color: white;
    background: dimgray;
}
.container {
    display: flex;
}
main {
    flex-grow: 1;
}`]];
