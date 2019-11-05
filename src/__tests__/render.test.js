import { parse } from '../parse';
import { render } from '../render';

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

let state;

function normalize ({ tagName, attributes, childNodes, nodeValue, onclick }) {
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

	if (onclick) {
		object.onclick = onclick;
	}

	return object;
}

function reframe (template) {
	const { '': structure } = template;
	
	if (Array.isArray(structure[1])) {
		structure.shift();
		return 1;
	}
}

function verify (callback, modifier) {
	let resolver = describe;

	if (modifier) {
		resolver = resolver[modifier];
	}

	resolver('syncronous', () => {
		const actual = callback();
		expect(actual instanceof Promise).toBe(false);
	});

	resolver('asyncronous', () => {
		beforeEach(() => state['..'] = true);
		callback();
	});
}

function clean (state) {
	if (typeof state !== 'object') {
		return;
	}

	delete state['..'];

	for (const key in state) {
		if (key) {
			clean(state[key]);
		}
	}
}

verify.only = callback => verify(callback, 'only');
verify.skip = callback => verify(callback, 'skip');

beforeEach(() => {
	window.fetch = jest.fn().mockImplementation(path => Promise.resolve({
		'/component.json': parse('<img src={string} alt="">', 'component'),
		'/data.json': data
	}[path]));
});

