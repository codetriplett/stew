import { fetchCode, fetchList } from './fetch';

function convertValue (type, value, checked) {
	switch (type) {
		case 'checkbox': {
			return checked;
		}
		case 'number':
		case 'range': {
			return Number(value);
		}
	}

	return value;
}

export function extractData (form) {
	const data = {};

	if (!form.checkValidity()) {
		form.reportValidity();
		return;
	}

	for (const input of form.elements) {
		const { type, id, value, checked } = input;

		if (!id) {
			continue;
		}

		const names = id.split(/\.|(?=\[)/).map(name => name[0] === '[' ? Number(name.slice(1, -1)) : name);
		const finalName = names.pop();
		const castValue = convertValue(type, value, checked);
	
		if (!castValue) {
			continue;
		}

		const object = names.reduce((object, name, i) => {
			if (object[name]) {
				return object[name];
			}

			const nextName = names[i + 1] ?? finalName;
			const newObject = typeof nextName === 'number' ? [] : {};
			object[name] = newObject;
			return newObject;
		}, data);

		object[finalName] = castValue;
	}

	return data;
}

function parseTypes (value) {
	switch (typeof value) {
		case 'boolean': {
			return ['checkbox'];
		}
		case 'number': {
			return ['number', 'range']
		}
		case 'string': {
			if (/^\d+-\d\d-\d\dT\d\d:\d\d$/.test(value)) {
				return ['datetime-local'];
			} else if (/^\d+-\d\d-\d\d$/.test(value)) {
				return ['date'];
			}

			break;
		}
	}

	return [];
}

// TODO: simplify how it detects which array item to use
// - only differentiate between boolean/number/text and objects by their '' path
// - find first one that fits, and don't bother with pattern, min, max etc
// - have array search recursively, and us it if it returns a match within itself
// - separate definition parsing code so we don't need generate label/input layout just to find the type
// - only path, pattern, and range are neeeded (e.g. path -> object (then check url), else pattern -> text, else range -> number, else checkbox (or static if required flag is present))
export function findOption (value, ...options) {
	if (value === undefined) {
		return -1;
	} else if (Array.isArray(value)) {
		// look for first array it finds
		// - too complicated to test each value of each one to find the best match
		return;
	}

	let path;

	if (typeof value === 'object') {
		// TODO: also load schema of matched component and fill in overrides
		const { '': url, ...overrides } = value;

		if (url === undefined) {
			// look for first object it finds without an id (otherwise first one with id)
			// - too complicated to test each property of each one to find the best match
			return;
		} else if (url[0] !== '/') {
			// look for first object it finds that matches the id (otherwise first one without an id)
			return;
		}

		const lastSlashIndex = url.lastIndexOf('/');
		path = url.slice(0, lastSlashIndex + 1);
		value = url.slice(lastSlashIndex);
	}

	const types = parseTypes(value);

	const filteredOptions = options.filter(option => {
		const [tagName, { type, dataset }] = option;
		return (types.indexOf(type) !== -1 || type === 'text' || tagName === 'textarea') && dataset?.path === path;
	});

	// TODO: find first one that matches the min/max or pattern requirements (otherwise choose the first one)

	const option = filteredOptions[0];
	return options.indexOf(option);
}

function BooleanSelect ({ label, placeholder, value, inputs }, ...options) {
	const state = stew(() => {
		return stew({ index: findOption(value, ...inputs) });
	}, []);

	const { index } = state;

	for (const [i, option] of options.entries()) {
		option[1].selected = i === index;
	}

	return ['label', {},
		label,
		['select', {
			onchange: event => {
				state.index = event.target.selectedIndex - 1;
			}
		},
			['option', {
				selected: index === -1,
			}, placeholder || 'Select item...'],
			...options,
		],
		inputs[index],
	];
}

function RangeSelect ({ label, placeholder, value, inputs, rest, names }, ...options) {
	const state = stew(() => {
		const array = Array.isArray(value) ? value : [];
		const optionIndexes = array.map(value => findOption(value, ...inputs));
		return stew({ optionIndexes, array });
	}, []);

	const { optionIndexes, array } = state;

	return ['label', {},
		label,
		['ol', {},
			...array.map((value, i) => {
				const index = optionIndexes[i];
				return index === -1 ? null : ['li', {}, Field(rest[index], value, ...names, i)];
			}),
		],
		['select', {
			onchange: event => {
				const index = event.target.selectedIndex - 1;
				state.optionIndexes = [...optionIndexes, index];
				state.array = [...array, undefined];
				event.target.selectedIndex = 0;
			}
		},
			['option', {
				selected: true,
			}, placeholder || 'Add item...'],
			...options,
		],
	];
}

function ValueSelect ({ types, value }, field, ...options) {
	const index = types.indexOf(typeof value);

	// TODO: add button as shortcut for selecting the first option if there is only one
	return [...field.slice(0, -1), ['select', {
		onchange: () => {
			console.log('=======');
		},
	},
		['option', null, field[1].placeholder || 'Select an item...'],
		...fields.map((field, i) => ['option', { selected: i === index }, field[2]]),
	]];
}

function ArraySelect () {
	return;
}

function ObjectSelect () {
	return;
}

export function FormSelect (definition, value, ...names) {
	const fields = stew(() => {
		return definition.map(definition => Field(definition, undefined, ...names));
	}, [definition]);

	const [type, ...types] = stew(() => {
		return fields.map(field => {
			const [tagName, { type }] = field[field.length - 1];

			if (tagName === FormSelect) {
				return;
			} else if (tagName === ObjectField) {
				return 'object';
			} else if (type === 'checkbox' || type === 'hidden') {
				return 'boolean'
			}

			return type === 'number' || type === 'range' ? 'number' : 'string';
		});
	}, [fields]);

	switch (type) {
		case 'boolean': {
			return [ValueSelect, { types, value }, ...fields];
		}
		case 'number': {
			const array = Array.isArray(value) ? value : [];
			return [ArraySelect, { types, array }, ...fields];
		}
		case 'string': {
			const object = typeof value === 'object' && !Array.isArray(value) ? value : {};
			return [ObjectSelect, { types, object }, ...fields];
		}
	}

	// return [...field.slice(0, -1), fields.length !== 1
	// 	? ['select', {
	// 		onchange: () => {
	// 			console.log('=======');
	// 		},
	// 	},
	// 		['option', null, field[1].placeholder || 'Select an item...'],
	// 		...fields.map(field => ['option', null, field[2]]),
	// 	]
	// 	: (!isSingle || !array[0]) && ['button', {
	// 		type: 'button',
	// 		onclick: () => {
	// 			console.log('=======');
	// 		},
	// 	}, 'Add'],
	// ];


	// when field input type is...
	// checkbox: select one (choosing one will add or replace the existing fields)
	// number, range: select any (choosing one will add a new item, also needs delete button)
	// else: store in object under custom keys that match pattern

	// simplify how value items are tied to options available
	// boolean: checkbox
	// number: number, range
	// text: otherwise
	// object: use '' prop





	// const inputs = [];

	// if (!field?.length) {
	// 	return [];
	// }

	// // just parse definitions here
	// const options = rest.map(definition => {
	// 	let label = Field(definition, undefined, ...names);
		
	// 	if (typeof label[0] === 'function') {
	// 		label = label[2];
	// 	}

	// 	const input = label.find(child => child[0] === 'input');
	// 	inputs.push(input);
	// 	return ['option', {}, label[2]];
	// });

	// const label = field[2];
	// const [input] = field.splice(3, 1);
	// const { type, placeholder } = input[1];
	// const selectProps = {};
	// const select = ['select', selectProps, ...options];
	// delete field[1].for;

	// switch (type) {
	// 	case 'checkbox': {
	// 		return [BooleanSelect, { label, placeholder, value, inputs }, ...options];
	// 	}
	// 	case 'number':
	// 	case 'range': {
	// 		return [RangeSelect, { label, placeholder, value, inputs, rest, names }, ...options];
	// 	}
	// }

	// // TODO: create PropertySelect impulse for this
	// const object = typeof value === 'object' && !Array.isArray(value) ? value : {};
	// const list = ['ul', {}];
	// const option = ['option', {}, placeholder || 'Add property...'];
	// select.splice(2, 0, option);
	// delete input[1].id;
	// delete input[1].placeholder;
	// field[1] = {};
			
	// selectProps.onchange = ({ selectedIndex }) => {
	// 	const name = input[1].value;
	// 	const newInput = inputs[selectedIndex - 1];
	// 	select[2][1].selected = true;

	// 	if (!name || !newInput) {
	// 		return;
	// 	}

	// 	delete input[1].value;
	// 	const clonedInput = [...newInput];
	// 	clonedInput[1] = { ...clonedInput[1] };
	// 	clonedInput[1].id += `.${name}`;
	// 	const label = ['label', { for: clonedInput[1].id }, name];
	// 	list.push(['li', {}, label, clonedInput]);
	// };

	// for (const [name, value] of Object.entries(object)) {
	// 	const index = findOption(value, ...inputs);
	// 	const item = ['li', {}];

	// 	if (index === -1) {
	// 		item[2] = 'Invalid Item';
	// 	} else {
	// 		const field = Field(rest[index], value, ...names, name);
	// 		const [input] = field.splice(2, 1);

	// 		field[2] = name;
	// 		item[2] = field;
	// 		item[3] = input;
	// 	}

	// 	list.push(item);
	// }

	// field.push(list, input, select);
	// return field;
}

// read schema from MJS at path and fill in its form fields
// choosing an existing file is optional, and it will fill in values that can be overwritten
// stored as { '': '/folder/file', ...overrides } if file is chosen to override or { '': '/folder/', ...props } if not

// TODO: maybe render this as select
// - there is already code that finds child files. make that a util function
// - filter that list by pattern here, or range
// - don't need to set dataset here or any onclicks, just values on the option elements for the full path
// - cleanup form extract code to not look for dataset or ids that start with '.'
// props.dataset = { path: `/${path}/` };
// set selected on option that matches value param
// create a hidden form that holds current input and set each filename as value and validate to see if it should be included

function merge (base, change) {
	if (
		!base || typeof base !== 'object' || Array.isArray(base) ||
		!change || typeof change !== 'object' || Array.isArray(change)
	) {
		return change;
	}

	for (const [name, value] of Object.entries(change)) {
		base[name] = merge(base[name], value);
	}

	return base;
}

let form, input;

if (typeof document === 'object') {
	form = document.createElement('form');
	input = document.createElement('input');
	form.appendChild(input);
}

// the idea here is that objects can extend existing schemas (if path is provided), or create their own embedded in current one
// - even if another schema is referenced, choosing an existing file is optional. It can be created fresh from overrides within data as well
// - '' prop on stored data indicates the schema it is tied to, and optionally what existing data it overwrites (if not ending in '/')
// - the path to the schema is used not only for the form, but can also be used to import the code to render the component (file.default[0])
function ObjectField ({ schema = {}, data = {}, names }, field) {
	field = [...field];
	const inputProps = field.pop()[1];
	const complex = path && names.length > 0;

	const state = stew({
		expanded: Object.keys(data).filter(key => key).length > 0,
		selection: data?.['']?.split?.('/')?.pop?.() || '',
	}, []);

	const { expanded, selection } = state;
	let select;
	
	// TODO: load baseData from data[''] to use as placeholders in form
	// - don't set as value prop, since that would add a copy of each to the data saved here
	// - only overrides should be stored here

	if (complex) {
		const base = stew(fetchCode, [path], null);
		const list = stew(fetchList, [path], null);

		if (!base || !list) {
			return;
		}
		
		const { '': meta, ...baseSchema } = base?.default?.[1] || {};

		[schema, select] = stew(() => [
			merge(baseSchema, schema),
			['', null, ['select', {
				onchange: event => state.selection = event.target.value,
			},
				['option', { value: '' }, inputProps.placeholder || 'Select an item...'],
				...list.filter(value => {
					Object.assign(input, { value }, inputProps);
					return form.checkValidity();
				}).map(value => {
					return ['option', { value }, value];
				})
			]],
		], [path]);

		stew(null, [selection], () => {
			const [ref] = select[0];

			if (selection) {
				ref.value = selection;
			} else {
				ref.selectedIndex = 0;
			}
		});
	}
	
	const list = ['ul', null];
	
	if (selection) {
		const field = Field('//', `/${path}/${selection}`, ...names, '');
		field[1].type = 'hidden';
		console.log(field);
		list.push(['li', null, field]);
	}

	for (const [name, value] of Object.entries(expanded ? schema : {})) {
		list.push(['li', null, Field(value, data[name], ...names, name)]);

		if (!name) {
			console.log(list[list.length - 1]);
		}
	}

	return !names.length ? list : [
		...field,
		!expanded && ['button', {
			type: 'button',
			style: { float: 'right', marginTop: '-21px' },
			onclick: () => state.expanded = true,
		}, selection ? 'Override' : 'Create'],
		select,
		list,
	];
}

export function Field (definition, data, ...names) {
	let schema;

	if (Array.isArray(definition)) {
		return FormSelect(definition, data, ...names);
	} else if (typeof definition === 'object') {
		({ '': definition = names[names.length - 1] || '', ...schema } = definition);
	}

	if (typeof definition !== 'string') {
		return;
	}

	const id = names.reduce((id, name) => `${id}${typeof name === 'number' ? `[${name}]` : `${id ? '.' : ''}${name}`}`, '');
	const match = definition.match(/^\s*(?:(.+)\s+)?(.*?)\/(.*?\/)?((?:\\\/|[^\s\/])*?)(?:\s+(.+?))?\s*$/);
	let [, placeholder, type, slashes = '', range = '', label] = match || [,,,,, definition.trim()];
	let [, min = '', step, max = '', required] = range.match(/^(?:(.*?)\.\.)?(?:(.*?)\.\.)?(.*?)(\**)$/);
	const props = id ? { id } : {};
	const input = ['input', props];
	const field = ['label', id ? { for: id } : null, names[names.length - 1], input];
	let path;

	if (label) {
		field[2] = label;
	}

	if (slashes) {
		const [, prefix, pattern] = slashes.match(/^(.*?)(?:((?:\\\/|[^\s\/])*?)\/)?$/);
		path = prefix.slice(0, -1);
		type ||= 'text';
		
		if (pattern) {
			props.pattern = pattern;
		}

		if (min) {
			props.minlength = min;
		}
		
		if (max) {
			props.maxlength = max;
		}
	} else if (range) {
		const [, minDate, minTime] = min.match(/^(?:(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2})?|.*)$/);
		const [, maxDate, maxTime] = max.match(/^(?:(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2})?|.*)$/);
		type ||= minTime || maxTime ? 'datetime-local' : minDate || maxDate ? 'date' : 'number';

		if (min) {
			if (type !== 'number' && !minDate) {
				min += '-01-01';
			}
			
			if (type === 'datetime-local' && !minTime) {
				min += 'T00:00';
			}

			props.min = min;
		}

		if (max) {
			if (type !== 'number' && !maxDate) {
				max += '-01-01';
			}
			
			if (type === 'datetime-local' && !maxTime) {
				max += 'T00:00';
			}

			props.max = max;
		}

		if (step && step !== '1') {
			props.step = step;
		}
	} else if (!match) {
		type = 'checkbox';
	} else {
		type = 'hidden';
		props.value = placeholder || '';
		placeholder = '';
	}

	if (type === 'textarea') {
		input[0] = 'textarea';
	} else {
		props.type = type;
	}

	if (placeholder) {
		props.placeholder = placeholder;
	}

	if (required) {
		props.required = true;
	}

	if (path || schema) {
		return [ObjectField, { schema, data, path, names }, field];
	}

	if ((data || data === 0) && typeof data !== 'object') {
		if (type === 'textarea') {
			input[2] = String(data);
		} else if (type === 'checkbox') {
			props.checked = true;
		} else {
			props.value = String(data);
		}
	}

	return id.endsWith('.') ? input : field;
}
