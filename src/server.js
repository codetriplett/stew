import http from 'http';
import fs from 'fs';
import stew from './stew';

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

export function read (path, encoding, callback) {
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
	http.createServer(({ url }, res) => {
		url = url.replace(/\/+$/, '').replace(/^\/*/, '/').replace(/-/g, '_');
		const extension = url.match(/(\.[a-z]+)?$/)[0].slice(1);

		if (extension) {
			const type = types[extension] || types.txt;
			const encoding = type.split('; charset=')[1];

			if (url === '/stew.min.js') {
				url = `${__dirname.replace(/[\\/]lib[\\/]?$/, '/dist')}${url}`;
			} else {
				url = `${directory}${url}`;
			}

			read(url, encoding, content => respond(res, content, type));
		} else {
			const index = url.lastIndexOf('/');
			let before = url.slice(0, index).replace(/\/+$/, '');
			let after = url.slice(index).replace(/\/+$/, '') || '/200';
			let resolution;

			if (before) {
				after = `${before}${after}`;
				before += '/200';

				resolution = new Promise(resolve => {
					read(`${directory}${after}.json`, 'utf-8', data => {
						resolve(data && JSON.parse(data));
					});
				});
			} else {
				before = after;
				resolution = Promise.resolve({});
			}

			const name = before.slice(1).replace(/\//g, ':');

			fs.stat(`${directory}${before}.json`, err => {
				resolution.then(data => {
					if (err || !data) {
						resolution = Promise.resolve();
					} else {
						const state = { ...data, '..': [directory, []] };
						resolution = stew(name, state);
					}

					resolution.then(html => {
						if (html && html.startsWith('<!doctype html>')) {
							respond(res, html, types.html);
						} else {
							read(`${directory}/404.html`, 'utf-8', html => {
								respond(res, html, types.html);
							});
						}
					});
				});
			});
		}
	}).listen(port, () => console.log(`server is listening on ${port}`));
}
