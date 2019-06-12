const http = require('http');
const fs = require('fs');

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
	const path = url.replace(/^\/|(\.[a-z]+|\/)$/g, '') || 'index';
	const extension = url.match(/(\.[a-z]+)?$/)[0].slice(1) || 'html';
	const folder = /^dist\//.test(path) ? __dirname.replace(/\\[a-z]+$/, '') : __dirname;
	const type = mimeTypes[extension] || 'text/plain';
	const utf8 = !/^image\/(?!svg)/.test(type);

	fs.readFile(`${folder}/${path}.${extension}`, utf8 ? 'utf8' : '', (err, file) => {
		sendResponse(res, file, type, utf8);
	});
}).listen(port, err => console.log(`server is listening on ${port}`));
