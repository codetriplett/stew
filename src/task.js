import { parse } from './parse';

export function task (grunt) {
	grunt.registerTask('stew', function (name = 'main') {
		let files = grunt.config(`${this.name}.${name}.files`);

		if (typeof files !== 'object') {
			return;
		} else if (Array.isArray(files)) {
			const array = files;

			files = {};

			array.forEach(({ cwd, src, dest }) => {
				if (!cwd || !src || !dest) {
					return;
				}

				const options = { cwd, ext: '.json' };

				grunt.file.expandMapping(src, dest, options).forEach(file => {
					const { dest, src } = file;
					files[dest] = src[0];
				});
			});
		}

		for (const file in files) {
			const start = file.lastIndexOf('/');
			const finish = file.indexOf('.', start);
			const name = file.slice(start + 1, finish);
			const template = parse(grunt.file.read(files[file]), name);

			grunt.file.write(file, JSON.stringify(template));
		}
	});
}
