import { parse } from '../parse';
import { render } from '../render';

function normalize ({ tagName, attributes, childNodes, nodeValue }) {
	if (nodeValue !== null) {
		return nodeValue;
	}

	tagName = tagName.toLowerCase();
	attributes = Array.from(attributes);
	childNodes = Array.from(childNodes).map(normalize);

	const object = { '': [tagName, ...childNodes] };

	for (const { name, value } of attributes) {
		object[name] = value;
	}

	return object;
}

const data = {
	flag: true,
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
			const actual = render(state, template, 1, '');

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

		it('scoped', () => {
			generate('<p {object}>({string})</p>', '<p data--="1">(xyz)</p>');
		});

		it('presence', () => {
			generate(
				'<p {flag true}>({string})</p>',
				'<p data--="1">(abc)</p>'
			);
		});

		it('absence', () => {
			generate('<p {flag false}>({string})</p>', '');
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

		it('conditional children', () => {
			generate(`
				<div>
					<p {flag true}>present</>
					<p>({string})</>
					<p {flag false}>absent</>
				</>
			`, [
				'<div>',
					'<p data--="0">present</p>',
					'<p>(abc)</p>',
				'</div>'
			].join(''));
		});

		it('backup', () => {
			generate('<p>({string.})</>', '<p>(abc)</p>', { string: 'abc' });
		});

		it('hidden backup', () => {
			generate(
				'<div {flag false}><p>({string.})</></>',
				'',
				{ string: 'abc' }
			);
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
			const actual = render(state, template, 1, {});
			const elements = normalize(actual);

			expect(elements).toEqual(expected);
		}

		beforeEach(() => {
			update[''] = true;
			
			state = {
				'.': [update],
				...JSON.parse(JSON.stringify(data))
			};

			state[''] = state;
		});

		it('tag', () => {
			create('<br>', { '': ['br'] });
		});

		it('attributes', () => {
			create('<img src="("{string}")" alt="">', {
				'': ['img'], alt: '', src: '(abc)'
			});
		});

		it('empty', () => {
			create('<div></>', { '': ['div'] });
		});

		it('content', () => {
			create('<p>({string})</>', { '': ['p', '(abc)'] });
		});

		it('children', () => {
			create('<div>(<br><br>)</>', {
				'': ['div', '(', { '': ['br'] }, { '': ['br'] }, ')']
			});
		});

		it('scoped', () => {
			create('<div><p {object}>({string})</p></div>', {
				'': ['div', { '': ['p', '(xyz)'], 'data--': '0' }]
			});
		});

		it('presence', () => {
			create('<div><p {flag true}>({string})</p></div>', {
				'': ['div', { '': ['p', '(abc)'], 'data--': '0' }]
			});
		});

		it('absence', () => {
			create('<div><p {flag false}>({string})</p></div>', {
				'': ['div']
			});
		});

		it('hidden', () => {
			create('<div><p {missing}>({string})</p></div>', { '': ['div'] });
		});

		it('iterate', () => {
			create('<div><p {array}>({string})</p></div>', {
				'': ['div',
					{ '': ['p', '(abc)'], 'data--': '0-0' },
					{ '': ['p', '(xyz)'], 'data--': '0-1' }
				]
			});
		});

		it('conditional children', () => {
			create(`
				<div>
					<p {flag true}>present</>
					<p>({string})</>
					<p {flag false}>absent</>
				</>
			`, {
				'': ['div',
					{ '': ['p', 'present'], 'data--': '0' },
					{ '': ['p', '(abc)'] }
				]
			});
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
			`, {
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
			});
		});
	});

	describe('hydrate', () => {
		const update = jest.fn();
		let state;
		
		function hydrate (markup, expectedState, expectedElements) {
			update[''] = true;

			const template = parse(markup);
			const actual = render({ ...data, ...state }, template, 1, {});

			if (actual) {
				update[''] = undefined;
				render(state, template, 1, actual);
			}

			if (typeof expectedState === 'function') {
				expectedState = expectedState(state, update);
			}

			expect(state).toEqual({
				'': state, '.': [update], ...expectedState
			});

			if (expectedElements) {
				const elements = actual && normalize(actual);
				expect(elements).toEqual(expectedElements);
			}
		}

		beforeEach(() => {
			state = { '.': [update] };
			state[''] = state;
		});

		it('tag', () => {
			hydrate('<br>', {}, { '': ['br'] });
		});

		it('attributes', () => {
			hydrate('<img src="("{string}")" alt="">', {
				string: 'abc'
			}, { '': ['img'], alt: '', src: '(abc)' });
		});

		it('empty', () => {
			hydrate('<div></>', {}, { '': ['div'] });
		});

		it('content', () => {
			hydrate('<p>({string})</>', {
				string: 'abc'
			}, { '': ['p', '(abc)'] });
		});

		it('scoped', () => {
			hydrate('<div><p {object}>({string})</></>', (state, u) => ({
				object: { '': state, '.': [u, 'object'], string: 'xyz' }
			}), { '': ['div', { '': ['p', '(xyz)'], 'data--': '0' }] });
		});

		it('presence', () => {
			hydrate('<div><p {flag true}>({string})</></>', {
				flag: true,
				string: 'abc'
			}, { '': ['div', { '': ['p', '(abc)'], 'data--': '0' }] });
		});

		it('absence', () => {
			hydrate('<div><p {flag false}>({string})</></>', {}, {
				'': ['div']
			});
		});

		it('hidden', () => {
			hydrate('<p {missing}>({string})</>', {}, undefined);
		});

		it('iterate', () => {
			hydrate('<div><p {array}>({string})</></>', (state, u) => ({
				array: Object.assign([
					{ '': state, '.': [u, 'array', 0], string: 'abc' },
					{ '': state, '.': [u, 'array', 1], string: 'xyz' }
				], { '': state, '.': [u, 'array'] })
			}), {
				'': ['div',
					{ '': ['p', '(abc)'], 'data--': '0-0' },
					{ '': ['p', '(xyz)'], 'data--': '0-1' }
				]
			});
		});

		it('conditional children', () => {
			hydrate(`
				<div>
					<p {flag true}>present</>
					<p>({string})</>
					<p {flag false}>absent</>
				</>
			`, {
				flag: true,
				string: 'abc'
			}, {
				'': ['div',
					{ '': ['p', 'present'], 'data--': '0' },
					{ '': ['p', '(abc)'] }
				]
			});
		});

		it('complex', () => {
			hydrate(`
				<div>
					<div {array}>
						<img src="("{string.}")" alt="">
						<br>
						<p>({.number})</>
					</>
				</>
			`, (state, u) => ({
				array: Object.assign([
					{ '': state, '.': [u, 'array', 0] },
					{ '': state, '.': [u, 'array', 1] }
				], { '': state, '.': [u, 'array'] }),
				number: 123
			}), {
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
			});
		});
	});
});
