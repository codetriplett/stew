const { createServer } = require('http');
const { readFile, writeFile } = require('fs');

const { env, cwd, argv: [,, config = ''] } = process;
const [overrides, ...flagNames] = config.split('#');
const [, portOverride, pathExtension] = overrides.match(/^(?::(.*?)(?:[\\\/]|$))?(?:[\\\/]*(.*?)\/*)$/);
const port = env.PORT || Number(portOverride || '8080');
const folder = `${cwd()}${pathExtension.replace(/^(?!\\|\/|$)|\//g, '\\').replace(/(\\|\/)$/, '')}`;
const flags = Object.fromEntries(flagNames.map(name => [name, true]));
const { readonly } = flags;

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
	'index.min.js',
	'stew.min.js',
	'stew.min.js.LEGAL.txt',
	'stew.min.mjs',
	'stew.min.mjs.LEGAL.txt',
]);

function send (res, content, type = types.txt) {
	let status = 200;

	if (typeof type === 'number') {
		status = type;
		type = types.txt;
	} else if (!(content instanceof Buffer) && typeof content !== 'string') {
		status = 404;
		content = 'Not found';
	}
	
	const utf8 = !/^image\/(?!svg)/.test(type);

	res.writeHead(status, {
		'Content-Length': Buffer.byteLength(content),
		'Content-Type': `${type}${utf8 ? '; charset=utf-8' : ''}`
	});

	res.end(content);
}

createServer(({ method, url }, res) => {
	const regex = /^(?:\/+)?(.*?(?:\.([^/.?#]*)|\/*)?)(?:\?(.*?))?$/;
	let [, path = '', extension] = url.match(regex);

	switch (method) {
		case 'PUT':
		case 'DELETE': {
			if (readonly) {
				send(res, 'Server is read-only.', 404);
			} else if (!extension) {
				send(res, 'Missing file extension.', 404);
			} else if (method === 'PUT') {
				writeFile(`${folder}/${path}`, ['utf8'], err => {
					if (err) {
						send(res, err.message, 404);
					} else {
						send(res, 'Success');
					}
				});
			} else {
				// TODO: delete file
			}

			return;
		}
		case 'POST': {
			// TODO: load MJS and call default function (simulate API)
			// - demo mode should simulate this client-side
			return;
		}
		case 'GET': {
			if (!extension) {
				path = 'index.html';
			}

			const type = types[extension || 'html'];
			const options = !/^image\/(?!svg)/.test(type) ? ['utf8'] : [];

			readFile(`${manifest.has(path) ? __dirname : folder}/${path}`, ...options, (err, content) => {
				if (!extension) {
					content = content.replace('<body>', `<body><script>const flags=${JSON.stringify(flags)};</script>`);
				}

				send(res, content, type);
			});

			return;
		}
	}
}).listen(port, err => console.log(`server is listening on ${port}`));
