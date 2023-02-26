import execute from './execute';

export default function (document = window.document) {
	return (template, state) => {
		const callback = typeof template === 'function' ? template : () => template;
		const context = { document, state };
		return execute(callback, context);
	};
}