describe('render', () => {
	describe('generate', () => {
		let backup = {};

		function generate (markup, expectedElements, expectedBackup) {
			const template = parse(markup, 'name');
			const name = Array.isArray(template) ? '' : reframe(template);
			let actual = render(state, template, name, '');

			if (!(actual instanceof Promise)) {
				actual = Promise.resolve(actual);
			}

			return actual.then(actual => {
				expect(actual).toEqual(expectedElements);

				if (expectedBackup) {
					expect(backup).toEqual(expectedBackup);
				}
			});
		}

		beforeEach(() => {
			backup = {};

			state = {
				'.': [backup],
				...JSON.parse(JSON.stringify(data))
			};

			state[''] = state;
		});

		verify(() => {
			it('value', () => {
				return generate('({string})', '(abc)');
			});

			it('tag', () => {
				return generate('<br>', '<br>');
			});

			it('attributes', () => {
				return generate(
					'<img src="("{string}")" alt="">',
					'<img src="(abc)" alt="">'
				);
			});
	
			it('data', () => {
				return generate(
					'<img src="("{string.}")" alt="" onclick={active}>',
					'<img data--=\'name {"string":"abc"}\' src="(abc)" alt="">'
				);
			});
	
			it('empty', () => {
				return generate('<div></>', '<div></div>');
			});
	
			it('content', () => {
				return generate('<p>({string})</>', '<p>(abc)</p>');
			});
	
			it('children', () => {
				return generate('<div>(<br><br>)</>', '<div>(<br><br>)</div>');
			});
	
			it('scoped', () => {
				return generate('<p {object}>({string})</p>', '<p data--="1">(xyz)</p>');
			});
	
			it('presence', () => {
				return generate(
					'<p {flag true}>({string})</p>',
					'<p data--="1">(abc)</p>'
				);
			});
	
			it('absence', () => {
				return generate('<p {flag false}>({string})</p>', '');
			});
	
			it('hidden', () => {
				return generate('<p {missing}>({string})</p>', '');
			});
	
			it('iterate', () => {
				return generate('<p {array}>({string})</p>', [
					'<p data--="1-0">(abc)</p>',
					'<p data--="1-1">(xyz)</p>'
				].join(''));
			});
	
			it('conditional children', () => {
				return generate(`
					<div>
						<p {flag true}>present</>
						<p>({string})</>
						<p {flag false}>absent</>
					</>
				`, [
					'<div>',
						'<p data--="0">present</p>',
						' <p>(abc)</p> ',
					'</div>'
				].join(''));
			});
	
			it('backup', () => {
				return generate('<p>({string.})</>', '<p>(abc)</p>', { string: 'abc' });
			});
	
			it('hidden backup', () => {
				return generate(
					'<div {flag false}><p>({string.})</></>',
					'',
					{ string: 'abc' }
				);
			});
	
			it('complex', () => {
				return generate(`
					<div {array}>
						<img src="("{string.}")" alt="">
						<br>
						<p>({.number})</p>
					</>
				`, [
					'<div data--="1-0">',
						'<img src="(abc)" alt="">',
						' <br>',
						' <p>(123)</p>',
					'</div>',
					'<div data--="1-1">',
						'<img src="(xyz)" alt="">',
						' <br>',
						' <p>(123)</p>',
					'</div>'
				].join(''), {
					array: [
						{ string: 'abc' },
						{ string: 'xyz' }
					]
				});
			});
		});
	});

	describe('create', () => {
		const update = jest.fn();

		function create (markup, expected) {
			const template = parse(markup, 'name');
			const name = reframe(template);
			const actual = render(state, template, name, {});

			Promise.resolve(actual).then(actual => {
				const elements = normalize(actual);
				expect(elements).toEqual(expected);
			});
		}

		beforeEach(() => {
			update[''] = true;
			
			state = {
				'.': [update],
				...JSON.parse(JSON.stringify(data))
			};

			state[''] = state;
		});

		verify(() => {
			it('tag', () => {
				return create('<br>', { '': ['br'] });
			});

			it('attributes', () => {
				return create('<img src="("{string}")" alt="">', {
					'': ['img'], alt: '', src: '(abc)'
				});
			});

			it('data', () => {
				return create('<img src="("{string.}")" alt="" onclick={active}>', {
					'': ['img'], alt: '', src: '(abc)',
					onclick: expect.any(Function)
				});
			});

			it('empty', () => {
				return create('<div></>', { '': ['div'] });
			});

			it('content', () => {
				return create('<p>({string})</>', { '': ['p', '(abc)'] });
			});

			it('children', () => {
				return create('<div>(<br><br>)</>', {
					'': ['div', '(', { '': ['br'] }, { '': ['br'] }, ')']
				});
			});

			it('scoped', () => {
				return create('<div><p {object}>({string})</p></div>', {
					'': ['div', { '': ['p', '(xyz)'], 'data--': '0' }]
				});
			});

			it('presence', () => {
				return create('<div><p {flag true}>({string})</p></div>', {
					'': ['div', { '': ['p', '(abc)'], 'data--': '0' }]
				});
			});

			it('absence', () => {
				return create('<div><p {flag false}>({string})</p></div>', {
					'': ['div']
				});
			});

			it('hidden', () => {
				return create('<div><p {missing}>({string})</p></div>', { '': ['div'] });
			});

			it('iterate', () => {
				return create('<div><p {array}>({string})</p></div>', {
					'': ['div',
						{ '': ['p', '(abc)'], 'data--': '0-0' },
						{ '': ['p', '(xyz)'], 'data--': '0-1' }
					]
				});
			});

			it('conditional children', () => {
				return create(`
					<div>
						<p {flag true}>present</>
						<p>({string})</>
						<p {flag false}>absent</>
					</>
				`, {
					'': ['div',
						{ '': ['p', 'present'], 'data--': '0' },
						' ',
						{ '': ['p', '(abc)'] },
						' '
					]
				});
			});

			it('complex', () => {
				return create(`
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
							' ',
							{ '': ['br'] },
							' ',
							{ '': ['p', '(123)'] }
						], 'data--': '0-0' },
						{ '': ['div',
							{ '': ['img'], alt: '', src: '(xyz)' },
							' ',
							{ '': ['br'] },
							' ',
							{ '': ['p', '(123)'] }
						], 'data--': '0-1' }
					]
				});
			});
		});
	});

	describe('hydrate', () => {
		const update = jest.fn();
		
		function hydrate (markup, expectedState, expectedElements) {
			update[''] = true;

			const template = parse(markup, 'name');
			const name = reframe(template);
			const actual = render({ ...data, ...state }, template, name, {});
			
			return Promise.resolve(actual).then(actual => {
				let promise;

				if (actual) {
					update[''] = undefined;
					promise = render(state, template, name, actual);
				}

				return Promise.resolve(promise).then(() => {
					if (typeof expectedState === 'function') {
						expectedState = expectedState(state, update);
					}

					clean(state);

					expect(state).toEqual({
						'': state, '.': [update], ...expectedState
					});

					if (expectedElements) {
						const elements = actual && normalize(actual);
						expect(elements).toEqual(expectedElements);
					}
				});
			});
		}

		beforeEach(() => {
			state = { '.': [update] };
			state[''] = state;
		});

		verify(() => {
			it('tag', () => {
				return hydrate('<br>', {}, { '': ['br'] });
			});

			it('attributes', () => {
				return hydrate('<img src="("{string}")" alt="">', {
					string: 'abc'
				}, { '': ['img'], alt: '', src: '(abc)' });
			});

			it('data', () => {
				return hydrate('<img src="("{string.}")" alt="" onclick={active}>', {}, {
					'': ['img'], alt: '', src: '(abc)',
					onclick: expect.any(Function)
				});
			});

			it('empty', () => {
				return hydrate('<div></>', {}, { '': ['div'] });
			});

			it('content', () => {
				return hydrate('<p>({string})</>', {
					string: 'abc'
				}, { '': ['p', '(abc)'] });
			});

			it('scoped', () => {
				return hydrate('<div><p {object}>({string})</></>', (state, u) => ({
					object: { '': state, '.': [u, 'object'], string: 'xyz' }
				}), { '': ['div', { '': ['p', '(xyz)'], 'data--': '0' }] });
			});

			it('presence', () => {
				return hydrate('<div><p {flag true}>({string})</></>', {
					flag: true,
					string: 'abc'
				}, { '': ['div', { '': ['p', '(abc)'], 'data--': '0' }] });
			});

			it('absence', () => {
				return hydrate('<div><p {flag false}>({string})</></>', {}, {
					'': ['div']
				});
			});

			it('hidden', () => {
				return hydrate('<p {missing}>({string})</>', {}, undefined);
			});

			it('iterate', () => {
				return hydrate('<div><p {array}>({string})</></>', (state, u) => ({
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
				return hydrate(`
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
						' ',
						{ '': ['p', '(abc)'] },
						' '
					]
				});
			});

			it('complex', () => {
				return hydrate(`
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
							' ',
							{ '': ['br'] },
							' ',
							{ '': ['p', '(123)'] }
						], 'data--': '0-0' },
						{ '': ['div',
							{ '': ['img'], alt: '', src: '(xyz)' },
							' ',
							{ '': ['br'] },
							' ',
							{ '': ['p', '(123)'] }
						], 'data--': '0-1' }
					]
				});
			});
		});
	});
});
