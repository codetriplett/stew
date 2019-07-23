const http = require('http');
const fs = require('fs');
const stew = require('../dist/stew.min');
const carousel = require('./carousel.min');

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
				'<script src="/stew.min.js"></script>',
				'<style>',
					'html,',
					'body {',
						'margin: 0;',
					'}',
					'.slideshow {',
						'position: relative;',
					'}',
					'.slide {',
						'opacity: 0;',
						'position: absolute;',
						'top: 0;',
						'width: 100%;',
						'height: 100%;',
						'transition: left 500ms, opacity 500ms;',
						'font-size: 72px;',
						'line-height: 400px;',
						'text-align: center;',
						'background: #ddd;',
					'}',
					'.active ~ .slide,',
					'.finish .first {',
						'left: 100%;',
					'}',
					'.slide,',
					'.start .last {',
						'left: -100%;',
					'}',
					'.active {',
						'opacity: 1;',
						'position: relative;',
						'left: 0;',
					'}',
					'.control {',
						'position: absolute;',
						'top: 0;',
						'width: 10%;',
						'height: 100%;',
						'font-size: 54px;',
						'font-family: monospace;',
						'background: none;',
						'border: none;',
						'cursor: pointer;',
					'}',
					'.control:hover {',
						'color: #0056b3;',
					'}',
					'.prev {',
						'left: 0;',
					'}',
					'.next {',
						'right: 0;',
					'}',
				'</style>',
			'</head>',
			'<body>',
				'<div style="height: 400px; padding: 0 calc(50vw - 600px); overflow-x: hidden;">',
					stew(carousel, {
						slides: [
							{ text: 'first' },
							{ text: 'second' },
							{ text: 'third' }
						],
						index: 0
					}),
				'</div>',
				'<script src="/preview.min.js"></script>',
			'</body>',
		'</html>'
	].join(''), 'text/html', true);
}).listen(port, err => console.log(`server is listening on ${port}`));
