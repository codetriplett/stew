import { extractData, checkInput, findOption, Select, Field } from './form';
import { fetchCode, fetchData, fetchList } from './fetch';
import stew from './stew';

jest.mock('./fetch');

/*

/ Boolean

/.. Any Number
/0.. Any Positive Number
/..0 Any Negative Number
/0..5 Number Between 0 and 5

// Any String
/\w+/ Any String with pattern
//0..5 Any String with minlength and maxlength
/\w+/0..5 Any String with pattern, minlength, and maxlength

/path/\w+/ Reference (saves as { '': '/path/name', ...overrides })

path/path/\w+/

*/

const checkValidity = jest.fn();
const reportValidity = jest.fn();
export const elements = [];
let form, dataMock, schemaMock, listMock;

export function addElements (value, id = '') {
	let type = 'text';
	let checked = false;

	switch (typeof value) {
		case 'number': {
			type = 'number';
			value = String(value);
			break;
		}
		case 'boolean': {
			type = 'checkbox';
			checked = value;
			value = checked ? 'on' : 'off';
			break;
		}
		case 'object': {
			if (Array.isArray(value)) {
				for (const [i, item] of value.entries()) {
					addElements(item, `${id}[${i}]`);
				}

				return;
			} else if (value) {
				if (id) {
					id = `${id}.`;
				}

				for (const [name, item] of Object.entries(value)) {
					addElements(item, `${id}${name}`);
				}

				return;
			}
		}
		case 'undefined': {
			value = '';
			break;
		}
	}

	elements.push({ type, id, value, checked, placeholder: '' });
}

function trim (html) {
	return html.replace(/(^|>)\s+|\s+(<|$)/g, m => m.trim());
}

beforeEach(() => {
	jest.clearAllMocks();
	elements.splice(0);
	checkValidity.mockReturnValue(true);

	fetchData.mockImplementation(() => dataMock);
	fetchCode.mockImplementation(() => ({ default: [null, schemaMock] }));
	fetchList.mockImplementation(() => listMock);

	globalThis.document = stew;

	dataMock = {};
	schemaMock = {};
	listMock = [];

	form = {
		checkValidity,
		reportValidity,
		elements,
	};
});

describe('extractData', () => {
	it('extracts data', () => {
		addElements({
			boolean: true,
			number: 123,
			string: 'abc',
			object: {
				boolean: true,
				number: 123,
				string: 'abc',
			},
			array: [
				true,
				123,
				'abc',
				{
					boolean: true,
					number: 123,
					string: 'abc',
				},
			],
		});

		expect(elements).toEqual([
			{ id: 'boolean', type: 'checkbox', value: 'on', checked: true, placeholder: '' },
			{ id: 'number', type: 'number', value: '123', checked: false, placeholder: '' },
			{ id: 'string', type: 'text', value: 'abc', checked: false, placeholder: '' },
			{ id: 'object.boolean', type: 'checkbox', value: 'on', checked: true, placeholder: '' },
			{ id: 'object.number', type: 'number', value: '123', checked: false, placeholder: '' },
			{ id: 'object.string', type: 'text', value: 'abc', checked: false, placeholder: '' },
			{ id: 'array[0]', type: 'checkbox', value: 'on', checked: true, placeholder: '' },
			{ id: 'array[1]', type: 'number', value: '123', checked: false, placeholder: '' },
			{ id: 'array[2]', type: 'text', value: 'abc', checked: false, placeholder: '' },
			{ id: 'array[3].boolean', type: 'checkbox', value: 'on', checked: true, placeholder: '' },
			{ id: 'array[3].number', type: 'number', value: '123', checked: false, placeholder: '' },
			{ id: 'array[3].string', type: 'text', value: 'abc', checked: false, placeholder: '' },
		]);

		const actual = extractData(form);

		expect(actual).toEqual({
			boolean: true,
			number: 123,
			string: 'abc',
			object: {
				boolean: true,
				number: 123,
				string: 'abc',
			},
			array: [
				true,
				123,
				'abc',
				{
					boolean: true,
					number: 123,
					string: 'abc',
				},
			],
		});
	});
});

