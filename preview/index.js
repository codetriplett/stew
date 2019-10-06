const http = require('http');
const fs = require('fs');
const stew = require('../dist/stew.min');
const simple = require('./simple');

const port = 8080;

const mimeTypes = {
	html: 'text/html',
	css: 'text/css',
	js: 'application/javascript',
	json: 'application/json',
	bmp: 'image/bmp',
	gif: 'image/gif',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	png: 'image/png',
	svg: 'image/svg+xml'
};

function sendResponse(res, content, type, utf8, status) {
	if (content === undefined) {
		sendResponse(res, 'File Not Found', 'text/plain', true, 400);
	} else {
		res.writeHead(status || 200, {
			'Content-Length': Buffer.byteLength(content),
			'Content-Type': `${type}${utf8 ? '; charset=utf-8' : ''}`
		}); 

		res.end(content);
	}
}

http.createServer(({ url }, res) => {
	if (!/\/$/.test(url)) {
		let path = `${__dirname}${url}`;

		if (url === '/stew.min.js') {
			path = path.replace('\\preview/stew.min.js', '\\dist/stew.min.js');
		}

		const type = mimeTypes[url.match(/(\.[a-z]+)?$/)[0].slice(1)];
		const utf8 = !/^image\/(?!svg)/.test(type);

		fs.readFile(path, utf8 ? 'utf8' : '', (err, file) => {
			sendResponse(res, file, type, utf8);
		});

		return;
	}

	sendResponse(res, [
		'<!doctype>',
		'<html>',
			'<head>',
				'<title>Preview</title>',
			'</head>',
			'<body>',
				stew(simple, {
					array: [
						{ string: 'Lorem' },
						{ string: 'Ipsum' }
					]
				}),
				'<script src="/stew.min.js"></script>',
				'<script src="/simple.js"></script>',
			'</body>',
		'</html>'
	].join(''), 'text/html', true);
}).listen(port, err => console.log(`server is listening on ${port}`));
