import { evaluate } from '../evaluate';

describe('evaluate', () => {
	describe('single variable', () => {
		let object;

		beforeEach(() => {
			object = {};
		});

		it('should provide string', () => {
			const actual = evaluate([['key']], { key: 'value' });
			expect(actual).toBe('value');
		});

		it('should extract string', () => {
			const actual = evaluate([['key']], {}, '', 'value', object);
			
			expect(object).toEqual({ key: 'value' });
			expect(actual).toBe('value');
		});

		it('should provide number', () => {
			const actual = evaluate([['key']], { key: 1 });
			expect(actual).toBe(1);
		});

		it('should extract number', () => {
			const actual = evaluate([['key']], {}, '', '1', object);

			expect(object).toEqual({ key: 1 });
			expect(actual).toBe(1);
		});

		it('should provide true', () => {
			const actual = evaluate([['key']], { key: true });
			expect(actual).toBe(true);
		});

		it('should extract true', () => {
			const actual = evaluate([['key']], {}, '', 'true', object);

			expect(object).toEqual({ key: true });
			expect(actual).toBe(true);
		});

		it('should provide false', () => {
			const actual = evaluate([['key']], { key: false });
			expect(actual).toBe(false);
		});

		it('should extract false', () => {
			const actual = evaluate([['key']], {}, '', 'false', object);

			expect(object).toEqual({ key: false });
			expect(actual).toBe(false);
		});

		it('should provide scope', () => {
			const actual = evaluate([['']], { '': 'value' }, 'key.');
			expect(actual).toBe('value');
		});

		it('should extract scope', () => {
			const actual = evaluate([['']], {}, 'key.', 'value', object);
			
			expect(object).toEqual({ key: 'value' });
			expect(actual).toBe('value');
		});

		it('should provide maximum index', () => {
			const actual = evaluate([['key#']], { key: [1, 2, 3] });
			expect(actual).toBe(2);
		});

		it('should not extract maximum index', () => {
			const actual = evaluate([['key#']], {}, '', '', object);

			expect(object).toEqual({});
			expect(actual).toBeUndefined();
		});

		it('should provide current index', () => {
			const actual = evaluate([['#']], {}, 'a.4.b.2.c');
			expect(actual).toBe(2);
		});

		it('should not extract maximum index', () => {
			const actual = evaluate([['#']], {}, 'a.4.b.2.c', '', object);

			expect(object).toEqual({});
			expect(actual).toBe(2);
		});

		it('should provide an embedded variable', () => {
			const actual = evaluate([['a.b']], { a: { b: 'value' } });
			expect(actual).toBe('value');
		});

		it('should extract an embedded variable', () => {
			const actual = evaluate([['a.b']], {}, '', 'value', object);

			expect(object).toEqual({ 'a.b': 'value' });
			expect(actual).toBe('value');
		});

		it('should provide a scoped variable', () => {
			const actual = evaluate([['b']], { '': { b: 'value' } }, 'a.');
			expect(actual).toBe('value');
		});

		it('should extract a scoped variable', () => {
			const actual = evaluate([['b']], {}, 'a.', 'value', object);

			expect(object).toEqual({ 'a.b': 'value' });
			expect(actual).toBe('value');
		});

		it('should provide a root variable', () => {
			const actual = evaluate([['.b']], { b: 'value' }, 'a.');
			expect(actual).toBe('value');
		});

		it('should extract a root variable', () => {
			const actual = evaluate([['.b']], {}, 'a.', 'value', object);

			expect(object).toEqual({ 'b': 'value' });
			expect(actual).toBe('value');
		});
	});

	describe('strings and variables', () => {
		let object;

		beforeEach(() => {
			object = {};
		});

		it('should join variable between strings', () => {
			const actual = evaluate(['(', ['key'], ')'], { key: 'value' });
			expect(actual).toBe('(value)');
		});

		it('should parse variable between strings', () => {
			const actual = evaluate(['(', ['key'], ')'],
				{}, '', '(value)', object);

			expect(object).toEqual({ key: 'value' });
			expect(actual).toBe('(value)');
		});

		it('should join variables around string', () => {
			const actual = evaluate([['a'], ':', ['b']], { a: 1, b: 2 });
			expect(actual).toBe('1:2');
		});

		it('should parse variables around string', () => {
			const actual = evaluate([['a'], ':', ['b']],
				{}, '', '1:2', object);
			
			expect(object).toEqual({ a: 1, b: 2 });
			expect(actual).toBe('1:2');
		});

		it('should not join undefined', () => {
			const actual = evaluate(['(', ['key'], ')'], {});
			expect(actual).toBe('()');
		});

		it('should not join object', () => {
			const actual = evaluate(['(', ['key'], ')'], { key: {} });
			expect(actual).toBe('()');
		});

		it('should not join function', () => {
			const actual = evaluate(['(', ['key'], ')'], { key: () => {} });
			expect(actual).toBe('()');
		});

		it('should not parse missing variable', () => {
			const actual = evaluate(['(', ['key'], ')'],
				{}, '', '()', object);

			expect(object).toEqual({});
			expect(actual).toBe('()');
		});
	});

	describe('conditions', () => {
		let object;

		beforeEach(() => {
			object = {};
		});

		it('should report a match', () => {
			const actual = evaluate([['key', 1]], { key: 1 });
			expect(actual).toBe(true);
		});

		it('should report a mismatch', () => {
			const actual = evaluate([['key', 1]], { key: 2 });
			expect(actual).toBe(false);
		});

		it('should provide an allowed string', () => {
			const actual = evaluate([['key', 1], 'success'], { key: 1 });
			expect(actual).toBe('success');
		});

		it('should extract an allowed string', () => {
			const actual = evaluate([['key', 1], 'success'],
				{}, '', 'success', object);

			expect(object).toEqual({ key: 1 });
			expect(actual).toBe('success');
		});

		it('should not provide a denied string', () => {
			const actual = evaluate([['key', 1], 'failure'], { key: 2 });
			expect(actual).toBe('');
		});

		it('should not extract a denied string', () => {
			const actual = evaluate([['key', 1], 'failure'],
				{}, '', '', object);
			
			expect(object).toEqual({});
			expect(actual).toBe('');
		});
	});
});
