const { createServer } = require('http');
const { readFile } = require('fs');
const stew = require('./dist/stew.min.js');
const App = require('./preview/index.js');

const port = process.env.PORT || 8080;

const types = {
	txt: 'text/plain',
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

const resources = [
	'favicon.ico',
	'index.css',
	'index.js',
	'stew.min.js',
	'index.alt.css',
	'index.alt.js',
];

function send (res, content, type = types.txt) {
	const utf8 = !/^image\/(?!svg)/.test(type);
	let status = 200;

	if (!(content instanceof Buffer) && typeof content !== 'string') {
		status = 404;
		content = 'Not found';
	}

	res.writeHead(status, {
		'Content-Length': Buffer.byteLength(content),
		'Content-Type': `${type}${utf8 ? '; charset=utf-8' : ''}`
	});

	res.end(content);
}

function convertComponent ({ name }, vars, container) {
	console.log('======');
	// return App[name](container);s
}

createServer(async ({ url }, res) => {
	const regex = /^(?:\/+)?(.*?)(?:\.([^/.?#]*)|\/*)?(?:\?(.*?))?$/;
	let [, path = '', extension] = url.match(regex);

	if (!extension) {
		const initialProps = App.generateInitialState?.() || {};
		const variation = path ? `.${path}` : '';

		const html = [
			'<!DOCTYPE html>',
			'<html lang="en">',
				'<head>',
					'<title>StewTube</title>',
					`<link href="/index${variation}.css" rel="stylesheet">`,
					'<script src="/stew.min.js"></script>',
				'</head>',
				'<body>',
					stew('', {}, ['div', { id: 'app' }]),
					`<script src="/index${variation}.js"></script>`,
					'<script>',
						'const render = ({ name }, container) => App[name](container);',
						'const context = { \'\': render, swap: () => swap(window.manifest) };',
						`const swap = stew(\'#app\', context, [App, ${JSON.stringify(initialProps)}]);`,
					'</script>',
				'</body>',
			'</html>',
		].join('');

		send(res, html, types.html);
		return;
	}

	const type = types[extension];
	const options = !/^image\/(?!svg)/.test(type) ? ['utf8'] : [];
	path += `.${extension}`;

	if (!resources.includes(path) && !path.startsWith('static/')) {
		return send(res);
	}

	const folder = path === 'stew.min.js' ? 'dist' : 'preview';

	readFile(`${__dirname}/${folder}/${path}`, ...options, (err, content) => {
		send(res, content, type);
	});
}).listen(port, err => console.log(`server is listening on ${port}`));
