import { parse } from '../parse';
import { render } from '../render';

function normalize (elements) {
	return elements.map(({ tagName, attributes, childNodes, nodeValue }) => {
		if (nodeValue !== null) {
			return nodeValue;
		}

		tagName = tagName.toLowerCase();
		attributes = Array.from(attributes);
		childNodes = normalize(Array.from(childNodes));

		const object = { '': [tagName, ...childNodes] };

		for (const { name, value } of attributes) {
			object[name] = value;
		}

		return object;
	});
}

const data = {
	number: 123,
	string: 'abc',
	object: { string: 'xyz' },
	array: [
		{ string: 'abc' },
		{ string: 'xyz' }
	]
};

describe('render', () => {
	describe('generate', () => {
		let backup = {};
		let state;

		function generate (markup, expectedElements, expectedBackup) {
			const template = parse(markup);
			const actual = render(state, template, '1', '');

			expect(actual).toEqual(expectedElements);

			if (expectedBackup) {
				expect(backup).toEqual(expectedBackup);
			}
		}

		beforeEach(() => {
			backup = {};

			state = {
				'.': [backup],
				...JSON.parse(JSON.stringify(data))
			};

			state[''] = state;
		});

		it('tag', () => {
			generate('<br>', '<br>');
		});

		it('attributes', () => {
			generate(
				'<img src="("{string}")" alt="">',
				'<img src="(abc)" alt="">'
			);
		});

		it('empty', () => {
			generate('<div></>', '<div></div>');
		});

		it('content', () => {
			generate('<p>({string})</>', '<p>(abc)</p>');
		});

		it('children', () => {
			generate('<div>(<br><br>)</>', '<div>(<br><br>)</div>');
		});

		it('conditional', () => {
			generate('<p {object}>({string})</p>', '<p data--="1">(xyz)</p>');
		});

		it('hidden', () => {
			generate('<p {missing}>({string})</p>', '');
		});

		it('iterate', () => {
			generate('<p {array}>({string})</p>', [
				'<p data--="1-0">(abc)</p>',
				'<p data--="1-1">(xyz)</p>'
			].join(''));
		});

		it('complex', () => {
			generate(`
				<div {array}>
					<img src="("{string.}")" alt="">
					<br>
					<p>({.number})</p>
				</>
			`, [
				'<div data--="1-0">',
					'<img src="(abc)" alt="">',
					'<br>',
					'<p>(123)</p>',
				'</div>',
				'<div data--="1-1">',
					'<img src="(xyz)" alt="">',
					'<br>',
					'<p>(123)</p>',
				'</div>'
			].join(''), {
				array: [
					{ string: 'abc' },
					{ string: 'xyz' }
				]
			});
		});
	});

	describe('create', () => {
		const update = jest.fn();
		let state;

		function create (markup, expected) {
			const template = parse(markup);
			const actual = render(state, template);
			const elements = normalize(actual);

			expect(elements).toEqual(expected);
		}

		beforeEach(() => {
			update[''] = true;
			
			state = {
				'.': [update],
				number: 123,
				string: 'abc',
				object: { string: 'xyz' },
				array: [
					{ string: 'abc' },
					{ string: 'xyz' }
				]
			};

			state[''] = state;
		});

		it('tag', () => {
			create('<br>', [{ '': ['br'] }]);
		});

		it('attributes', () => {
			create('<img src="("{string}")" alt="">', [
				{ '': ['img'], alt: '', src: '(abc)' }
			]);
		});

		it('empty', () => {
			create('<div></>', [{ '': ['div'] }]);
		});

		it('content', () => {
			create('<p>({string})</>', [{ '': ['p', '(abc)'] }]);
		});

		it('children', () => {
			create('<div>(<br><br>)</>', [
				{ '': ['div', '(', { '': ['br'] }, { '': ['br'] }, ')'] }
			]);
		});

		it('conditional', () => {
			create('<div><p {object}>({string})</p></div>', [
				{ '': ['div', { '': ['p', '(xyz)'], 'data--': '0' }] }
			]);
		});

		it('hidden', () => {
			create('<div><p {missing}>({string})</p></div>', [{ '': ['div'] }]);
		});

		it('iterate', () => {
			create('<div><p {array}>({string})</p></div>', [
				{
					'': ['div',
						{ '': ['p', '(abc)'], 'data--': '0-0' },
						{ '': ['p', '(xyz)'], 'data--': '0-1' }
					]
				}
			]);
		});

		it('complex', () => {
			create(`
				<div>
					<div {array}>
						<img src="("{string.}")" alt="">
						<br>
						<p>({.number})</p>
					</>
				</div>
			`, [
				{
					'': ['div',
						{ '': ['div',
							{ '': ['img'], alt: '', src: '(abc)' },
							{ '': ['br'] },
							{ '': ['p', '(123)'] }
						], 'data--': '0-0' },
						{ '': ['div',
							{ '': ['img'], alt: '', src: '(xyz)' },
							{ '': ['br'] },
							{ '': ['p', '(123)'] }
						], 'data--': '0-1' }
					]
				}
			]);
		});
	});

	describe('hydrate', () => {
		const update = jest.fn();
		let state;
		
		function hydrate (markup, expectedState, expectedElements) {
			update[''] = true;

			const template = parse(markup);
			const actual = render({ ...data, ...state }, template);

			update[''] = undefined;
			render(state, template, 0, actual[0]);

			expect(state).toEqual({
				'': state, '.': [update], ...expectedState
			});

			if (expectedElements) {
				const elements = normalize(actual);
				expect(elements).toEqual(expectedElements);
			}
		}

		beforeEach(() => {
			state = { '.': [update] };
			state[''] = state;
		});

		it('tag', () => {
			hydrate('<br>', {}, [{ '': ['br'] }]);
		});

		it('attributes', () => {
			hydrate('<img src="("{string}")" alt="">', {
				string: 'abc'
			}, [{ '': ['img'], alt: '', src: '(abc)'}]);
		});

		it('empty', () => {
			hydrate('<div></>', {}, [{ '': ['div'] }]);
		});

		it('content', () => {
			hydrate('<p>({string})</>', {
				string: 'abc'
			}, [{ '': ['p', '(abc)'] }]);
		});


		it.only('conditional', () => {
			hydrate('<div><p {object}>({string})</p></div>', {
				object: {}
			}, [
				{ '': ['div', { '': ['p', '(xyz)'], 'data--': '0' }] }
			]);
		});

		// it('hidden', () => {
		// 	const template = parse('<p {missing}>({string})</p>');
		// 	const actual = render(template, state, 1);

		// 	expect(actual).toHaveLength(0);
		// });

		// it('iterate', () => {
		// 	const template = parse('<p {array}>({string})</p>');
		// 	const actual = render(template, state, 1);
		// 	const elements = normalize(actual);

		// 	expect(actual).toHaveLength(2);

		// 	expect(elements).toEqual([
		// 		{ '': ['p', '(abc)'], 'data--': '1-0' },
		// 		{ '': ['p', '(xyz)'], 'data--': '1-1' }
		// 	]);
		// });

		// it('complex', () => {
		// 	const template = parse(`
		// 		<div {array}>
		// 			<img src="("{string.}")" alt="">
		// 			<br>
		// 			<p>({.number})</p>
		// 		</>
		// 	`);

		// 	const actual = render(template, state, 1);
		// 	const elements = normalize(actual);

		// 	expect(elements).toEqual([
		// 		{ '': ['div',
		// 			{ '': ['img'], alt: '', src: '(abc)' },
		// 			{ '': ['br'] },
		// 			{ '': ['p', '(123)'] }
		// 		], 'data--': '1-0' },
		// 		{ '': ['div',
		// 			{ '': ['img'], alt: '', src: '(xyz)' },
		// 			{ '': ['br'] },
		// 			{ '': ['p', '(123)'] }
		// 		], 'data--': '1-1' }
		// 	]);
		// });
	});
});
