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

		const html = [
			'<!DOCTYPE html>',
			'<html lang="en">',
				'<head>',
					'<title>StewTube</title>',
					`<link href="/index.css" rel="stylesheet">`,
					'<script src="/stew.min.js"></script>',
				'</head>',
				'<body>',
					stew('', {}, ['div', { id: 'app' }]),
					`<script src="/index.js"></script>`,
					'<script>',
						'const render = ({ name }, container) => App[name](container);',
						'const context = { swap: () => swap(window.manifest) };',
						`const swap = stew(\'#app\', { \'\': render }, [\'\', context, [App, ${JSON.stringify(initialProps)}]]);`,
					'</script>',
				'</body>',
			'</html>',
		].join('');

		send(res, html, types.html);
		return;
	}

	path += `.${extension}`;
	const folder = path === 'stew.min.js' ? 'dist' : 'preview';
	const type = types[extension];
	const options = !/^image\/(?!svg)/.test(type) ? ['utf8'] : [];

	readFile(`${__dirname}/${folder}/${path}`, ...options, (err, content) => {
		send(res, content, type);
	});
}).listen(port, err => console.log(`server is listening on ${port}`));