describe.skip('checkInput', () => {
	it('accepts number within free range', () => {
		const actual = checkInput([, { type: 'number' }], 2);
		expect(actual).toEqual(true);
	});

	it('accepts number within strict range', () => {
		const actual = checkInput([, { type: 'number', min: 0, max: 4 }], 2);
		expect(actual).toEqual(true);
	});
	
	it('rejects number below range', () => {
		const actual = checkInput([, { type: 'number', min: 2, max: 4 }], 0);
		expect(actual).toEqual(false);
	});
	
	it('rejects number above range', () => {
		const actual = checkInput([, { type: 'number', min: 0, max: 2 }], 4);
		expect(actual).toEqual(false);
	});
});

describe.skip('findOption', () => {
	it('finds checkbox input', () => {
		const actual = findOption(true, [, {}], [, { type: 'checkbox' }]);
		expect(actual).toEqual(1);
	});

	it('finds number input', () => {
		const actual = findOption(123, [, {}], [, { type: 'number' }]);
		expect(actual).toEqual(1);
	});

	it('finds text input', () => {
		const actual = findOption('abc', [, {}], [, { type: 'text' }]);
		expect(actual).toEqual(1);
	});

	it('finds textarea input', () => {
		const actual = findOption('abc', [, {}], ['textarea', {}]);
		expect(actual).toEqual(1);
	});

	it('finds reference input', () => {
		const actual = findOption({ '': '/folder/file' }, [, {}], [, { type: 'text', dataset: { path: '/folder/' }}]);
		expect(actual).toEqual(1);
	});

	it('rejects undefined', () => {
		const actual = findOption(undefined, [, {}], [, { type: 'text' }]);
		expect(actual).toEqual(-1);
	});
});

// Literal: sets value and disabled prop
// =============
// true ** Boolean
// 123 */* Number
// abc *//* String

// Required: rejects form submission when empty (placeholder is just a suggestion)
// =============
// true * Boolean
// 123 /* Number
// abc //* String

// Default: stores placeholder when empty
// =============
// 123 */ Number
// abc *// String

describe('Select', () => {
	it('value select', () => {
		const actual = stew('#', null, Field(['Label',
			'/.. Number',
			'// String',
		], undefined, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label>
				Label
				<select>
					<option>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
		`));
	});

	it('value select populated', () => {
		const actual = stew('#', null, Field(['Label',
			'/.. Number',
			'// String',
		], 123, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label>
				Label
				<select>
					<option>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<label for="group">
				Number
				<input id="group" type="number" value="123">
			</label>
		`));
	});

	it('array select', () => {
		const actual = stew('#', null, Field(['/.. Label',
			'/.. Number',
			'// String',
		], undefined, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label>
				Label
				<select>
					<option>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<ol></ol>
		`));
	});

	it('array select populated', () => {
		const actual = stew('#', null, Field(['/.. Label',
			'/.. Number',
			'// String',
		], ['abc', 123], 'group'));

		expect(String(actual)).toEqual(trim(`
			<label>
				Label
				<select>
					<option>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<ol>
				<li>
					<label for="group[0]">
						String
						<input id="group[0]" type="text" value="abc">
					</label>
				</li>
				<li>
					<label for="group[1]">
						Number
						<input id="group[1]" type="number" value="123">
					</label>
				</li>
			</ol>
		`));
	});

	it('array select add', async () => {
		const actual = stew('#', null, Field(['/.. Label',
			'/.. Number',
			'// String',
		], undefined, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label>
				Label
				<select>
					<option>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<ol></ol>
		`));

		const select = actual.querySelector('select');
		select.onchange(({ target: { selectedIndex: 2 } }));
		await stew();

		expect(String(actual)).toEqual(trim(`
			<label>
				Label
				<select>
					<option>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<ol>
				<li>
					<label for="group[0]">
						String
						<input id="group[0]" type="text">
					</label>
				</li>
			</ol>
		`));
	});

	// TODO: display a textarea of all the item's values instead of the full list
	// - user can modify the lines in this to create/remove/reorder elements without needing a clumsy UI
	// - use placeholder text in object definition to indicate which of its keys should be used as the display value (defualt to '' or first key)
	// - it will still validate each lines item when saving the text area changes, just like when array was first populated
	// - ignore newly added lines that aren't compatible with one of the array's static types (don't create objects from them as the key)
	it.skip('array select reorder', () => {

	});

	it('property select', () => {
		const actual = stew('#', null, Field(['// Label',
			'/.. Number',
			'// String',
		], undefined, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label>
				Label
				<select>
					<option>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<input type="text">
			<ul></ul>
		`));
	});

	it('property select populated', () => {
		const actual = stew('#', null, Field(['// Label',
			'/.. Number',
			'// String',
		], {
			number: 123,
			text: 'abc',
		}, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label>
				Label
				<select>
					<option>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<input type="text">
			<ul>
				<li>
					<label for="group.number">
						number
						<input id="group.number" type="number" value="123">
					</label>
				</li>
				<li>
					<label for="group.text">
						text
						<input id="group.text" type="text" value="abc">
					</label>
				</li>
			</ul>
		`));
	});
});

