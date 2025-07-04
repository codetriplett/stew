export function formatter () {
const [format, code] = arguments;

switch (format) {
	case 'custom': return `CUSTOM\n${code}`;
}
}

export default [formatter, {
    '': 'Formatter',
	smile: '🙂',
}];
