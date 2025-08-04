import { fetchData, fetchCode } from './fetch';

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

// TODO: work out way to allow neseted option/array/object definitions
// - for now, only simple inputs are allowed
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
				return index === -1 ? null : ['li', {}, FormField(rest[index], value, undefined, ...names, i)];
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

function FormSelect (definition, value, ...names) {
	const [first, ...rest] = definition;
	const field = FormField(first, undefined, undefined, ...names);
	const inputs = [];

	if (!field?.length) {
		return [];
	}

	const options = rest.map(definition => {
		const label = FormField(definition, undefined, undefined, ...names);
		const input = label.find(child => child[0] === 'input');
		inputs.push(input);
		return ['option', {}, label[2]];
	});

	const label = field[2];
	const [input] = field.splice(3, 1);
	const { type, placeholder } = input[1];
	const selectProps = {};
	const select = ['select', selectProps, ...options];
	delete field[1].for;

	switch (type) {
		case 'checkbox': {
			return [BooleanSelect, { label, placeholder, value, inputs }, ...options];
		}
		case 'number':
		case 'range': {
			return [RangeSelect, { label, placeholder, value, inputs, rest, names }, ...options];
		}
	}

	// TODO: create PropertySelect impulse for this
	const object = typeof value === 'object' && !Array.isArray(value) ? value : {};
	const list = ['ul', {}];
	const option = ['option', {}, placeholder || 'Add property...'];
	select.splice(2, 0, option);
	delete input[1].id;
	delete input[1].placeholder;
	field[1] = {};
			
	selectProps.onchange = ({ selectedIndex }) => {
		const name = input[1].value;
		const newInput = inputs[selectedIndex - 1];
		select[2][1].selected = true;

		if (!name || !newInput) {
			return;
		}

		delete input[1].value;
		const clonedInput = [...newInput];
		clonedInput[1] = { ...clonedInput[1] };
		clonedInput[1].id += `.${name}`;
		const label = ['label', { for: clonedInput[1].id }, name];
		list.push(['li', {}, label, clonedInput]);
	};

	for (const [name, value] of Object.entries(object)) {
		const index = findOption(value, ...inputs);
		const item = ['li', {}];

		if (index === -1) {
			item[2] = 'Invalid Item';
		} else {
			const field = FormField(rest[index], value, undefined, ...names, name);
			const [input] = field.splice(2, 1);

			field[2] = name;
			item[2] = field;
			item[3] = input;
		}

		list.push(item);
	}

	field.push(list, input, select);
	return field;
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
		!base || typeof base !== 'object' || Array.isArray(object) ||
		!change || typeof change !== 'object' || Array.isArray(object)
	) {
		return change;
	}

	for (const [name, value] of Object.entries(change)) {
		base[name] = merge(base[name], value);
	}
}

function ObjectField ({ schema = {}, data = {}, path }, field) {
	const filepath = data?.[''] || '';
	const baseSchema = !path ? {} : stew(fetchCode, [path], [], null);
	const baseData = !/^\/.*[^\/]$/.test(dataPath) ? {} : stew(fetchData, [filepath], null);

	if (!baseData || !baseSchema) {
		return;
	}

	merge(baseSchema, schema);
	merge(baseData, data);
	console.log(baseSchema, baseData);

	return;
}

export function FormField (definition, data, schema, ...names) {
	if (Array.isArray(definition)) {
		return FormSelect(definition, data, ...names);
	} else if (typeof definition === 'object') {
		const { '': name = names[names.length - 1], ...props } = definition;
		const object = typeof data === 'object' && !Array.isArray(data) ? data : {};
		const list = ['ul', {}];

		for (const [name, value] of Object.entries(props)) {
			list.push(FormField(value, object[name], undefined, ...names, name));
		}

		return names.length ? ['label', {}, name, list] : list;
	} else if (typeof definition !== 'string') {
		return;
	}

	const match = definition.match(/^\s*(?:(.+)\s+)?(\**)(.*?)\/(?:(.+?)\/)?(?:((?:\\\/|[^\s\/])*?)\/)?((?:\\\/|[^\s\/])*?)(?:\s+(.+?))?\s*$/);
	let [, placeholder, required, type, path, pattern, range = '', text] = match || [,,,,,,, definition.trim()];
	let [, min = '', step, max = ''] = range.match(/^(?:(.*?)\.\.)?(?:(.*?)\.\.)?(.*?)$/);
	const id = names.reduce((id, name) => `${id}${typeof name === 'number' ? `[${name}]` : `${id ? '.' : ''}${name}`}`, '');
	const props = { id };
	const input = ['input', props];
	const label = ['label', { for: id }, text || names[names.length - 1], input];
	
	if (pattern !== undefined) {
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
		type = minTime || maxTime ? 'datetime-local' : minDate || maxDate ? 'date' : 'number';

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
		// TODO: maybe have this be a textarea that accepts any JSON
		// - use JSON.parse() when validating to make sure it is actually an object if there is content
		// - have it parse out the asterisk to set it as required or not
		return;
	} else if (placeholder) {
		type = 'hidden';
		props.value = placeholder;
		placeholder = '';
	} else {
		type = 'checkbox';
	}

	if (type === 'textarea') {
		input[0] = 'textarea';
	} else {
		props.type = type;

		if (type === 'checkbox') {
			label.splice(2, 0, label.pop());
		}
	}

	if (placeholder) {
		props.placeholder = placeholder;
	}

	if (required) {
		props.required = true;
	}

	if (path || schema) {
		return [ObjectField, { schema, data, path }, label];
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

	return label;
}
