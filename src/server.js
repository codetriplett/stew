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
	const headers = {};
	let status = 200;

	if (typeof type === 'number') {
		if (type === 405) {
			headers.Allow = 'GET';
		}

		status = type;
		type = types.txt;
	} else if (!(content instanceof Buffer) && typeof content !== 'string') {
		status = 404;
		content = 'Not found';
	}
	
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
			path = 'index.html';
		}

		readFile(`${manifest.has(path) ? __dirname : folder}/${path}`, ...options, (err, content) => {
			if (!extension) {
				content = content.replace('<body>', `<body><script>const flags=${JSON.stringify(flags)};</script>`);
			}

			send(res, content, type);
		});

		return;
	} else if (readonly) {
		send(res, 'Server is read-only.', 405);
		return;
	} else if (method === 'DELETE') {
		// TODO: delete file
		return;
	}

	let body = '';

	req.on('data', (data) => {
		body += data;

		if (body.length > 1e6) {
			req.connection.destroy();
		}
	});

	req.on('end', () => {
		if (method === 'POST') {
			// TODO: load MJS and call default function (simulate API)
			// - demo mode should simulate this client-side 
			return;
		}

		writeFile(`${folder}/${path}`, body, ...options, err => {
			if (err) {
				send(res, err.message, 500);
			} else {
				send(res, 'Success');
			}
		});
	});
}).listen(port, err => console.log(`server is listening on ${port}`));