describe('Field', () => {
	it('checkbox', () => {
		const actual = stew('#', null, Field('', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				name
				<input id="group.name" type="checkbox">
			</label>
		`));
	});

	it('label', () => {
		const actual = stew('#', null, Field('Label', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				Label
				<input id="group.name" type="checkbox">
			</label>
		`));
	});

	it('static', () => {
		const actual = stew('#', null, Field('Placeholder / Label', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				Label
				<input id="group.name" type="hidden" value="Placeholder">
			</label>
		`));
	});

	it('static with slash', () => {
		const actual = stew('#', null, Field('Placeholder / Value / Label', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				Label
				<input id="group.name" type="hidden" value="Placeholder / Value">
			</label>
		`));
	});

	it('empty', () => {
		const actual = stew('#', null, Field('/ Label', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				Label
				<input id="group.name" type="hidden" value="">
			</label>
		`));
	});

	it('placeholder', () => {
		const actual = stew('#', null, Field('Placeholder // Label', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				Label
				<input id="group.name" placeholder="Placeholder" type="text">
			</label>
		`));
	});

	it('required', () => {
		const actual = stew('#', null, Field('/* Label', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				Label
				<input id="group.name" type="number" required>
			</label>
		`));
	});

	describe('number', () => {
		it('basic', () => {
			const actual = stew('#', null, Field('/.. Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="number">
				</label>
			`));
		});

		it('max shorthand', () => {
			const actual = stew('#', null, Field('/4 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="4" type="number">
				</label>
			`));
		});

		it('max', () => {
			const actual = stew('#', null, Field('/..4 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="4" type="number">
				</label>
			`));
		});

		it('min', () => {
			const actual = stew('#', null, Field('/0.. Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" min="0" type="number">
				</label>
			`));
		});

		it('step', () => {
			const actual = stew('#', null, Field('/..2.. Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" step="2" type="number">
				</label>
			`));
		});

		it('min and max', () => {
			const actual = stew('#', null, Field('/0..4 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="4" min="0" type="number">
				</label>
			`));
		});

		it('min and step', () => {
			const actual = stew('#', null, Field('/0..2.. Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" min="0" step="2" type="number">
				</label>
			`));
		});

		it('step and max', () => {
			const actual = stew('#', null, Field('/..2..4 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="4" step="2" type="number">
				</label>
			`));
		});

		it('min, step, and max', () => {
			const actual = stew('#', null, Field('/0..2..4 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="4" min="0" step="2" type="number">
				</label>
			`));
		});

		it('datetime-local', () => {
			const actual = stew('#', null, Field('/2000-01-01T12:00..7..2020-01-01T12:00 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01T12:00" min="2000-01-01T12:00" step="7" type="datetime-local">
				</label>
			`));
		});

		it('datetime-local and min date', () => {
			const actual = stew('#', null, Field('/2000-01-01..7..2020-01-01T12:00 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01T12:00" min="2000-01-01T00:00" step="7" type="datetime-local">
				</label>
			`));
		});

		it('datetime-local and min year', () => {
			const actual = stew('#', null, Field('/2000..7..2020-01-01T12:00 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01T12:00" min="2000-01-01T00:00" step="7" type="datetime-local">
				</label>
			`));
		});

		it('datetime-local and max date', () => {
			const actual = stew('#', null, Field('/2000-01-01T12:00..7..2020-01-01 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01T00:00" min="2000-01-01T12:00" step="7" type="datetime-local">
				</label>
			`));
		});

		it('datetime-local and max year', () => {
			const actual = stew('#', null, Field('/2000-01-01T12:00..7..2020 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01T00:00" min="2000-01-01T12:00" step="7" type="datetime-local">
				</label>
			`));
		});

		it('date', () => {
			const actual = stew('#', null, Field('/2000-01-01..7..2020-01-01 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01" min="2000-01-01" step="7" type="date">
				</label>
			`));
		});

		it('date and min year', () => {
			const actual = stew('#', null, Field('/2000..7..2020-01-01 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01" min="2000-01-01" step="7" type="date">
				</label>
			`));
		});

		it('date and max year', () => {
			const actual = stew('#', null, Field('/2000-01-01..7..2020 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01" min="2000-01-01" step="7" type="date">
				</label>
			`));
		});

		it('populated', () => {
			const actual = stew('#', null, Field('/.. Label', 123, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="number" value="123">
				</label>
			`));
		});

		it('populated datetime-local', () => {
			const actual = stew('#', null, Field('datetime-local/.. Label', '2010-01-01T12:00', 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="datetime-local" value="2010-01-01T12:00">
				</label>
			`));
		});

		it('populated add time', () => {
			const actual = stew('#', null, Field('datetime-local/.. Label', '2010-01-01', 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="datetime-local" value="2010-01-01T00:00">
				</label>
			`));
		});

		it('populated add date and time', () => {
			const actual = stew('#', null, Field('datetime-local/.. Label', 2010, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="datetime-local" value="2010-01-01T00:00">
				</label>
			`));
		});

		it('populated add date', () => {
			const actual = stew('#', null, Field('date/.. Label', 2010, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="date" value="2010-01-01">
				</label>
			`));
		});
	});

	describe('text', () => {
		it('basic', () => {
			const actual = stew('#', null, Field('// Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="text">
				</label>
			`));
		});

		it('pattern', () => {
			const actual = stew('#', null, Field('/\\w*/ Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" pattern="\\w*" type="text">
				</label>
			`));
		});

		it('maxlength shorthand', () => {
			const actual = stew('#', null, Field('//4 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" maxlength="4" type="text">
				</label>
			`));
		});

		it('maxlength', () => {
			const actual = stew('#', null, Field('//..4 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" maxlength="4" type="text">
				</label>
			`));
		});

		it('minlength', () => {
			const actual = stew('#', null, Field('//0.. Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" minlength="0" type="text">
				</label>
			`));
		});

		it('minlength and maxlength', () => {
			const actual = stew('#', null, Field('//0..4 Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" maxlength="4" minlength="0" type="text">
				</label>
			`));
		});

		it('populated', () => {
			const actual = stew('#', null, Field('// Label', 'abc', 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="text" value="abc">
				</label>
			`));
		});

		it('textarea unpopulated', () => {
			const actual = stew('#', null, Field('textarea// Label', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<textarea id="group.name"></textarea>
				</label>
			`));
		});

		it('textarea populated', () => {
			const actual = stew('#', null, Field('textarea// Label', 'abc', 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<textarea id="group.name">abc</textarea>
				</label>
			`));
		});
	});

	describe('object', () => {
		it('unpopulated', async () => {
			const actual = stew('#', null, Field({
				'': 'Label',
				number: '/.. Number',
				text: '// Text',
			}, undefined, 'group'));

			expect(String(actual)).toEqual(trim(`
				<label>
					Label
					<button type="button" style="float:right;margin-top:-21px;">Create</button>
				</label>
				<ul></ul>
			`));

			const button = actual.querySelector('button');
			button.onclick();
			await stew();

			expect(String(actual)).toEqual(trim(`
				<label>Label</label>
				<ul>
					<li>
						<label for="group.number">
							Number
							<input id="group.number" type="number">
						</label>
					</li>
					<li>
						<label for="group.text">
							Text
							<input id="group.text" type="text">
						</label>
					</li>
				</ul>
			`));
		});

		it('populated', () => {
			const actual = stew('#', null, Field({
				'': 'Label',
				number: '/.. Number',
				text: '// Text',
			}, {
				number: 123,
				text: 'abc',
			}, 'group'));

			expect(String(actual)).toEqual(trim(`
				<label>Label</label>
				<ul>
					<li>
						<label for="group.number">
							Number
							<input id="group.number" type="number" value="123">
						</label>
					</li>
					<li>
						<label for="group.text">
							Text
							<input id="group.text" type="text" value="abc">
						</label>
					</li>
				</ul>
			`));
		});

		it('blank reference', async () => {
			schemaMock = {
				number: '/.. Number',
				text: '// Text',
			};
			
			const actual = stew('#', null, Field({
				'': '/path// Label',
			}, {
				number: 123,
				text: 'abc',
			}, 'group'));

			await stew();

			expect(String(actual)).toEqual(trim(`
				<label>Label</label>
				<ul>
					<li>
						<label for="group.number">
							Number
							<input id="group.number" type="number" value="123">
						</label>
					</li>
					<li>
						<label for="group.text">
							Text
							<input id="group.text" type="text" value="abc">
						</label>
					</li>
				</ul>
			`));
		});

		it('with selections', async () => {
			schemaMock = {
				number: '/.. Number',
				text: '// Text',
			};

			listMock = ['first', 'second'];
			
			const actual = stew('#', null, Field({
				'': '/path// Label',
			}, {
				number: 123,
				text: 'abc',
			}, 'group'));

			expect(String(actual)).toEqual(trim(`
				<label>
					Label
					<select selected-index="0">
						<option value="">Select an item...</option>
						<option value="first">first</option>
						<option value="second">second</option>
					</select>
				</label>
				<ul>
					<li>
						<label for="group.number">
							Number
							<input id="group.number" type="number" value="123">
						</label>
					</li>
					<li>
						<label for="group.text">
							Text
							<input id="group.text" type="text" value="abc">
						</label>
					</li>
				</ul>
			`));
		});

		it('shorthand reference', () => {
			schemaMock = {
				number: '/.. Number',
				text: '// Text',
			};

			listMock = ['first', 'second'];

			const actual = stew('#', null, Field('/path// Label', {
				number: 123,
				text: 'abc',
			}, 'group'));

			expect(String(actual)).toEqual(trim(`
				<label>
					Label
					<select selected-index="0">
						<option value="">Select an item...</option>
						<option value="first">first</option>
						<option value="second">second</option>
					</select>
				</label>
				<ul>
					<li>
						<label for="group.number">
							Number
							<input id="group.number" type="number" value="123">
						</label>
					</li>
					<li>
						<label for="group.text">
							Text
							<input id="group.text" type="text" value="abc">
						</label>
					</li>
				</ul>
			`));
		});

		it('extended reference', () => {
			schemaMock = {
				number: '/.. Number',
				text: '// Text',
			};

			const actual = stew('#', null, Field({
				'': '/path// Label',
				boolean: 'Boolean',
			}, {
				number: 123,
				text: 'abc',
				boolean: true,
			}, 'group'));

			expect(String(actual)).toEqual(trim(`
				<label>Label</label>
				<ul>
					<li>
						<label for="group.number">
							Number
							<input id="group.number" type="number" value="123">
						</label>
					</li>
					<li>
						<label for="group.text">
							Text
							<input id="group.text" type="text" value="abc">
						</label>
					</li>
					<li>
						<label for="group.boolean">
							Boolean
							<input id="group.boolean" type="checkbox" checked>
						</label>
					</li>
				</ul>
			`));
		});

		it('extended reference and data', () => {
			schemaMock = {
				number: '/.. Number',
				text: '// Text',
			};

			dataMock = {
				number: 123,
				text: 'abc',
			};

			listMock = ['first', 'second'];

			const actual = stew('#', null, Field({
				'': '/path// Label',
				boolean: 'Boolean',
			}, {
				'': '/path/second',
				boolean: true,
			}, 'group'));

			expect(String(actual)).toEqual(trim(`
				<label>
					Label
					<select value="second">
						<option value="">Select an item...</option>
						<option value="first">first</option>
						<option value="second">second</option>
					</select>
				</label>
				<input id="group." value="/path/second" disabled>
				<ul>
					<li>
						<label for="group.number">
							Number
							<input id="group.number" type="number">
						</label>
						<input value="123" disabled>
					</li>
					<li>
						<label for="group.text">
							Text
							<input id="group.text" type="text">
						</label>
						<input value="abc" disabled>
					</li>
					<li>
						<label for="group.boolean">
							Boolean
							<input id="group.boolean" type="checkbox" checked>
						</label>
					</li>
				</ul>
			`));
		});

		it('nested', async () => {
			const actual = stew('#', null, Field({
				'': 'Label',
				object: {
					'': 'Object',
					number: '/.. Number',
					text: '// Text',
				},
				array: ['/.. Array', {
					'': 'Object',
					number: '/.. Number',
					text: '// Text',
				}],
			}, undefined, 'group'));

			const button = actual.querySelector('button');
			button.onclick();
			await stew();

			expect(String(actual)).toEqual(trim(`
				<label>Label</label>
				<ul>
					<li>
						<label>
							Object
							<button type="button" style="float:right;margin-top:-21px;">Create</button>
						</label>
						<ul></ul>
					</li>
					<li>
						<label>
							Array
							<select>
								<option>Select an item...</option>
								<option>Object</option>
							</select>
						</label>
						<ol></ol>
					</li>
				</ul>
			`));
		});

		// TODO: test that reference data is being populated for object
		it.only('nested populated', async () => {
			const actual = stew('#', null, Field({
				'': 'Label',
				object: {
					'': 'Object',
					number: '/.. Number',
					text: '// Text',
				},
				array: ['/.. Array', {
					'': 'Object',
					number: '/.. Number',
					text: '// Text',
				}],
			}, undefined, 'group'));

			const button = actual.querySelector('button');
			button.onclick();
			await stew();

			expect(String(actual)).toEqual(trim(`
				<label>Label</label>
				<ul>
					<li>
						<label>
							Object
							<button type="button" style="float:right;margin-top:-21px;">Create</button>
						</label>
						<ul></ul>
					</li>
					<li>
						<label>
							Array
							<select>
								<option>Select an item...</option>
								<option>Object</option>
							</select>
						</label>
						<ol></ol>
					</li>
				</ul>
			`));
		});
	});

	// { '': 'Label', ... }: custom object
	// { '': '// Label', ... }: import/override root data (add textarea for fully custom JSON)
	// { '': '/.. Label', ... }: import/override root data
	// { '': '/path// Label', ... }: extend schema

	// ['Label', ...]: select one
	// ['placeholder / Label', ...]: select one with custom first option text
	// ['// Label', ...]: store in object under custom keys that match pattern
	// ['/.. Label', ...]: array
	
	// { '': '/ Label', ... }: not really supported (no path allowed, no slash already supports custom object)
	// ['/path// Label', ...]: not really supported

	describe.skip('array', () => {
		it('unpopulated', () => {
			const actual = Field(['Label',
				'/.. Number',
				'// Text',
			], undefined, 'group');

			expect(actual).toEqual([
				['label', {}, 'Label',
					['ol', {}],
					['select', { onchange: expect.any(Function) },
						['option', {}, 'Add item...'],
						['option', {}, 'Number'],
						['option', {}, 'Text'],
					],
				],
			]);
		});

		it('populated', () => {
			const actual = Field(['/ Label',
				'/ Number',
				'// Text',
			], [123, 'abc'], 'group');

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['ol', {},
					['li', {},
						['input', { type: 'number', id: 'group[0]', value: '123' }],
					],
					['li', {},
						['input', { type: 'text', id: 'group[1]', value: 'abc' }],
					],
				],
				['select', { onchange: expect.any(Function) },
					['option', {}, 'Add item...'],
					['option', {}, 'Number'],
					['option', {}, 'Text'],
				],
			]);
		});

		it('added', () => {
			const actual = Field(['/ Label',
				'/ Number',
				'// Text',
			], undefined, 'group');

			const select = actual[2];
			const { onchange } = select[1];
			onchange({ selectedIndex: 2 });

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['ol', {},
					['li', {},
						['input', { type: 'text', id: 'group[0]' }],
					],
				],
				['select', { onchange: expect.any(Function) },
					['option', { selected: true }, 'Add item...'],
					['option', {}, 'Number'],
					['option', {}, 'Text'],
				],
			]);
		});
	});

	describe.skip('select', () => {
		it('unpopulated', () => {
			const actual = Field(['Label',
				'123 */ Number',
				'abc *// Text',
			], undefined, 'group', 'name');

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['select', { onchange: expect.any(Function) },
					['option', {}, 'Select item...'],
					['option', {}, 'Number'],
					['option', {}, 'Text'],
				],
				['', {}],
			]);
		});

		it('populated with literal', () => {
			const actual = Field(['Label',
				'/ Number',
				'abc *//* Text',
			], 'abc', 'group', 'name');

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['select', { onchange: expect.any(Function) },
					['option', {}, 'Select item...'],
					['option', {}, 'Number'],
					['option', { selected: true }, 'Text'],
				],
				['input', { type: 'text', id: 'group.name', disabled: true, value: 'abc' }],
			]);
		});

		it('populated with non-literal', () => {
			const actual = Field(['Label',
				'/ Number',
				'// Text',
			], 'abc', 'group', 'name');

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['select', { onchange: expect.any(Function) },
					['option', {}, 'Select item...'],
					['option', {}, 'Number'],
					['option', { selected: true }, 'Text'],
				],
				['input', { type: 'text', id: 'group.name', value: 'abc'}]
			]);
		});

		it('set', () => {
			const actual = Field(['Label',
				'123 */* Number',
				'abc *//* Text',
			], undefined, 'group', 'name');

			const select = actual[1];
			const { onchange } = select[1];
			onchange({ selectedIndex: 2 });

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['select', { onchange: expect.any(Function) },
					['option', {}, 'Select item...'],
					['option', {}, 'Number'],
					['option', {}, 'Text'],
				],
				['input', { type: 'text', id: 'group.name', disabled: true, value: 'abc' }],
			]);
		});
		
		it('changed to literal', () => {
			const actual = Field(['Label',
				'123 */* Number',
				'// Text',
			], 'abc', 'group', 'name');

			const select = actual[1];
			const { onchange } = select[1];
			onchange({ selectedIndex: 1 });

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['select', { onchange: expect.any(Function) },
					['option', {}, 'Select item...'],
					['option', {}, 'Number'],
					['option', { selected: true }, 'Text'],
				],
				['input', { type: 'number', id: 'group.name', disabled: true, value: '123' }],
			]);
		});
		
		it('changed to non-literal', () => {
			const actual = Field(['Label',
				'/ Number',
				'abc *// Text',
			], 'abc', 'group', 'name');

			const select = actual[1];
			const { onchange } = select[1];
			onchange({ selectedIndex: 1 });

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['select', { onchange: expect.any(Function) },
					['option', {}, 'Select item...'],
					['option', {}, 'Number'],
					['option', { selected: true }, 'Text'],
				],
				['input', { type: 'number', id: 'group.name' }],
			]);
		});
		
		it('cleared', () => {
			const actual = Field(['Label',
				'/ Number',
				'// Text',
			], 'abc', 'group', 'name');

			const select = actual[1];
			const { onchange } = select[1];
			onchange({ selectedIndex: 0 });

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['select', { onchange: expect.any(Function) },
					['option', {}, 'Select item...'],
					['option', {}, 'Number'],
					['option', { selected: true }, 'Text'],
				],
				['', {}],
			]);
		});
	});

	describe.skip('properties', () => {
		it('unpopulated', () => {
			const actual = Field(['// Label',
				'/ Number',
				'// Text',
			], undefined, 'group');

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['ul', {}],
				['input', { type: 'text' }],
				['select', { onchange: expect.any(Function) },
					['option', {}, 'Add property...'],
					['option', {}, 'Number'],
					['option', {}, 'Text'],
				],
			]);
		});

		it('populated', () => {
			const actual = Field(['// Label',
				'/ Number',
				'// Text',
			], {
				number: 123,
				text: 'abc',
			}, 'group');

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['ul', {},
					['li', {},
						['label', { for: 'group.number' }, 'number'],
						['input', { type: 'number', id: 'group.number', value: '123' }],
					],
					['li', {},
						['label', { for: 'group.text' }, 'text'],
						['input', { type: 'text', id: 'group.text', value: 'abc' }],
					],
				],
				['input', { type: 'text' }],
				['select', { onchange: expect.any(Function) },
					['option', {}, 'Add property...'],
					['option', {}, 'Number'],
					['option', {}, 'Text'],
				],
			]);
		});

		it('added', () => {
			const actual = Field(['// Label',
				'/ Number',
				'// Text',
			], undefined, 'group');

			const input = actual[2];
			const select = actual[3];
			const { onchange } = select[1];
			input[1].value = 'text';
			onchange({ selectedIndex: 2 });

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['ul', {},
					['li', {},
						['label', { for: 'group.text' }, 'text'],
						['input', { type: 'text', id: 'group.text' }],
					],
				],
				['input', { type: 'text' }],
				['select', { onchange: expect.any(Function) },
					['option', { selected: true }, 'Add property...'],
					['option', {}, 'Number'],
					['option', {}, 'Text'],
				],
			]);
		});

		it('requires name', () => {
			const actual = Field(['// Label',
				'/ Number',
				'// Text',
			], undefined, 'group');

			const input = actual[2];
			const select = actual[3];
			const { onchange } = select[1];
			onchange({ selectedIndex: 2 });

			expect(actual).toEqual([
				['label', {}, 'Label'],
				['ul', {}],
				['input', { type: 'text' }],
				['select', { onchange: expect.any(Function) },
					['option', { selected: true }, 'Add property...'],
					['option', {}, 'Number'],
					['option', {}, 'Text'],
				],
			]);
		});
	});
});
