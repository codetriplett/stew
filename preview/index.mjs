export function custom () {
const [flags, code] = arguments;
return `CUSTOM\n${code}`;
}

export function convert () {
const [{ tagName, children, ...props }] = arguments;
return [tagName, props, ...children];
}

export default [convert, {
    '': 'Convert',
    smile: '🙂',
}];
