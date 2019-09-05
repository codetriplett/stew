import { parse } from './parse';

export function grunt (grunt) {
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

				const options = { cwd, ext: '.js' };

				grunt.file.expandMapping(src, dest, options).forEach(file => {
					const { dest, src } = file;
					files[dest] = src[0];
				});
			});
		}

		for (const destination in files) {
			const template = parse(grunt.file.read(files[destination]));

			const file = [
				'(function(t){',
					'if(typeof stew===\'function\'){',
						'stew(t);',
					'}else{',
						'module.exports=t;',
					'}',
				'})(',
					JSON.stringify(template),
				');'
			].join('');

			grunt.file.write(destination, file);
		}
	});
}
