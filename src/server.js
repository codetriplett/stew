#!/usr/bin/env node

const { createServer } = require('http');
const { readFile, writeFile, readdir, access, unlink, constants } = require('fs');
const path = require('path');

const { env, cwd, argv: [,, config = ''] } = process;
const { PORT } = env;
const [overrides, ...flagNames] = config.split('#');
const flags = Object.fromEntries(flagNames.map(name => [name, true]));
const { '': fromdir, readonly } = flags;
const [, portOverride, backtracks, pathExtension] = overrides.match(/^(?::(.*?)(?=[\\\/]|$))?(?:(?:[\\\/]|^)([\\\/]*)(.*?)\/*)$/);
const port = PORT || Number(portOverride || '8080');
let folder = path.join(fromdir ? path.join(__dirname, '..') : cwd(), ...Array(backtracks.length).fill('..'));
folder += pathExtension.replace(/^(?!\\|\/|$)|\//g, '/').replace(/(\\|\/)$/, '');

const types = {
	txt: 'text/plain',
	md: 'text/plain',
	html: 'text/html',
	css: 'text/css',
	js: 'application/javascript',
	mjs: 'application/javascript',
	json: 'application/json',
	bmp: 'image/bmp',
	gif: 'image/gif',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml',
	ico: 'image/x-icon'
};

const manifest = new Set([
	'favicon.ico',
	'index.css',
	'index.html',
	'index.png',
	'index.min.js',
	'stew.min.js',
	'stew.min.js.LEGAL.txt',
	'stew.min.mjs',
	'stew.min.mjs.LEGAL.txt',
]);

const htmlPromise = new Promise(resolve => {
	readFile(`${__dirname}/index.html`, { encoding: 'utf8' }, (err, content) => {
		resolve(content.replace('<body>', `<body><script>const flags=${JSON.stringify(flags)};</script>`));
	});
});

function send (res, content, extension) {
	const headers = {};
	let status = 200;

	if (typeof extension === 'number') {
		if (extension === 405) {
			headers.Allow = 'GET';
		}

		status = extension;
		extension = undefined;
	} else if (!(content instanceof Buffer) && typeof content !== 'string') {
		switch (extension) {
			case 'md': {
				content = '';
				break;
			}
			case 'mjs': {
				content = 'export default [(_, content) => content, {}];';
				break;
			}
			case 'json': {
				content = '{}';
				break;
			}
			default: {
				status = 404;
				content = 'Not found';
				break;
			}
		}
	}
	
	const type = types[extension ?? 'txt'];
	const utf8 = !/^image\/(?!svg)/.test(type);

	res.writeHead(status, {
		...headers,
		'Content-Length': Buffer.byteLength(content),
		'Content-Type': `${type}${utf8 ? '; charset=utf-8' : ''}`
	});

	res.end(content);
}

createServer((req, res) => {
	const { method, url } = req;
	const regex = /^(?:\/+)?(.*?(?:\.([^/.?#]*)|\/*)?)(?:\?(.*?))?$/;
	let [, path = '', extension] = url.match(regex);
	const type = types[extension || 'html'];
	const options = [];

	if (!/^image\/(?!svg)/.test(type)) {
		options.push({ encoding: 'utf8' });
	}
	
	if (method === 'GET') {
		if (!extension) {
			if (url.endsWith('//')) {
				// TODO: support more '/' to indicate deep search
				// - e.g. /site/// will return { category: ['page'] }
				// - put some limit on the number of notes it can return
				if (url.endsWith('///')) {
					send(res, 'Deep directory data not yet supported.', 404);
					return;
				}

				readdir(`${folder}/${path}`, (err, files = []) => {
					const notes = [];
					
					for (const file of files) {
						if (file.endsWith('.md')) {
							notes.push(file.slice(0, -3));
						} else if (file.endsWith('.json')) {
							notes.push(file.slice(0, -5));
						}
					}

					send(res, JSON.stringify(notes), 'json');
				});
			} else {
				htmlPromise.then(html => send(res, html, 'html'));
			}

			return;
		}

		readFile(`${manifest.has(path) ? __dirname : folder}/${path}`, ...options, (err, content) => {
			send(res, content, extension);
		});

		return;
	}
	
	const filepath = `${folder}/${path}`;
	
	if (readonly) {
		send(res, 'Server is read-only.', 405);
		return;
	} else if (method === 'DELETE') {
		access(filepath, constants.F_OK, err => {
			if (err) {
				send(res, 'Unnecessary');
				return;
			}

			unlink(filepath, err => {
				if (err) {
					send(res, err.message, 500);
				} else {
					send(res, 'Success');
				}
			});
		});

		return;
	}

	let body = '';

	req.on('data', (data) => {
		body += data;

		if (body.length > 1e6) {
			req.destroy();
		}
	});

	req.on('end', () => {
		if (method === 'POST') {
			// TODO: return list of all references made to a hashpath if body is not an object
			// - read from .txt file found at that path
			// - lines that start with # are for the sections that can be referenced
			// - lines that start with / are for the files that reference the section
			// - add multple hash values after path if referenced by more than one section
			// - there should be only one path for each unique file that references each section

			// TODO: load MJS and call default function (simulate API)
			// - demo mode should simulate this client-side 
			return;
		}

		// TODO: create folders that don't exist to be able to save file

		writeFile(filepath, body, ...options, err => {
			if (err) {
				send(res, err.message, 500);
			} else {
				send(res, 'Success');
			}
		});
	});
}).listen(port, err => console.log(`server is listening on ${port}`));
