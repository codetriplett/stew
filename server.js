const { createServer } = require('http');
const { readFile } = require('fs');
const stew = require('./dist/stew.min.js');

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

createServer(async ({ url }, res) => {
	const regex = /^(?:\/+)?(.*?)(?:\.([^/.?#]*)|\/*)?(?:\?(.*?))?$/;
	let [, path = '', extension] = url.match(regex);

	if (!extension) {
		const html = [
			'<!DOCTYPE html>',
			'<html lang="en">',
				'<head>',
					'<title>StewTube</title>',
					'<style id="styles">',
						'h1 a:only-child,',
						'h2 a:only-child,',
						'h3 a:only-child,',
						'h4 a:only-child,',
						'h5 a:only-child,',
						'h6 a:only-child {',
							'position: relative;',
							'text-decoration: none;',
							'color: var(--paper-font-color);',
						'}',
						'h1 a:only-child:hover:after,',
						'h2 a:only-child:hover:after,',
						'h3 a:only-child:hover:after,',
						'h4 a:only-child:hover:after,',
						'h5 a:only-child:hover:after,',
						'h6 a:only-child:hover:after {',
							'content: \'#\';',
							'position: absolute;',
							'left: calc(100% + 5px);',
						'}',
						'a {',
							'color: var(--link-font-color);',
						'}',
						'a:visited {',
							'color: var(--link-visited-font-color);',
						'}',
						'code {',
							'tab-size: 4;',
						'}',
						'span[style="color:transparent"],',
						'span[style="color:transparent;"],',
						'span[style="color: transparent"],',
						'span[style="color: transparent;"] {',
							'background: var(--paper-font-color);',
							'user-select: none;',
						'} ',
					'</style>',
					'<link href="/index.css" rel="stylesheet">',
					'<script src="/stew.min.js"></script>',
				'</head>',
				'<body>',
					stew('', {}, ['div', { id: 'app' }]),
					'<script src="/index.js"></script>',
					'<script>',
						// TODO: allow input on home page for code for object render function
						'stew(\'#app\', {}, [App]);',
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
