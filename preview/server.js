const http = require('http');
const fs = require('fs');
const $ = require('./stew.min.js');
const port = 8080;

const types = {
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
	const matches = url.match(/^\/*(.*?)?(?:\.([^.]*?))?\/*(?:\?(.*?))?$/);
	const [, path = 'index', extension = 'html', query = ''] = matches;
	const type = types[extension] || 'text/plain';
	const utf8 = !/^image\/(?!svg)/.test(type);
	const props = {};

	if (query) {
		for (const it of query.split('&')) {
			const index = it.indexOf('=');
			if (!~index) props[it] = true;
			else props[it.slice(0, index)] = it.slice(index + 1);
		}
	}

	fs.readFile(`${__dirname}/${path}.${extension}`, utf8 ? 'utf8' : '', (err, file) => {
		if (extension === 'html') {
			const render = require(`./${path}`);

			if (render) {
				file = file
					.replace(/(?=<\/title>)/, path)
					.replace('<script>', `<script src="/${path}.js">`)
					.replace(/(?=<\/div>)/, render($));
			} else {
				file = undefined;
			}
		}

		sendResponse(res, file, type, utf8);
	});
}).listen(port, err => console.log(`server is listening on ${port}`));
