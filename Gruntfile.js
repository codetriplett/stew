module.exports = function (grunt) {
	function merge (path, files, resolve) {
		const regex = /(^|[ \r\n]*)(import[^;]*;[ \r\n]*|export (default )?|module.exports = )/g;

		grunt.file.write(path, files.map(path => {
			const file = grunt.file.read(path).replace(regex, '');

			if (!resolve) {
				return file;
			}

			return resolve(file, path.match(/[^.\/]+(?=\.[^\/]+$)/)[0]);
		}).join('\n'));
	}

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		babel: {
			stew: {
				files: {
					'dist/stew.min.js': 'dist/stew.min.js'
				}
			},
			preview: {
				files: {
					'preview/preview.min.js': 'preview/preview.min.js'
				}
			}
		},
		uglify: {
			stew: {
				options: {
					banner: [
						'/*! ',
						'<%= pkg.name %> ',
						'<%= grunt.template.today("yyyy-mm-dd") %> ',
						'*/'
					].join('')
				},
				files: {
					'dist/stew.min.js': 'dist/stew.min.js'
				}
			},
			preview: {
				files: {
					'preview/preview.min.js': 'preview/preview.min.js'
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-babel');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('before', () => {
		merge('./dist/stew.min.js', [
			'./src/parse.js',
			'./src/populate.js',
			'./src/stitch.js',
			'./src/evaluate.js',
			'./src/stew.js',
		]);
	});

	grunt.registerTask('after', function () {
		const path = './dist/stew.min.js';

		grunt.file.write(path, `(function () {
			${grunt.file.read(path)}
			if (typeof module !== 'undefined' && module.exports) {
				module.exports = stew;
			} else if (typeof window !== 'undefined') {
				window.stew = stew;
			}
		})();`);
	});

	grunt.registerTask('preview', function () {
		const stew = require('./dist/stew.min');

		const components = [
			'./preview/carousel.html'
		];

		components.forEach(path => {
			const template = stew(grunt.file.read(path));
			const file = `module.exports = ${JSON.stringify(template)};`;

			grunt.file.write(path.replace(/\.html$/, '.min.js'), file);
		});

		merge('./preview/preview.min.js', [
			'./preview/carousel.min.js',
			'./preview/preview.js',
		], (file, name) => {
			if (name === 'preview') {
				return file;
			}
			
			return `const ${name} = ${file}`;
		});
	});

	grunt.registerTask('default', [
		'before',
		'babel:stew',
		'after',
		'uglify:stew',
		'preview',
		'babel:preview',
		'uglify:preview'
	]);
};
