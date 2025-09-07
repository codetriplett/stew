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

export function extractData (form, isCustom) {
	if (!form.checkValidity()) {
		if (!isCustom) {
			document.body.classList.add('show-left');
		}

		form.reportValidity();
		return;
	}
	
	const metas = [];
	const data = {};
	let meta;

	for (const input of form.elements) {
		let { tagName, type, id, value, checked, disabled, className } = input;

		if (id === '.') {
			meta = /[^\/]$/.test(value) ? value : undefined;
			continue;
		} else if (!id || disabled || className === 'default') {
			continue;
		}

		const names = id.replace(/^\.+|\.+$/g, '').split(/\.|(?=\[)/)
			.map(name => name[0] === '[' ? Number(name.slice(1, -1)) : name);
		
		const isOverride = className === 'override';
		const isMeta = id[id.length - 1] === '.';
		const finalName = names.pop();

		if (!isMeta) {
			value = convertValue(type, value, checked);

			if (!value && !isOverride) {
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

		if (isMeta && finalName !== undefined) {
			metas.unshift([object, finalName, value, tagName.toLowerCase(), className === 'override']);
		} else {
			object[finalName] = value;
		}
	}

	for (const [object, name, value, tagName, isOverride] of metas) {
		const structure = object[name];

		if (tagName === 'input') {
			if (structure && Object.keys(structure).length || /[^\/]$/.test(value)) {
				object[name] = { '': value, ...structure };
			} else if (!isOverride) {
				delete object[name];
			} else if (!structure) {
				object[name] = {};
			}

			continue;
		} else if (!structure) {
			if (isOverride) {
				object[name] = [];
			}

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

	return meta ? { '': meta, ...data } : data;
}

export function findOption (value, ...options) {
	const valueType = typeof value;

	return options.findIndex(([type,,, placeholder]) => {
		if (valueType !== 'object') {
			// TODO: store special type for color input to avoid it matching for ''
			return type ? valueType === type : value === placeholder;
		}

		const path = value?.[''] || '/';
		return path.startsWith(type) && path.lastIndexOf('/') < type.length;
	});
}

function attachListener (select, callback) {
	const control = select[3];

	if (!control) {
		return;
	}

	const [tagName, props] = control;

	if (tagName === 'select') {
		props.onchange = callback;
		return;
	}

	props.onclick = () => callback({ target: { selectedIndex: 1 } });
}

function ValueSelect ({ options, mode, names, value }, select, button) {
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
		field = Field(options[index][2], value, mode, ...names);
		field[2] = null;
	} else if (mode === null) {
		field = Field('/', value, mode, ...names);
		field[2] = null;
	}

	return ['', null,
		button,
		ref = ['', null, select],
		field,
	];
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

function ArraySelect ({ options, mode, names, value }, select, button) {
	const array = stew(() => {
		return Array.isArray(value) ? value : [];
	}, [value]);

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

	stew(null, [array], () => {
		const [, textarea] = ref[0];
		resizeTextarea([[textarea]]);
	});

	const meta = stew(() => {
		const text = indexes.map((index, i) => {
			return index < 0 ? '' : renderIdentifier(options[index], i, array[i]);
		}).filter(value => value).join('\n');

		const field = Field('textarea//', '', mode, ...names, '');
		field[2] = text;
		return field;
	}, [array]);

	meta[1].disabled = !!mode;

	attachListener(select, event => {
		const index = event.target.selectedIndex - 1;

		if (index === -1) {
			return;
		}

		const [, textarea] = ref[0];
		const option = options[index];
		const [type,,, placeholder] = option;
		const { length } = indexes;
		const { value } = textarea;
		const string = type ? 'null' : placeholder;
		state.indexes = [...indexes, index];
		textarea.value += `${value ? '\n' : ''}${renderIdentifier(option, length, string)}`;
		resizeTextarea([[textarea]]);
		event.target.selectedIndex = 0;
		textarea.selectionStart = value ? value.length + 1 : 0;
		textarea.selectionEnd = textarea.value.length;
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

	const items = [];
	let isVisible = false;

	for (const [i, index] of indexes.entries()) {
		if (index < 0) {
			continue;
		}

		const definition = options[index][2];
		const props = visibleIndexes.has(i + 1) ? null : { style: { display: 'none' } };
		items.push(['li', props, Field(definition, array[i], mode, ...names, i)]);

		if (!props) {
			isVisible = true;
		}
	}

	return ref = ['', null,
		button,
		select,
		meta,
		!mode && ['ol', {
			start,
			className: `${start < 10 ? '' : 'extra-padding'} ${!isVisible ? 'none-visible' : ''}`,
		}, ...items],
	];
}

function ObjectSelect ({ options, mode, names, value }, select, button, input) {
	const object = stew(() => {
		return typeof value === 'object' && !Array.isArray(value) ? value : {};
	}, [value]);

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
		button,
		select,
		input[3],
		['ul', null,
			...indexes.map(([name, index]) => {
				if (index < 0) {
					return;
				}

				const field = Field(options[index][2], object[name], mode, ...names, name);
				field[2] = name;
				return ['li', null, field];
			}),
		],
	];
}

export function Select ({ definition, value, mode, names }, button) {
	const [info, ...options] = stew(() => {
		return definition.map((definition, i) => {
			let field = Field(definition, undefined, null, ...(i ? names : []));
			const isObject = field[0] !== 'label';
			let path;

			if (isObject) {
				({ path } = field[1]);
				field = field[2];
			}

			const [,, label, input] = field;
			let { type = '', placeholder, value } = input[1];

			if (path) {
				type = `${path}/`;
			} else if (isObject) {
				type = '/';
				placeholder ||= value;
			} else if (type === 'hidden') {
				placeholder = value;
				type = '';
			} else if (type === 'checkbox' || type === 'hidden') {
				type = 'boolean';
			} else if (type === 'number' || type === 'range') {
				type = 'number';
			} else  {
				type = 'string';
			}

			return [type, label, definition, placeholder];
		}).filter(option => option);
	}, [definition]);

	const [type, label, infoDefinition, placeholder] = info;
	
	const select = ['label', { className: 'select-label', onclick: mode },
		label || names[names.length - 1],
		options.length === 1 && type && type !== 'boolean'
			? !mode && ['button', { type: 'button', className: 'action-button' }, '+']
			: ['select', { disabled: !!mode },
				['option', { selected: true }, placeholder || 'Select an item...'],
				...options.map(([type, label,, value]) => ['option', null, label || type || value]),
			],
	];

	let Component, field;

	switch (type) {
		case '':
		case 'boolean': {
			Component = ValueSelect;
			break;
		}
		case 'number': {
			Component = ArraySelect;
			break;
		}
		case 'string': {
			Component = ObjectSelect;
			field = Field(infoDefinition);
			break;
		}
		default: {
			return;
		}
	}
	
	return [Component, { options, mode, names, value }, select, button, field];
}

export function parseDefinition (definition) {
	const match = definition.match(/^\s*(?:([^\/]+)\s+)?(\**)(\S*?)\/(\S*\/)?(\S*?)(?:\s+(.+?))?\s*$/);
	
	if (!match) {
		return ['checkbox', definition.trim()];
	}
	
	let [, label, required, type, slashes = '', range = '', placeholder = ''] = match;
	let [, min = '', step, max = ''] = range.match(/^(?:(.*?)\.\.)?(?:(.*?)\.\.)?(.*?)$/);
	let path, pattern;

	if (slashes) {
		const [, prefix, remainder] = slashes.match(/^(.*?)((?:\\\/|[^\s\/])*?)\/$/);
		type ||= 'text';
		pattern = remainder;
		
		if (prefix) {
			path = `/${prefix.slice(0, -1)}`;
		}
	} else if (range) {
		const [, minDate, minTime] = min.match(/^(?:(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2})?|.*)$/);
		const [, maxDate, maxTime] = max.match(/^(?:(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2})?|.*)$/);
		type ||= minTime || maxTime ? 'datetime-local' : minDate || maxDate ? 'date' : 'number';
		step ||= '0';

		if (min) {
			if (type !== 'number' && !minDate) {
				min += '-01-01';
			}
			
			if (type === 'datetime-local' && !minTime) {
				min += 'T00:00';
			}
		}

		if (max) {
			if (type !== 'number' && !maxDate) {
				max += '-01-01';
			}
			
			if (type === 'datetime-local' && !maxTime) {
				max += 'T00:00';
			}
		}
	} else {
		type ||= 'hidden';
	}

	return [type, label, placeholder, required || false, step, min || undefined, max || undefined, pattern, path];
}

async function fetchBase (path, set = new Set()) {
	set.add(path);
	const { default: [, schema] } = await fetchCode(path);
	const { '': definition = '', ...rest } = schema;
	const basePath = parseDefinition(definition)[8];

	if (!basePath || set.has(basePath)) {
		return rest;
	}

	const base = await fetchBase(basePath, set);
	return base ? { ...base, ...rest } : rest;
}

let form, input;

// the idea here is that objects can extend existing schemas (if path is provided), or create their own embedded in current one
// - even if another schema is referenced, choosing an existing file is optional. It can be created fresh from overrides within data as well
// - '' prop on stored data indicates the schema it is tied to, and optionally what existing data it overwrites (if not ending in '/')
// - the path to the schema is used not only for the form, but can also be used to import the code to render the component (file.default[0])
function ObjectField ({ schema = {}, value, path, mode, names, onclick }, field, button) {
	const object = stew(() => {
		return typeof value === 'object' && !Array.isArray(value) ? value : {};
	}, [value]);

	field = [...field];
	const inputProps = field.pop()[1];

	if (!field[2]) {
		field.splice(0);
	}

	if (onclick) {
		field[1].onclick = onclick;
	}

	const { '': dataMeta, ...rest } = object;
	const [, dataPath, dataSelection] = typeof dataMeta === 'string' ? dataMeta.match(/^((?:\/[^\/\s]+){1,})\/([^\/\s]*)$/) : [];

	const state = stew({
		expanded: mode === undefined || typeof names[names.length - 1] === 'number',
		overrides: Object.keys(mode ? [] : rest),
		selection: dataPath === path && dataSelection || '',
	}, [object]);

	const { expanded, overrides, selection } = state;
	const inherited = [];
	let defaults, select;

	if (path) {
		const list = stew(fetchList, [path], null);
		const base = stew(fetchBase, [path], null);

		defaults = stew(() => {
			return selection ? fetchData(`${path}/${selection}`, null) : {};
		}, [selection], null);

		if (!list || base === null || !defaults) {
			return;
		} else if (!form || !input) {
			form = globalThis.document.createElement('form');
			input = globalThis.document.createElement('input');
			form.appendChild(input);
		}

		if (selection) {
			inherited.push(...Object.keys(base || schema));
		}

		if (base) {
			schema = { ...base, ...schema };
		}

		select = stew(() => list.length > 0 && ['', null, ['select', {
			onchange: event => {
				state.selection = event.target.selectedIndex ? event.target.value : '';
			},
		},
			['option', { value: '' }, inputProps.placeholder || 'Select an item...'],
			...list.filter(value => {
				Object.assign(input, { value }, inputProps);
				return form?.checkValidity?.() ?? true;
			}).map(value => {
				return ['option', { value }, value];
			}),
		]], [object]);

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

	if (select) {
		select[2][1].disabled = !!mode;
	}

	const isSelf = !names.length && path && `${path}/${selection}` === window.location.pathname;
	const list = ['ul', expanded ? null : { style: { display: 'none' } }];
	let meta;

	if (path) {
		meta = Field(`/ ${path}/${selection}`, undefined, mode, ...names, '');
	}

	if (expanded || !mode && overrides.length) {
		for (const [name, definition] of Object.entries(schema)) {
			const isInherited = inherited.indexOf(name) !== -1;
			const isOverride = overrides.indexOf(name) !== -1;
			const value = isSelf || !isInherited || isOverride ? object[name] : defaults[name];
			// TODO: rename fieldMode to onclick. The function is a truthy value that doubles as the old 'mode' param
			const fieldMode = mode || isInherited && (!isOverride && (() => state.overrides = [...overrides, name]) || null);
			const item = ['li', null, Field(definition, value, fieldMode, ...names, name)];
			const label = item[2];
			list.push(item);

			if (label[2] === '') {
				label[2] = name;
			}

			if (label[3]?.[1]?.type === 'checkbox') {
				item[1] = { className: 'checkbox-field' };
			}

			if (fieldMode === null) {
				label.splice(3, 0, ['button', {
					type: 'button',
					className: 'action-button reset-button',
					onclick: () => {
						state.overrides = overrides.filter(override => override !== name);
					},
				}, '🗙']);
			}
		}
	}

	if (names.length) {
		field.push(
			!mode && ['button', {
				type: 'button',
				className: 'action-button',
				onclick: () => state.expanded = !expanded,
			}, expanded ? '︿' : '﹀'],
			select,
		);
	} else if (meta) {
		field.splice(2, 1, '', select);
	} else {
		field = null;
	}

	return ['', null, button, field, meta, list];
}

// TODO: see if ...names can be replaced by parentId and name
// - then append name to parentId, in brackets if it's a number
export function Field (definition, value, mode, ...names) {
	let schema, defaultLabel;

	if (Array.isArray(definition)) {
		return [Select, { definition, value, mode, names }];
	} else if (typeof definition === 'object') {
		({ '': definition, ...schema } = definition);
		defaultLabel = 'Object';
	} else {
		defaultLabel = names[names.length - 1];
	}

	if (typeof definition !== 'string') {
		if (schema) {
			definition = '';
		} else {
			return;
		}
	}

	// TODO: simplify this now that there is no leading ''
	const id = names.reduce((id, name, i) => {
		const separator = i || !name && names.length === 1 ? '.' : '';
		return `${id}${typeof name === 'number' ? `[${name}]` : `${separator}${name}`}`;
	}, '');

	const [type, label, placeholder, required, step, min, max, pattern, path] = parseDefinition(definition);
	const className = mode && 'default' || (mode ?? 'override');
	const props = { className };
	const input = ['input', props];
	const field = ['label', { onclick: mode }, label || defaultLabel, input];

	if (pattern) {
		props.pattern = pattern;
	}
	
	if (min) {
		props[pattern !== undefined ? 'minlength' : 'min'] = min;
	}
	
	if (max) {
		props[pattern !== undefined ? 'maxlength' : 'max'] = min;
	}

	if (step > 1) {
		props.step = step;
	}

	if (type === 'hidden') {
		field[1].className = 'static-label';
		props.value = placeholder;
	} else if (placeholder) {
		props.placeholder = placeholder;
	}

	if (required) {
		props.required = true;
	}

	if (path || schema) {
		delete field[1].className;
		return [ObjectField, { schema, value, path, mode, names }, field];
	} else if (id) {
		props.id = id;
		field[1].for = id;
	}
	
	if (className === 'default') {
		props.disabled = true;
	}
	
	if (type === 'textarea') {
		input[0] = 'textarea';
	} else if (type) {
		props.type = type;
	}

	if (type !== 'hidden' && typeof value !== 'object') {
		if (type === 'checkbox') {
			props.checked = value === true;
		} else {
			value = value && typeof value !== 'object' || value === 0 ? String(value) : '';

			if (type === 'textarea') {
				input[2] = value;
			} else  {
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
	}

	return id.endsWith('.') ? input : field;
}

export default function renderForm (schema, callback) {
	const data = stew(fetchData, [window.location.pathname, null], null);

	return ['form', {
		'': 'form',
		onsubmit: event => {
			event.preventDefault();

			if (!callback) {
				return;
			}

			const { target } = event;
			const data = extractData(target, true);
			callback(data);
		}
	},
		data && Field(schema, data),
		callback && ['button', { type: 'submit' }, 'Submit'],
	];
}
