import { fetchCode, fetchList } from './fetch';
import { resizeTextarea } from './helpers';

function convertValue (type, value, checked) {
	if (!type) {
		if (value === 'true' || value === 'false') {
			type = 'checkbox';
			checked = value === 'true';
		} else if (value && !isNaN(value)) {
			type = 'number';
		}
	}

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
	if (!form.checkValidity()) {
		document.body.classList.add('show-left');
		form.reportValidity();
		return;
	}
	
	const metas = [];
	const data = {};

	for (const input of form.elements) {
		let { tagName, type, id, value, checked } = input;

		if (!id) {
			continue;
		}

		const names = id.split(/\.|(?=\[)/).map(name => name[0] === '[' ? Number(name.slice(1, -1)) : name);
		let finalName = names.pop();
		const isMeta = finalName === '';

		if (isMeta) {
			finalName = names.pop();
		} else {
			value = convertValue(type, value, checked);

			if (!value) {
				continue;
			}
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

		if (isMeta) {
			metas.unshift([object, finalName, value, tagName.toLowerCase()]);
		} else {
			object[finalName] = value;
		}
	}

	for (const [object, name, value, tagName] of metas) {
		const structure = object[name];

		if (tagName === 'input') {
			if (structure && Object.keys(structure).length || /[^\/]$/.test(value)) {
				object[name] = { '': value, ...structure };
			} else {
				delete object[name];
			}

			continue;
		} else if (!structure) {
			continue;
		}

		const lines = value.trim().split(/\s*[\r\n]+\s*/);
		const items = structure.splice(0);

		for (const line of lines) {
			const [, index] = line.match(/^\s*(\d+)\./) || [];
			const item = items[index - 1];

			if (index > 0 && item !== null) {
				structure.push(item);
			}
		}

		if (!structure.length) {
			delete object[name];
		}
	}

	return data;
}

export function findOption (value, ...options) {
	const valueType = typeof value;

	return options.findIndex(([type,,, placeholder]) => {
		if (valueType !== 'object') {
			return type ? valueType === type : value === placeholder;
		}

		const path = value?.[''] || '/';
		return path.startsWith(type) && path.lastIndexOf('/') < type.length;
	});
}

function attachListener (select, callback) {
	const [tagName, props] = select[3];

	if (tagName === 'select') {
		props.onchange = callback;
		return;
	}

	props.onclick = () => callback({ target: { selectedIndex: 1 } });
}

function ValueSelect ({ options, names, value }, select) {
	const state = stew({ index: findOption(value, ...options) }, [value]);
	const { index } = state;
	let field, ref;

	select[3][1].onchange = event => {
		state.index = event.target.selectedIndex - 1;
	};

	stew(null, [index, select], () => {
		const [label] = ref[0];
		const select = label.querySelector('select');
		select.selectedIndex = index + 1;
	});

	if (index > -1) {
		field = Field(options[index][2], value, ...names);
		field[2] = null;
	}

	return ref = ['', null, select, field];
}

function renderIdentifier (option, i, value) {
	let [type, label,, placeholder = ''] = option;

	if (!value) {
		value = type === 'string' ? '' : null;
	}

	if (type[0] === '/') {
		const name = value?.[''] ? value[''].trim().split(' ')[0].slice(type.length) : '';
		type = `${label && type.length === 1 ? `${label} ` : ''}${type}${name}`;
		value = type === '/' ? ` ${placeholder && value?.[placeholder] || ''}` : '';
	} else {
		type = !type || type === 'string' ? '// ' : '/';

		if (typeof value === 'object') {
			value = null;
		}
	}

	return `${i + 1}. ${type}${value}`;
}

function ArraySelect ({ options, names, array }, select) {
	const initialIndexes = stew(() => {
		return array.map(value => findOption(value, ...options));
	}, [array]);

	const state = stew({
		indexes: initialIndexes,
		before: '',
		between: '',
		after: '',
		start: 1,
		visibleIndexes: new Set(),
	}, [array]);

	const { indexes, start, visibleIndexes } = state;
	let ref;

	stew(null, [], () => {
		const [, textarea] = ref[0];
		resizeTextarea([[textarea]]);
	});

	const meta = stew(() => {
		const text = indexes.map((index, i) => {
			return index < 0 ? '' : renderIdentifier(options[index], i, array[i]);
		}).filter(value => value).join('\n');
		
		const field = Field('textarea//', '', ...names, '');
		field[2] = text;
		return field;
	}, [array]);

	attachListener(select, event => {
		const index = event.target.selectedIndex - 1;

		if (index === -1) {
			return;
		}

		const [, textarea] = ref[0];
		const option = options[index];
		const [type,,, placeholder] = option;
		const value = type ? null : placeholder;
		textarea.value += `\n${renderIdentifier(option, indexes.length, value)}`;
		state.indexes = [...indexes, index];
		event.target.selectedIndex = 0;
		resizeTextarea([[textarea]]);
	});

	Object.assign(meta[1], {
		onfocus: event => {
			const { before, between, after } = state;

			if (!between) {
				return;
			}

			const [,, list] = ref[0];
			const items = list.children;
			const lines = between.split(/[\r\n]+/);
			const lineIndexes = lines.map(line => Number(line.match(/^\s*0*(\d*)/)[1]));
			
			const newLines = lineIndexes.map((lineIndex, i) => {
				const arrayIndex = lineIndex - 1;
				const input = items[arrayIndex]?.querySelector?.('input');

				if (!input) {
					return lines[i];
				}

				const { id, value } = input;
				const index = indexes[arrayIndex];
				return renderIdentifier(options[index], arrayIndex, id.endsWith('.') ? { '': value } : value);
			});

			event.target.value = `${before}${newLines.join('\n')}${after}`;
		},
		onselectionchange: event => {
			let { value, selectionStart, selectionEnd } = event.target;

			if (selectionStart === selectionEnd) {
				Object.assign(state, { between: '', start: 1, visibleIndexes: new Set() });
				return;
			} else if (/[\r\n]/.test(value[selectionEnd - 1])) {
				selectionEnd -= 1;
			}

			const before = value.slice(0, selectionStart).replace(/[^\r\n]+$/, '');
			const after = value.slice(selectionEnd).replace(/^[^\r\n]+/, '');
			const between = value.slice(before.length, after ? -after.length : value.length).trim();

			if (between === state.between) {
				return;
			}

			const start = (before.match(/(^|\r|\n)\d+/g)?.length || 0) + 1;
			const lines = between.split(/[\r\n]+/);
			const visibleIndexes = new Set(lines.map(line => Number(line.match(/^\s*0*(\d*)/)[1])));
			Object.assign(state, { before, between, after, start, visibleIndexes });
		},
	});

	return ref = ['', null,
		select,
		meta,
		['ol', { start, className: start < 10 ? '' : 'extra-padding' },
			...indexes.map((index, i) => {
				if (index < 0) {
					return;
				}
				
				const definition = options[index][2];
				const props = visibleIndexes.has(i + 1) ? null : { style: { display: 'none' } };
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

	attachListener(select, event => {
		const index = event.target.selectedIndex - 1;

		if (index === -1) {
			return;
		}

		state.indexes = [...state.indexes, index];
		event.target.selectedIndex = 0;
	});

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
			const isObject = field[0] !== 'label';
			let path;

			if (isObject) {
				({ path } = field[1]);
				field = field[2];
			}

			const [,, label, input] = field;
			let { type = '', placeholder, disabled, value } = input[1];

			if (path) {
				type = `${path}/`;
			} else if (isObject) {
				type = '/';
				placeholder ||= value;
			} else if (disabled) {
				placeholder = value;
			} else if (type === 'checkbox' || type === 'hidden') {
				type = 'boolean';
			} else if (type === 'number' || type === 'range') {
				type = 'number';
			} else  {
				type = 'string';
			}

			return [type, label, definition, placeholder];
		}).filter(option => option);
	}, [definitions]);

	const [type, label, definition, placeholder] = info;

	const select = ['label', { className: 'select-label' },
		label,
		options.length === 1 && type && type !== 'boolean'
			? ['button', { type: 'button', className: 'action-button' }, placeholder || 'Add']
			: ['select', {},
				['option', { selected: true }, placeholder || 'Select an item...'],
				...options.map(([type, label,, value]) => ['option', null, label || type || value]),
			],
	];

	switch (type) {
		case '':
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
function ObjectField ({ '': context, schema = {}, data = {}, path, names }, field) {
	field = [...field];
	const inputProps = field.pop()[1];
	const complex = path && names.length > 0;
	const { cache } = context;

	if (!field[2]) {
		field.splice(0);
	}

	const { '': dataMeta, ...dataProps } = data;
	const [dataPath, ...overrides] = typeof dataMeta === 'string' ? dataMeta.trim().split(/\s+/) : [''];

	if (!dataPath || dataPath.endsWith('/')) {
		overrides.push(...Object.keys(dataProps));
	}

	const state = stew({
		expanded: !names.length,
		selection: dataPath.split('/').pop(),
	}, []);

	const { expanded, selection } = state;
	let select;

	if (complex) {
		const base = stew(fetchCode, [path, cache], null);
		const list = stew(fetchList, [path, cache], null);

		if (!base || !list) {
			return;
		} else if (!form || !input) {
			form = globalThis.document.createElement('form');
			input = globalThis.document.createElement('input');
			form.appendChild(input);
		}

		const baseDefault = Array.isArray(base.default) ? base.default : [];
		const { '': meta, ...baseSchema } = baseDefault[1] || {};

		[schema, select] = stew(() => [
			merge(baseSchema, schema),
			list.length > 0 && ['', null, ['select', {
				onchange: event => state.selection = event.target.selectedIndex ? event.target.value : '',
			},
				['option', { value: '' }, inputProps.placeholder || 'Select an item...'],
				...list.filter(value => {
					Object.assign(input, { value }, inputProps);
					return form?.checkValidity?.() ?? true;
				}).map(value => {
					return ['option', { value }, value];
				}),
			]],
		], [path]);

		stew(null, [selection], () => {
			if (!select) {
				return;
			}

			const [ref] = select[0];

			if (!ref) {
				return;
			} else if (selection) {
				ref.value = selection;
			} else {
				ref.selectedIndex = 0;
			}
		});
	}
	
	const list = ['ul', expanded ? null : { style: { display: 'none' } }];
	let meta;

	if (path) {
		meta = Field(`/ ${path}/${selection}`, undefined, ...names, '');
	}

	if (expanded || overrides.length) {
		for (const [name, definition] of Object.entries(schema)) {
			const isOverride = overrides.indexOf(name) !== -1;
			const value = isOverride ? dataProps[name] : undefined;
			const item = ['li', null, Field(definition, value, ...names, name)];
			const label = item[2];
			list.push(item);

			if (!label[2]) {
				label[2] = name;
			}

			if (!isOverride && data[name] && label[0] === 'label') {
				item.push(['input', { value: data[name], disabled: true }]);
			}
		}
	}

	return !names.length ? list : ['', null, [
		...field,
		['button', {
			type: 'button',
			className: 'action-button',
			onclick: () => state.expanded = !expanded,
		}, expanded ? 'Hide' : selection ? 'Override' : 'Show'],
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
		({ '': definition = '', ...schema } = definition);
	}

	if (typeof definition !== 'string') {
		return;
	}

	const id = names.reduce((id, name) => `${id}${typeof name === 'number' ? `[${name}]` : `${id ? '.' : ''}${name}`}`, '');
	const match = definition.match(/^\s*(?:([^\/]+)\s+)?(\**)(\S*?)\/(\S*\/)?(\S*?)(?:\s+(.+?))?\s*$/);
	let [, label, required, type, slashes = '', range = '', placeholder] = match || [, definition.trim()];
	let [, min = '', step, max = ''] = range.match(/^(?:(.*?)\.\.)?(?:(.*?)\.\.)?(.*?)$/);
	const props = {};
	const input = ['input', props];
	const field = ['label', {}, label, input];
	let path;

	if (slashes) {
		const [, prefix, pattern] = slashes.match(/^(.*?)\/(?:((?:\\\/|[^\s\/])*?)\/)?$/);
		path = prefix ? `/${prefix}` : '';
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
		field[1].className = 'static-label';
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
		delete field[1].className;
		return [ObjectField, { schema, data, path, names }, field];
	} else if (id) {
		props.id = id;
		field[1].for = id;
	}
	
	if (type === 'textarea') {
		input[0] = 'textarea';
	} else if (type) {
		props.type = type;
	}

	if (!props.disabled && (data || data === 0) && typeof data !== 'object') {
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
