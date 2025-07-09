export function custom () {
const [flags, code] = arguments;
return `CUSTOM\n${code}`;
}

export function convert () {
const [props] = arguments;

if (!props) {
    return ['p', null, 'Index landing'];
}

const { tagName, children, ...attributes } = props;
return [tagName, attributes, ...children];
}

export default [convert, {
    '': 'Convert',
    smile: '🙂',
}];
