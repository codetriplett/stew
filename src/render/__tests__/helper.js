export const updateText = jest.fn();
export const updateAttribute = jest.fn();
export const updateNodes = jest.fn();

export default function $ (value, attributes, children) {
	const parentNode = {
		appendChild: (...a) => updateNodes('append', ...a),
		insertBefore: (...a) => updateNodes('insert', ...a),
		removeChild: (...a) => updateNodes('remove', ...a)
	};

	const common = { previousSibling: 'previous', parentNode };

	if (!attributes) {
		return Object.assign(Object.defineProperty({}, 'nodeValue', {
			get: () => value,
			set: text => updateText(value = text)
		}), common);
	}

	return {
		...common,
		getAttribute: name => attributes[name],
		hasAttribute: name => attributes.hasOwnProperty(name),
		setAttribute: (...a) => updateAttribute('set', ...a),
		toggleAttribute: (...a) => updateAttribute('toggle', ...a),
		removeAttribute: (...a) => updateAttribute('remove', ...a),
		addEventListener: (...a) => updateAttribute('listen', ...a)
	};
}
