const { createServer } = require('http');
const { readFile } = require('fs');

const { env, cwd, argv: [,, portParam = 8080, folderParam = '', ] } = process;
const folder = `${cwd()}${folderParam.replace(/^(?!\\|\/|$)|\//g, '\\').replace(/(\\|\/)$/, '')}`;
const port = env.PORT || Number(portParam);

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
	const regex = /^(?:\/+)?(.*?(?:\.([^/.?#]*)|\/*)?)(?:\?(.*?))?$/;
	let [, path = '', extension] = url.match(regex);

	if (!extension) {
		path = 'index.html';
		extension = 'html';
	}

	const type = types[extension];
	const options = !/^image\/(?!svg)/.test(type) ? ['utf8'] : [];

	readFile(`${manifest.has(path) ? __dirname : folder}/${path}`, ...options, (err, content) => {
		send(res, content, type);
	});
}).listen(port, err => console.log(`server is listening on ${port}`));
