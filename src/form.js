import { fetchCode, fetchData, fetchList } from './fetch';

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
		const { tagName, type, id, value, checked } = input;

		if (!id) {
			continue;
		} else if (tagName.toLowerCase() === 'textarea') {
			// TODO: use these to check which array items are still valid and in what order to store them
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

export function findOption (value, ...options) {
	return options.findIndex(([type]) => {
		if (typeof value !== 'object') {
			return typeof value === type;
		}

		const path = value?.[''] || '';
		return path.startsWith(type) && path.lastIndexOf('/') < type.length;
	});
}

function ValueSelect ({ options, names, value }, select) {
	const valueType = typeof value;
	const state = stew({ index: options.findIndex(([type]) => type === valueType) }, [valueType]);
	const { index } = state;
	select[3][1].onchange = event => state.index = event.target.selectedIndex;

	// TODO: add button as shortcut for selecting the first option if there is only one
	return ['', null,
		select,
		index > -1 && Field(options[index][2], value, ...names),
	];
}

function ArraySelect ({ options, names, array }, select) {
	const initialIndexes = stew(() => {
		return array.map(value => findOption(value, ...options));
	}, [array]);

	const state = stew({ indexes: initialIndexes, order: [] }, [array]);
	const { indexes, order } = state;
	const meta = Field('textarea//', '', ...names, '');

	select[3][1].onchange = event => {
		const index = event.target.selectedIndex - 1;

		if (index > -1) {
			state.indexes = [...indexes, index];
			event.target.selectedIndex = 0;
		}
	};

	meta[1].onselectionchange = () => {
		// TODO: show only the rows that are highlighted

		// TODO: have extract data look here first to determine which rows still exist and to refresh the order
		// - set ids based on insertion order, ignoring the order they are in textarea until it's saved

		console.log(event.target);
	};

	meta[2] = indexes.map((index, i) => {
		if (index < 0) {
			return;
		}

		const [type, label,, placeholder = ''] = options[index];
		const value = array[i];
		return `${i}: ${type && type[0] !== '/' ? value : value[placeholder] || type || label || 'Object'}`;
	}).filter(value => value).join('\n');

	// TODO: add button as shortcut for selecting the first option if there is only one
	return ['', null,
		select,
		meta,
		['ol', null,
			...indexes.map((index, i) => {
				if (index < 0) {
					return;
				}
				
				const definition = options[index][2];
				const props = order.indexOf(i) !== -1 ? null : { style: { display: 'none' } };
				return ['li', props, Field(definition, array[i], ...names, i)];
			}),
		],
	];
}

function ObjectSelect ({ options, names, object }, select, input) {
	const initialIndexes = stew(() => {
		return Object.entries(object)
			.map(([name, value]) => [name, findOption(value, ...options)])
			.filter(([, index]) => index > -1);
	}, [object]);

	const state = stew({ indexes: initialIndexes }, [object]);
	const { indexes } = state;

	select[3][1].onchange = event => {
		const index = event.target.selectedIndex - 1;

		if (index > -1) {
			state.indexes = [...state.indexes, index];
			event.target.value = '';
		}
	};

	// TODO: add button as shortcut for selecting the first option if there is only one
	return ['', null,
		select,
		input[3],
		['ul', null,
			...indexes.map(([name, index]) => {
				if (index < 0) {
					return;
				}

				const field = Field(options[index][2], object[name], ...names, name);
				field[2] = name;
				return ['li', null, field];
			}),
		],
	];
}

export function Select (definitions, value, ...names) {
	const [info, ...options] = stew(() => {
		return definitions.map((definition, i) => {
			let field = Field(definition, undefined, ...(i ? names : []));
			let path;

			if (field[0] !== 'label') {
				({ path } = field[1]);
				field = field[2];
			}

			const [,, label, input] = field;
			let { type, placeholder } = input[1];

			if (type === 'checkbox' || type === 'hidden') {
				type = 'boolean';
			} else if (type === 'number' || type === 'range') {
				type = 'number';
			} else {
				type = type ? 'string' : path ? `/${path}/` : '';
			}

			return [type, label, definition, placeholder];
		}).filter(option => option);
	}, [definitions]);

	const [type, label, definition, placeholder] = info;

	const select = ['label', null,
		label,
		['select', {},
			['option', null, placeholder || 'Select an item...'],
			...options.map(option => ['option', null, option[1]]),
		],
	];

	switch (type) {
		case 'boolean': {
			return [ValueSelect, { options, names, value }, select];
		}
		case 'number': {
			const array = !Array.isArray(value) ? [] : value;
			return [ArraySelect, { options, names, array }, select];
		}
		case 'string': {
			const object = typeof value !== 'object' || Array.isArray(value) ? {} : value;
			return [ObjectSelect, { options, names, object }, select, Field(definition)];
		}
	}
}

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

// the idea here is that objects can extend existing schemas (if path is provided), or create their own embedded in current one
// - even if another schema is referenced, choosing an existing file is optional. It can be created fresh from overrides within data as well
// - '' prop on stored data indicates the schema it is tied to, and optionally what existing data it overwrites (if not ending in '/')
// - the path to the schema is used not only for the form, but can also be used to import the code to render the component (file.default[0])
function ObjectField ({ schema = {}, data = {}, path, names }, field) {
	field = [...field];
	const inputProps = field.pop()[1];
	const complex = path && names.length > 0;

	const state = stew({
		expanded: !names.length || Object.keys(data).filter(key => key).length > 0,
		selection: data?.['']?.split?.('/')?.pop?.() || '',
	}, []);

	const { expanded, selection } = state;
	let existingData = {};
	let select;

	if (complex) {
		const base = stew(fetchCode, [path], null);
		const list = stew(fetchList, [path], null);
		existingData = stew(fetchData, [path], null);

		if (!base || !existingData || !list) {
			return;
		} else if (!form || !input) {
			form = globalThis.document.createElement('form');
			input = globalThis.document.createElement('input');
			form.appendChild(input);
		}

		const { '': meta, ...baseSchema } = base?.default?.[1] || {};

		[schema, select] = stew(() => [
			merge(baseSchema, schema),
			list.length > 0 && ['', null, ['select', {
				onchange: event => state.selection = event.target.value,
			},
				['option', { value: '' }, inputProps.placeholder || 'Select an item...'],
				...list.filter(value => {
					Object.assign(input, { value }, inputProps);
					return form?.checkValidity?.() ?? true;
				}).map(value => {
					return ['option', { value }, value];
				})
			]],
		], [path]);

		stew(null, [selection], () => {
			if (!select) {
				return;
			}

			const [ref] = select[0];

			if (selection) {
				ref.value = selection;
			} else {
				ref.selectedIndex = 0;
			}
		});
	}
	
	const list = ['ul', null];
	let meta;
	
	if (path) {
		meta = Field(`/${path}/${selection} /`, undefined, ...names, '');
	}

	for (const [name, value] of Object.entries(expanded ? schema : {})) {
		const existingValue = existingData[name];
		const item = ['li', null, Field(value, data[name], ...names, name)];
		list.push(item);

		if (existingValue) {
			item.push(['input', { value: existingValue, disabled: true }]);
		}
	}

	return !names.length ? list : ['', null, [
		...field,
		!expanded && ['button', {
			type: 'button',
			style: { float: 'right', marginTop: '-21px' },
			onclick: () => state.expanded = true,
		}, selection ? 'Override' : 'Create'],
		select,
	], meta, list];
}

// TODO: see if ...names can be replaced by parentId and name
// - then append name to parentId, in brackets if it's a number
export function Field (definition, data, ...names) {
	let schema;

	if (Array.isArray(definition)) {
		return Select(definition, data, ...names);
	} else if (typeof definition === 'object') {
		({ '': definition = names[names.length - 1] || '', ...schema } = definition);
	}

	if (typeof definition !== 'string') {
		return;
	}

	const id = names.reduce((id, name) => `${id}${typeof name === 'number' ? `[${name}]` : `${id ? '.' : ''}${name}`}`, '');
	const match = definition.match(/^\s*(?:(.+)\s+)?(.*?)\/(.*?\/)?((?:\\\/|[^\s\/])*?)(\**)(?:\s+(.+?))?\s*$/);
	let [, placeholder, type, slashes = '', range = '', required, label] = match || [,,,,,, definition.trim()];
	let [, min = '', step, max = ''] = range.match(/^(?:(.*?)\.\.)?(?:(.*?)\.\.)?(.*?)$/);
	const props = {};
	const input = ['input', props];
	const field = ['label', null, names[names.length - 1], input];
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
	} else if (placeholder) {
		props.value = placeholder;
		props.disabled = true;
		placeholder = '';
	} else {
		type ||= 'checkbox';
	}

	if (placeholder) {
		props.placeholder = placeholder;
	}

	if (required) {
		props.required = true;
	}

	if (path || schema) {
		return [ObjectField, { schema, data, path, names }, field];
	} else if (id) {
		props.id = id;
		field[1] = { for: id };
	}
	
	if (type === 'textarea') {
		input[0] = 'textarea';
	} else if (type) {
		props.type = type;
	}

	if ((data || data === 0) && typeof data !== 'object') {
		if (type === 'textarea') {
			input[2] = String(data);
		} else if (type === 'checkbox') {
			props.checked = true;
		} else {
			let value = String(data);

			if (type.startsWith('date')) {
				const [, date, time] = value.match(/^(?:(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2})?|.*)$/);

				if (!date) {
					value += '-01-01';
				}
				
				if (type === 'datetime-local' && !time) {
					value += 'T00:00';
				}
			}

			props.value = value;
		}
	}

	return id.endsWith('.') ? input : field;
}
