const { createServer } = require('http');
const { readFile } = require('fs');
const stew = require('./stew.min.js');
const App = require('.');

const port = process.env.PORT || 8080;

const types = {
	txt: 'text/plain',
	html: 'text/html',
	css: 'text/css',
	js: 'application/javascript',
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
	'index.html',
	'index.css',
	'index.js',
	'stew.min.js',
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

createServer(({ url }, res) => {
	if (url === '/') {
		const html = [
			'<!DOCTYPE html>',
			'<html lang="en">',
				'<head>',
					'<title>StewTube</title>',
					'<link href="/index.css" rel="stylesheet">',
					'<script src="/stew.min.js"></script>',
				'</head>',
				'<body>',
					stew.createElement('div', { id: 'app' }, App()),
					'<script src="/index.js"></script>',
					'<script>stew(\'#app\', App());</script>',
				'</body>',
			'</html>',
		].join('');

		send(res, html, types.html);
		return;
	}

	const regex = /^(?:\/+)?(.*?)(?:\.([^/.?#]*)|\/*)?(?:\?(.*?))?$/;
	let [, path = '', extension] = url.match(regex);
	const type = types[extension];
	const options = !/^image\/(?!svg)/.test(type) ? ['utf8'] : [];
	path += `.${extension}`;
	if (!resources.includes(path) && !path.startsWith('static/')) return send(res);

	readFile(`${__dirname}/${path}`, ...options, (err, content) => {
		send(res, content, type);
	});
}).listen(port, err => console.log(`server is listening on ${port}`));
