import http from 'http';
import fs from 'fs';
import stew, { components } from './stew';

const types = {
	txt: 'text/plain; charset=utf-8',
	html: 'text/html; charset=utf-8',
	css: 'text/css; charset=utf-8',
	js: 'application/javascript; charset=utf-8',
	json: 'application/json; charset=utf-8',
	svg: 'image/svg+xml; charset=utf-8',
	gif: 'image/gif',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	png: 'image/png'
};

function read (path, encoding, callback) {
	fs.readFile(path, encoding, (err, content) => {
		callback(err ? undefined : content);
	});
}

function respond (res, content, type) {
	let status = 200;
	
	if (content === undefined) {
		content = 'File not found';
		status = 404;
	} else if (!(content instanceof Buffer)) {
		content = String(content);
	}

	res.writeHead(status, {
		'Content-Length': Buffer.byteLength(content),
		'Content-Type': type
	});

	res.end(content);
}

export function server (port, directory) {
	if (directory.endsWith('/')) {
		directory = directory.slice(0, -1);
	}

	http.createServer(({ url }, res) => {
		if (!url || url === '/') {
			url = '/index';
		} else if (url.endsWith('/')) {
			url = url.slice(0, -1);
		}
		
		const extension = url.match(/(\.[a-z]+)?$/)[0].slice(1);

		if (extension) {
			const type = types[extension] || types.txt;
			const encoding = type.split('; charset=')[1];
			let path = `${directory}${url}`;

			if (/^\/stew(\.min)?\.js$/.test(url)) {
				if (!/\.min\.js$/.test(url)) {
					url = url.replace(/\.js$/, '.min.js');
				}

				path = `${__dirname.replace(/\\lib\\?$/, '\\dist')}${url}`;
			}

			read(path, encoding, content => respond(res, content, type));
		} else {
			const name = url.slice(1).replace(/\//g, '.');
			const path = `${directory}${url}.json`;
			let resolution;

			fs.stat(path, err => {
				if (err) {
					resolution = new Promise(resolve => {
						read(`${directory}/404.html`, 'utf-8', html => {
							resolve(html);
						});
					});
				} else if (components.hasOwnProperty(name)) {
					resolution = stew(name);
				} else {
					resolution = new Promise(resolve => {
						read(path, 'utf-8', template => {
							components[name] = JSON.parse(template);
							resolve(stew(name));
						});
					});
				}

				resolution.then(html => {
					respond(res, html, types.html);
				});
			});
		}
	}).listen(port, () => console.log(`server is listening on ${port}`));
}
