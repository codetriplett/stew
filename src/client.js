import { createCtx, createElm, createTxt } from './create';
import { parse, reconcile } from './manage';
import { updateCtx, updateElm, updateTxt } from './update';

export function client (type, ...content) {
	if (Array.isArray(type)) parse(type, ...content);
	const customized = typeof type === 'function';
	const textual = !customized && !content.length;
	const { '': key, ...props } = content.shift() || {};

	return function (direct, elm, i = 0, ctx, sibling, hydrating) {
		const root = !direct || direct instanceof Element || direct instanceof Text;

		if (root) {
			elm = { '': [[],,, [direct]] };
			
			if (direct) {
				hydrating = true;
				if (customized) elm = createElm('', elm);
			}

			direct = elm;
		}

		let memory = key && ctx ? ctx[''][1][key] : direct[''][0][i];

		if (!memory || textual && memory[''].length !== 2
			|| !textual && type !== (memory[''][2] || '')) {
			if (customized) memory = createCtx(type, elm, ctx);
			else if (textual) memory = createTxt(type, elm);
			else if (type !== '') memory = createElm(type, elm);
			else memory = { '': [[]] };

			if (key && ctx) ctx[''][1][key] = memory;
		}

		if (customized) {
			content = updateCtx(memory, props, content);
			ctx = memory;
		} else if (textual) {
			if (!type && type !== 0 || type === true) type = '';
			updateTxt(memory, type);
			content = undefined;
		} else if (type !== '') {
			updateElm(memory, props);
			elm = memory;
			sibling = undefined;
		}

		if (content) reconcile(memory, elm, content, ctx, sibling, hydrating);
		if (memory === elm) sibling = memory[''][1];
		Object.assign(memory, props);
		return root ? memory[''][1] : memory;
	}
}
