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
	return html.replace(/(^|>)\s+|(^|[\r\n])\s+(<|$)/g, m => m.trim()).replace(/[\r\n]+\s*/g, '\n');
}

beforeEach(() => {
	jest.clearAllMocks();
	elements.splice(0);
	checkValidity.mockReturnValue(true);

	fetchData.mockImplementation(() => dataMock);
	fetchCode.mockImplementation(() => ({ default: [null, schemaMock] }));
	fetchList.mockImplementation(() => listMock);

	globalThis.stew = stew;
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
	it.skip('extracts data', () => {
		const form = stew('#', null, ['form', null, Field({
			// boolean: 'Boolean',
			// number: '/.. Number',
			// string: '// String',
			// object: {
			// 	'': 'Object',
			// 	boolean: 'Boolean',
			// 	number: '/.. Number',
			// 	string: '// String',
			// },
			array: ['/.. Array',
				// 'Boolean',
				// '/.. Number',
				// '// String',
				{
					boolean: 'Boolean',
					number: '/.. Number',
					string: '// String',
				},
			],
		}, {
			boolean: true,
			number: 123,
			string: 'abc',
			object: {
				boolean: true,
				number: 456,
				string: 'lmno',
			},
			array: [
				true,
				654,
				'onml',
				{
					boolean: true,
					number: 789,
					string: 'xyz',
				},
			],
		})]);

		expect(String(form)).toEqual();

		Object.assign(form, {
			checkValidity: () => true,
			elements: form.querySelectorAll('input, textarea'),
		});

		const actual = extractData(form);

		expect(actual).toEqual({
			boolean: true,
			number: 123,
			string: 'abc',
			object: {
				boolean: true,
				number: 456,
				string: 'lmno',
			},
			array: [
				true,
				654,
				'onml',
				{
					boolean: true,
					number: 789,
					string: 'xyz',
				},
			],
		});
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
			'Number /..',
			'String //',
		], undefined, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label class="select-label">
				Label
				<select selected-index="0">
					<option selected>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
		`));
	});

	it('value select with info', () => {
		const actual = stew('#', null, Field(['Label / Choose an item...',
			'Number /..',
			'String //',
		], undefined, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label class="select-label">
				Label
				<select selected-index="0">
					<option selected>Choose an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
		`));
	});

	it('value select populated', () => {
		const actual = stew('#', null, Field(['Label',
			'Number /..',
			'String //',
		], 123, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label class="select-label">
				Label
				<select selected-index="1">
					<option selected>Select an item...</option>
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
		const actual = stew('#', null, Field(['Label /..',
			'Number /..',
			'String //',
		], undefined, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label class="select-label">
				Label
				<select>
					<option selected>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<textarea id="group."></textarea>
			<ol class="" start="1"></ol>
		`));
	});

	/*

	test these fully
	
	1: /123 (number, boolean, or null)
	2: // abc (string)
	3: Label / value (uses own schema and data)
	4: Label /path/ value (using existing schema)
	5: Label /path/name value (using existing data)
	
	Label and value are optional for objects
	
	*/
	it('array select populated', () => {
		const actual = stew('#', null, Field(['Label /..',
			'Number /..',
			'String //',
		], ['abc', 123], 'group'));

		expect(String(actual)).toEqual(trim(`
			<label class="select-label">
				Label
				<select>
					<option selected>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<textarea id="group.">
				1. // abc
				2. /123
			</textarea>
			<ol class="" start="1">
				<li style="display:none;">
					<label for="group[0]">
						String
						<input id="group[0]" type="text" value="abc">
					</label>
				</li>
				<li style="display:none;">
					<label for="group[1]">
						Number
						<input id="group[1]" type="number" value="123">
					</label>
				</li>
			</ol>
		`));
	});

	it.only('array select object populated', () => {
		const actual = stew('#', null, Field(['Label /..',
			{
				'': 'Object / string',
				number: 'Number /..',
				string: 'String //',
			}
		], [true, { number: 123, string: 'abc' }], 'group'));

		expect(String(actual)).toEqual(trim(`
			<label class="select-label">
				Label
				<button type="button" class="action-button">Add</button>
			</label>
			<textarea id="group.">
				2. Object / abc
			</textarea>
			<ol class="" start="1">
				<li style="display:none;">
					<label>
						Object
						<button type="button" class="action-button">Show</button>
					</label>
					<ul>
						<li>
							<label for="group[1].number">
								Number
								<input id="group[1].number" type="number" value="123">
							</label>
						</li>
						<li>
							<label for="group[1].string">
								String
								<input id="group[1].string" type="text" value="abc">
							</label>
						</li>
					</ul>
				</li>
			</ol>
		`));
	});

	it('array select without labels', () => {
		const actual = stew('#', null, Field(['Label /..',
			'/ static',
			'/..',
			'//',
		], ['static', 123, 'abc'], 'group'));

		expect(String(actual)).toEqual(trim(`
			<label class="select-label">
				Label
				<select>
					<option selected>Select an item...</option>
					<option>static</option>
					<option>number</option>
					<option>string</option>
				</select>
			</label>
			<textarea id="group.">
				1: // static
				2: /123
				3: // abc
			</textarea>
			<ol>
				<li style="display:none;">
					<label class="static-label" for="group[0]">
						<input id="group[0]" value="static" disabled>
					</label>
				</li>
				<li style="display:none;">
					<label for="group[1]">
						<input id="group[1]" type="number" value="123">
					</label>
				</li>
				<li style="display:none;">
					<label for="group[2]">
						<input id="group[2]" type="text" value="abc">
					</label>
				</li>
			</ol>
		`));
	});

	// TODO: have newly added items show by default
	// - include a button to hide then (which will then add/update their row in the textarea)
	// - maybe support adding new rows manually by having 'Add' action borrow their values to prefill the appropriate field
	it.skip('array select add', async () => {
		const actual = stew('#', null, Field(['Label /..',
			'Number /..',
			'String //',
		], undefined, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label class="select-label">
				Label
				<select>
					<option selected>Select an item...</option>
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
			<label class="select-label">
				Label
				<select>
					<option selected>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<textarea></textarea>
			<ol>
				<li style="display:none;">
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
		const actual = stew('#', null, Field(['Label //',
			'Number /..',
			'String //',
		], undefined, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label class="select-label">
				Label
				<select>
					<option selected>Select an item...</option>
					<option>Number</option>
					<option>String</option>
				</select>
			</label>
			<input type="text">
			<ul></ul>
		`));
	});

	it('property select populated', () => {
		const actual = stew('#', null, Field(['Label //',
			'Number /..',
			'String //',
		], {
			number: 123,
			text: 'abc',
		}, 'group'));

		expect(String(actual)).toEqual(trim(`
			<label class="select-label">
				Label
				<select>
					<option selected>Select an item...</option>
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
				<input id="group.name" type="checkbox">
			</label>
		`));
	});

	it('checkbox using slash', () => {
		const actual = stew('#', null, Field('/', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				<input id="group.name" type="checkbox">
			</label>
		`));
	});

	it('checkbox with label', () => {
		const actual = stew('#', null, Field('Label', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				Label
				<input id="group.name" type="checkbox">
			</label>
		`));
	});

	it('static', () => {
		const actual = stew('#', null, Field('/ static', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label class="static-label" for="group.name">
				<input id="group.name" value="static" disabled>
			</label>
		`));
	});

	it('static with label', () => {
		const actual = stew('#', null, Field('Label / static', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label class="static-label" for="group.name">
				Label
				<input id="group.name" value="static" disabled>
			</label>
		`));
	});

	it('static with slash', () => {
		const actual = stew('#', null, Field('Label / static / value', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label class="static-label" for="group.name">
				Label
				<input id="group.name" value="static / value" disabled>
			</label>
		`));
	});

	it('placeholder', () => {
		const actual = stew('#', null, Field('Label // Placeholder', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				Label
				<input id="group.name" placeholder="Placeholder" type="text">
			</label>
		`));
	});

	it('required', () => {
		const actual = stew('#', null, Field('Label *//', undefined, 'group', 'name'));

		expect(String(actual)).toEqual(trim(`
			<label for="group.name">
				Label
				<input id="group.name" type="text" required>
			</label>
		`));
	});

	describe('number', () => {
		it('basic', () => {
			const actual = stew('#', null, Field('Label /..', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="number">
				</label>
			`));
		});

		it('max shorthand', () => {
			const actual = stew('#', null, Field('Label /4', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="4" type="number">
				</label>
			`));
		});

		it('max', () => {
			const actual = stew('#', null, Field('Label /..4', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="4" type="number">
				</label>
			`));
		});

		it('min', () => {
			const actual = stew('#', null, Field('Label /0..', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" min="0" type="number">
				</label>
			`));
		});

		it('step', () => {
			const actual = stew('#', null, Field('Label /..2..', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" step="2" type="number">
				</label>
			`));
		});

		it('min and max', () => {
			const actual = stew('#', null, Field('Label /0..4', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="4" min="0" type="number">
				</label>
			`));
		});

		it('min and step', () => {
			const actual = stew('#', null, Field('Label /0..2..', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" min="0" step="2" type="number">
				</label>
			`));
		});

		it('step and max', () => {
			const actual = stew('#', null, Field('Label /..2..4', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="4" step="2" type="number">
				</label>
			`));
		});

		it('min, step, and max', () => {
			const actual = stew('#', null, Field('Label /0..2..4', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="4" min="0" step="2" type="number">
				</label>
			`));
		});

		it('datetime-local', () => {
			const actual = stew('#', null, Field('Label /2000-01-01T12:00..7..2020-01-01T12:00', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01T12:00" min="2000-01-01T12:00" step="7" type="datetime-local">
				</label>
			`));
		});

		it('datetime-local and min date', () => {
			const actual = stew('#', null, Field('Label /2000-01-01..7..2020-01-01T12:00', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01T12:00" min="2000-01-01T00:00" step="7" type="datetime-local">
				</label>
			`));
		});

		it('datetime-local and min year', () => {
			const actual = stew('#', null, Field('Label /2000..7..2020-01-01T12:00', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01T12:00" min="2000-01-01T00:00" step="7" type="datetime-local">
				</label>
			`));
		});

		it('datetime-local and max date', () => {
			const actual = stew('#', null, Field('Label /2000-01-01T12:00..7..2020-01-01', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01T00:00" min="2000-01-01T12:00" step="7" type="datetime-local">
				</label>
			`));
		});

		it('datetime-local and max year', () => {
			const actual = stew('#', null, Field('Label /2000-01-01T12:00..7..2020', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01T00:00" min="2000-01-01T12:00" step="7" type="datetime-local">
				</label>
			`));
		});

		it('date', () => {
			const actual = stew('#', null, Field('Label /2000-01-01..7..2020-01-01', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01" min="2000-01-01" step="7" type="date">
				</label>
			`));
		});

		it('date and min year', () => {
			const actual = stew('#', null, Field('Label /2000..7..2020-01-01', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01" min="2000-01-01" step="7" type="date">
				</label>
			`));
		});

		it('date and max year', () => {
			const actual = stew('#', null, Field('Label /2000-01-01..7..2020', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" max="2020-01-01" min="2000-01-01" step="7" type="date">
				</label>
			`));
		});

		it('populated', () => {
			const actual = stew('#', null, Field('Label /..', 123, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="number" value="123">
				</label>
			`));
		});

		it('populated datetime-local', () => {
			const actual = stew('#', null, Field('Label datetime-local/..', '2010-01-01T12:00', 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="datetime-local" value="2010-01-01T12:00">
				</label>
			`));
		});

		it('populated add time', () => {
			const actual = stew('#', null, Field('Label datetime-local/..', '2010-01-01', 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="datetime-local" value="2010-01-01T00:00">
				</label>
			`));
		});

		it('populated add date and time', () => {
			const actual = stew('#', null, Field('Label datetime-local/..', 2010, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="datetime-local" value="2010-01-01T00:00">
				</label>
			`));
		});

		it('populated add date', () => {
			const actual = stew('#', null, Field('Label date/..', 2010, 'group', 'name'));

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
			const actual = stew('#', null, Field('Label //', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="text">
				</label>
			`));
		});

		it('pattern', () => {
			const actual = stew('#', null, Field('Label /\\w*/', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" pattern="\\w*" type="text">
				</label>
			`));
		});

		it('maxlength shorthand', () => {
			const actual = stew('#', null, Field('Label //4', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" maxlength="4" type="text">
				</label>
			`));
		});

		it('maxlength', () => {
			const actual = stew('#', null, Field('Label //..4', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" maxlength="4" type="text">
				</label>
			`));
		});

		it('minlength', () => {
			const actual = stew('#', null, Field('Label //0..', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" minlength="0" type="text">
				</label>
			`));
		});

		it('minlength and maxlength', () => {
			const actual = stew('#', null, Field('Label //0..4', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" maxlength="4" minlength="0" type="text">
				</label>
			`));
		});

		it('populated', () => {
			const actual = stew('#', null, Field('Label //', 'abc', 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<input id="group.name" type="text" value="abc">
				</label>
			`));
		});

		it('textarea unpopulated', () => {
			const actual = stew('#', null, Field('Label textarea//', undefined, 'group', 'name'));

			expect(String(actual)).toEqual(trim(`
				<label for="group.name">
					Label
					<textarea id="group.name"></textarea>
				</label>
			`));
		});

		it('textarea populated', () => {
			const actual = stew('#', null, Field('Label textarea//', 'abc', 'group', 'name'));

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
				number: 'Number /..',
				text: 'Text //',
			}, undefined, 'group'));

			expect(String(actual)).toEqual(trim(`
				<label>
					Label
					<button class="action-button" type="button">Create</button>
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
				'': 'Label / text',
				number: 'Number /..',
				text: 'Text //',
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

		it('without labels', async () => {
			const actual = stew('#', null, Field({
				number: '/..',
				text: '//',
			}, {
				number: 123,
				text: 'abc',
			}, 'group'));

			expect(String(actual)).toEqual(trim(`
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

		it('blank reference', async () => {
			schemaMock = {
				number: 'Number /..',
				text: 'Text //',
			};
			
			const actual = stew('#', null, Field({
				'': 'Label /path//',
			}, {
				number: 123,
				text: 'abc',
			}, 'group'));

			await stew();

			expect(String(actual)).toEqual(trim(`
				<label>Label</label>
				<input id="group." value="/path/" disabled>
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
				number: 'Number /..',
				text: 'Text //',
			};

			listMock = ['first', 'second'];
			
			const actual = stew('#', null, Field({
				'': 'Label /path//',
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
				<input id="group." value="/path/" disabled>
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
				number: 'Number /..',
				text: 'Text //',
			};

			listMock = ['first', 'second'];

			const actual = stew('#', null, Field('Label /path//', {
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
				<input id="group." value="/path/" disabled>
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
				number: 'Number /..',
				text: 'Text //',
			};

			const actual = stew('#', null, Field({
				'': 'Label /path//',
				boolean: 'Boolean',
			}, {
				number: 123,
				text: 'abc',
				boolean: true,
			}, 'group'));

			expect(String(actual)).toEqual(trim(`
				<label>Label</label>
				<input id="group." value="/path/" disabled>
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
				number: 'Number /..',
				text: 'Text //',
			};

			dataMock = {
				number: 123,
				text: 'abc',
			};

			listMock = ['first', 'second'];

			const actual = stew('#', null, Field({
				'': 'Label /path//',
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
					number: 'Number /..',
					text: 'Text //',
				},
				array: ['Array /..', {
					'': 'Object',
					number: 'Number /..',
					text: 'Text //',
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
							<button class="action-button" type="button">Create</button>
						</label>
						<ul></ul>
					</li>
					<li>
						<label class="select-label">
							Array
							<select>
								<option selected>Select an item...</option>
								<option>Object</option>
							</select>
						</label>
						<textarea id="group.array."></textarea>
						<ol></ol>
					</li>
				</ul>
			`));
		});

		// TODO: test that reference data is being populated for object
		it('nested populated', async () => {
			const actual = stew('#', null, Field({
				'': 'Label',
				object: {
					'': 'Object /path//',
					number: 'Number /..',
					text: 'Text //',
				},
				array: ['Array /..', 'String //', {
					'': 'Object /path//',
					number: 'Number /..',
					text: 'Text //',
				}],
			}, {
				object: {
					'': '/path/first',
					number: 123,
					text: 'abc',
				},
				array: [
					'lmno',
					{
						'': '/path/second',
						number: 789,
						text: 'xyz',
					},
				],
			}, 'group'));

			expect(String(actual)).toEqual(trim(`
				<label>Label</label>
				<ul>
					<li>
						<label>Object</label>
						<input id="group.object." value="/path/first" disabled>
						<ul>
							<li>
								<label for="group.object.number">
									Number
									<input id="group.object.number" type="number" value="123">
								</label>
							</li>
							<li>
								<label for="group.object.text">
									Text
									<input id="group.object.text" type="text" value="abc">
								</label>
							</li>
						</ul>
					</li>
					<li>
						<label class="select-label">
							Array
							<select>
								<option selected>Select an item...</option>
								<option>String</option>
								<option>Object</option>
							</select>
						</label>
						<textarea id="group.array.">
							1: // lmno
							2: /path/second 
						</textarea>
						<ol>
							<li style="display:none;">
								<label for="group.array[0]">
									String
									<input id="group.array[0]" type="text" value="lmno">
								</label>
							</li>
							<li style="display:none;">
								<label>Object</label>
								<input id="group.array[1]." value="/path/second" disabled>
								<ul>
									<li>
										<label for="group.array[1].number">
											Number
											<input id="group.array[1].number" type="number" value="789">
										</label>
									</li>
									<li>
										<label for="group.array[1].text">
											Text
											<input id="group.array[1].text" type="text" value="xyz">
										</label>
									</li>
								</ul>
							</li>
						</ol>
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

});
