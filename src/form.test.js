import { extractData, checkInput, findOption, FormField } from './form';
import { fetchCode, fetchData } from './fetch';

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
let form, dataMock, schemaMock, memos;

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

beforeEach(() => {
	jest.clearAllMocks();
	elements.splice(0);
	checkValidity.mockReturnValue(true);
	fetchData.mockImplementation(() => dataMock);
	fetchCode.mockImplementation(() => ({ default: [null, schemaMock] }));

	globalThis.stew = (callback, params) => {
		if (typeof callback === 'function' && callback.name) {
			return callback(...params);
		}

		return memos.shift();
	};

	dataMock = {};
	schemaMock = {};
	memos = [];

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

describe('FormField', () => {
	it('checkbox', () => {
		const actual = FormField('/', undefined, 'group', 'name');

		expect(actual).toEqual(['label', {
			for: 'group.name',
		},
			['input', { type: 'checkbox', id: 'group.name' }],
			'name',
		]);
	});

	it('label', () => {
		const actual = FormField('/ Label', undefined, 'group', 'name');

		expect(actual).toEqual(['label', {
			for: 'group.name',
		},
			['input', { type: 'checkbox', id: 'group.name' }],
			'Label',
		]);
	});

	it('required', () => {
		const actual = FormField('*/ Label', undefined, 'group', 'name');

		expect(actual).toEqual(['label', {
			for: 'group.name',
		},
			['input', { type: 'checkbox', id: 'group.name', required: true }],
			'Label',
		]);
	});

	it('static', () => {
		const actual = FormField('Placeholder / Label', undefined, 'group', 'name');

		expect(actual).toEqual(['label', {
			for: 'group.name',
		}, 'Label',
			['input', { type: 'hidden', id: 'group.name', value: 'Placeholder' }],
		]);
	});

	it('placeholder', () => {
		const actual = FormField('Placeholder // Label', undefined, 'group', 'name');

		expect(actual).toEqual(['label', {
			for: 'group.name',
		}, 'Label',
			['input', { type: 'text', id: 'group.name', placeholder: 'Placeholder' }],
		]);
	});

	it('placeholder and required', () => {
		const actual = FormField('Placeholder *// Label', undefined, 'group', 'name');

		expect(actual).toEqual(['label', {
			for: 'group.name',
		}, 'Label',
			['input', { type: 'text', id: 'group.name', placeholder: 'Placeholder', required: true }],
		]);
	});

	describe('number', () => {
		it('basic', () => {
			const actual = FormField('/.. Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'number', id: 'group.name' }],
			]);
		});

		it('max shorthand', () => {
			const actual = FormField('/4 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'number', id: 'group.name', max: '4' }],
			]);
		});

		it('max', () => {
			const actual = FormField('/..4 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'number', id: 'group.name', max: '4' }],
			]);
		});

		it('min', () => {
			const actual = FormField('/0.. Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'number', id: 'group.name', min: '0' }],
			]);
		});

		it('step', () => {
			const actual = FormField('/..2.. Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'number', id: 'group.name', step: '2' }],
			]);
		});

		it('min and max', () => {
			const actual = FormField('/0..4 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'number', id: 'group.name', min: '0', max: '4' }],
			]);
		});

		it('min and step', () => {
			const actual = FormField('/0..2.. Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'number', id: 'group.name', min: '0', step: '2' }],
			]);
		});

		it('step and max', () => {
			const actual = FormField('/..2..4 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'number', id: 'group.name', step: '2', max: '4' }],
			]);
		});

		it('min, step, and max', () => {
			const actual = FormField('/0..2..4 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'number', id: 'group.name', min: '0', step: '2', max: '4' }],
			]);
		});

		it('datetime-local', () => {
			const actual = FormField('/2000-01-01T12:00..7..2020-01-01T12:00 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'datetime-local', id: 'group.name', min: '2000-01-01T12:00', step: '7', max: '2020-01-01T12:00' }],
			]);
		});

		it('datetime-local add min time', () => {
			const actual = FormField('/2000-01-01..7..2020-01-01T12:00 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'datetime-local', id: 'group.name', min: '2000-01-01T00:00', step: '7', max: '2020-01-01T12:00' }],
			]);
		});

		it('datetime-local add min date and time', () => {
			const actual = FormField('/2000..7..2020-01-01T12:00 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'datetime-local', id: 'group.name', min: '2000-01-01T00:00', step: '7', max: '2020-01-01T12:00' }],
			]);
		});

		it('datetime-local add max time', () => {
			const actual = FormField('/2000-01-01T12:00..7..2020-01-01 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'datetime-local', id: 'group.name', min: '2000-01-01T12:00', step: '7', max: '2020-01-01T00:00' }],
			]);
		});

		it('datetime-local add max date and time', () => {
			const actual = FormField('/2000-01-01T12:00..7..2020 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'datetime-local', id: 'group.name', min: '2000-01-01T12:00', step: '7', max: '2020-01-01T00:00' }],
			]);
		});

		it('date', () => {
			const actual = FormField('/2000-01-01..7..2020-01-01 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'date', id: 'group.name', min: '2000-01-01', step: '7', max: '2020-01-01' }],
			]);
		});

		it('populated', () => {
			const actual = FormField('/.. Label', 123, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'number', id: 'group.name', value: '123' }],
			]);
		});
	});

	describe('text', () => {
		it('basic', () => {
			const actual = FormField('// Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'text', id: 'group.name' }],
			]);
		});

		it('pattern', () => {
			const actual = FormField('/\\w*/ Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'text', id: 'group.name', pattern: '\\w*' }],
			]);
		});

		it('maxlength shorthand', () => {
			const actual = FormField('//4 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'text', id: 'group.name', maxlength: '4' }],
			]);
		});

		it('maxlength', () => {
			const actual = FormField('//..4 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'text', id: 'group.name', maxlength: '4' }],
			]);
		});

		it('minlength', () => {
			const actual = FormField('//0.. Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'text', id: 'group.name', minlength: '0' }],
			]);
		});

		it('minlength and maxlength', () => {
			const actual = FormField('//0..4 Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'text', id: 'group.name', minlength: '0', maxlength: '4' }],
			]);
		});

		it('populated', () => {
			const actual = FormField('// Label', 'abc', 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['input', { type: 'text', id: 'group.name', value: 'abc' }],
			]);
		});

		it('textarea unpopulated', () => {
			const actual = FormField('textarea// Label', undefined, 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['textarea', { id: 'group.name' }],
			]);
		});

		it('textarea populated', () => {
			const actual = FormField('textarea// Label', 'abc', 'group', 'name');

			expect(actual).toEqual(['label', {
				for: 'group.name',
			}, 'Label',
				['textarea', { id: 'group.name' }, 'abc'],
			]);
		});
	});

	describe('object', () => {
		it('object unpopulated', () => {
			const layout = FormField({
				'': 'Label',
				number: '/.. Number',
				text: '// Text',
			}, undefined, 'group');

			expect(layout).toEqual([
				expect.any(Function),
				{
					schema: {
						number: '/.. Number',
						text: '// Text',
					},
					data: undefined,
					path: '',
					names: ['group'],
				},
				['label', {
					for: 'group',
				}, 'Label',
					['input', { type: 'text', id: 'group' }],
				]
			]);

			const state = { expanded: false };
			memos = [state];
			const [callback, props, ...children] = layout;
			let actual = callback(props, ...children);

			expect(actual).toEqual(['label', {
				for: 'group',
			}, 'Label',
				['input', { type: 'text', id: 'group' }],
				['button', { type: 'button', onclick: expect.any(Function) }, 'Create'],
			]);

			actual[4][1].onclick();
			memos = [state];
			actual = callback(props, ...children);

			expect(actual).toEqual(['label', {
				for: 'group',
			}, 'Label',
				['input', { type: 'text', id: 'group' }],
				['ul', null,
					['li', null,
						['label', {
							for: 'group.number',
						}, 'Number',
							['input', { type: 'number', id: 'group.number' }, ],
						],
					],
					['li', null,
						['label', {
							for: 'group.text',
						}, 'Text',
							['input', { type: 'text', id: 'group.text' }, ],
						],
					],
				],
			]);
		});

		it('object populated', () => {
			const layout = FormField({
				'': 'Label',
				number: '/.. Number',
				text: '// Text',
			}, {
				number: 123,
				text: 'abc',
			}, 'group');

			const state = { expanded: true };
			memos = [state];
			const [callback, props, ...children] = layout;
			const actual = callback(props, ...children);

			expect(actual).toEqual(['label', {
				for: 'group',
			}, 'Label',
				['input', { type: 'text', id: 'group' }],
				['ul', null,
					['li', null,
						['label', {
							for: 'group.number',
						}, 'Number',
							['input', { type: 'number', id: 'group.number', value: '123' }, ],
						],
					],
					['li', null,
						['label', {
							for: 'group.text',
						}, 'Text',
							['input', { type: 'text', id: 'group.text', value: 'abc' }, ],
						],
					],
				],
			]);
		});

		it('blank reference', () => {
			schemaMock = {
				number: '/.. Number',
				text: '// Text',
			};

			const layout = FormField({
				'': '/path// Label',
			}, {
				number: 123,
				text: 'abc',
			}, 'group');
			
			expect(layout).toEqual([
				expect.any(Function),
				{
					schema: {},
					data: {
						number: 123,
						text: 'abc',
					},
					path: 'path',
					names: ['group'],
				},
				['label', {
					for: 'group',
				}, 'Label',
					['input', { type: 'text', id: 'group' }],
				]
			]);

			const state = { expanded: true };
			memos = [state];
			const [callback, props, ...children] = layout;
			const actual = callback(props, ...children);

			expect(actual).toEqual(['label', {
				for: 'group',
			}, 'Label',
				['input', { type: 'text', id: 'group' }],
				['ul', null,
					['li', null,
						['label', {
							for: 'group.number',
						}, 'Number',
							['input', { type: 'number', id: 'group.number', value: '123' }, ],
						],
					],
					['li', null,
						['label', {
							for: 'group.text',
						}, 'Text',
							['input', { type: 'text', id: 'group.text', value: 'abc' }, ],
						],
					],
				],
			]);
		});

		it('shorthand reference', () => {
			schemaMock = {
				number: '/.. Number',
				text: '// Text',
			};

			const layout = FormField('/path// Label', {
				number: 123,
				text: 'abc',
			}, 'group');

			const state = { expanded: true };
			memos = [state];
			const [callback, props, ...children] = layout;
			const actual = callback(props, ...children);

			expect(actual).toEqual(['label', {
				for: 'group',
			}, 'Label',
				['input', { type: 'text', id: 'group' }],
				['ul', null,
					['li', null,
						['label', {
							for: 'group.number',
						}, 'Number',
							['input', { type: 'number', id: 'group.number', value: '123' }, ],
						],
					],
					['li', null,
						['label', {
							for: 'group.text',
						}, 'Text',
							['input', { type: 'text', id: 'group.text', value: 'abc' }, ],
						],
					],
				],
			]);
		});

		it('extended reference', () => {
			schemaMock = {
				number: '/.. Number',
				text: '// Text',
			};

			const layout = FormField({
				'': '/path// Label',
				boolean: '/ Boolean',
			}, {
				number: 123,
				text: 'abc',
				boolean: true,
			}, 'group');

			const state = { expanded: true };
			memos = [state];
			const [callback, props, ...children] = layout;
			const actual = callback(props, ...children);

			expect(actual).toEqual(['label', {
				for: 'group',
			}, 'Label',
				['input', { type: 'text', id: 'group' }],
				['ul', null,
					['li', null,
						['label', {
							for: 'group.number',
						}, 'Number',
							['input', { type: 'number', id: 'group.number', value: '123' }, ],
						],
					],
					['li', null,
						['label', {
							for: 'group.text',
						}, 'Text',
							['input', { type: 'text', id: 'group.text', value: 'abc' }, ],
						],
					],
					['li', null,
						['label', {
							for: 'group.boolean',
						},
							['input', { type: 'checkbox', id: 'group.boolean', checked: true }, ],
							'Boolean',
						],
					],
				],
			]);
		});

		it('extended reference', () => {
			schemaMock = {
				number: '/.. Number',
				text: '// Text',
			};

			dataMock = {
				number: 123,
				text: 'abc',
			};

			const layout = FormField({
				'': '/path// Label',
				boolean: '/ Boolean',
			}, {
				'': '/path/file',
				boolean: true,
			}, 'group');

			const state = { expanded: true };
			memos = [state];
			const [callback, props, ...children] = layout;
			const actual = callback(props, ...children);

			expect(actual).toEqual(['label', {
				for: 'group',
			}, 'Label',
				['input', { type: 'text', id: 'group' }],
				['ul', null,
					['li', null,
						['label', {
							for: 'group.number',
						}, 'Number',
							['input', { type: 'number', id: 'group.number', value: '123' }, ],
						],
					],
					['li', null,
						['label', {
							for: 'group.text',
						}, 'Text',
							['input', { type: 'text', id: 'group.text', value: 'abc' }, ],
						],
					],
					['li', null,
						['label', {
							for: 'group.boolean',
						},
							['input', { type: 'checkbox', id: 'group.boolean', checked: true }, ],
							'Boolean',
						],
					],
				],
			]);
		});
	});

	// { '': 'Label', ... }: custom object
	// { '': '// Label', ... }: import/override root data (add textarea for fully custom JSON)
	// { '': '/.. Label', ... }: import/override root data
	// { '': '/path// Label', ... }: extend schema

	// ['Label', ...]: multi select, but only one of each (checkboxes to show/hide values)
	// ['/ Label', ...]: select one
	// ['// Label', ...]: store in object under custom keys that match pattern
	// ['/.. Label', ...]: array
	
	// { '': '/ Label', ... }: not really supported (no path allowed, no slash already supports custom object)
	// ['/path// Label', ...]: not really supported

	describe.skip('array', () => {
		it('unpopulated', () => {
			const actual = FormField(['/.. Label',
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
			const actual = FormField(['/ Label',
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
			const actual = FormField(['/ Label',
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
			const actual = FormField(['Label',
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
			const actual = FormField(['Label',
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
			const actual = FormField(['Label',
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
			const actual = FormField(['Label',
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
			const actual = FormField(['Label',
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
			const actual = FormField(['Label',
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
			const actual = FormField(['Label',
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
			const actual = FormField(['// Label',
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
			const actual = FormField(['// Label',
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
			const actual = FormField(['// Label',
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
			const actual = FormField(['// Label',
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
