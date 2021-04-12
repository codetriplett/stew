module.exports = function (grunt) {
	function merge (path, files, resolve) {
		const regex = /(^|[ \r\n]*)(import[^;]*;[ \r\n]*|export (default )?|module.exports = )/g;

		grunt.file.write(path, files.map(path => {
			const file = grunt.file.read(path).replace(regex, '');
			if (!resolve) return file;
			return resolve(file, path);
		}).join('\n'));
	}

	function direct (name) {
		return `if (typeof define === 'function' && define.amd) {
			define(function () { return ${name}; });
		} else if (typeof module !== 'undefined' && module.exports) {
			module.exports = ${name};
		} else if (typeof window === 'object' && window.document) {
			window.${name} = ${name};
		}`;
	}

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		babel: {
			main: {
				files: {
					'dist/stew.min.js': 'dist/stew.min.js'
				}
			}
		},
		uglify: {
			main: {
				options: {
					banner: [
						'/*',
						' <%= pkg.name %>',
						' v<%= pkg.version %>',
						' */'
					].join('')
				},
				files: {
					'dist/stew.min.js': 'dist/stew.min.js'
				}
			}
		},
		copy: {
			main: {
				expand: true,
				cwd: 'dist/',
				src: 'stew.min.js',
				dest: 'preview/',
				flatten: true
			}
		}
	});

	grunt.loadNpmTasks('grunt-babel');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('before', () => {
		merge('./dist/stew.min.js', [
			'./src/create/create-ctx.js',
			'./src/create/create-elm.js',
			'./src/create/create-txt.js',
			'./src/manage/forget.js',
			'./src/manage/locate.js',
			'./src/manage/parse.js',
			'./src/manage/reconcile.js',
			'./src/manage/trigger.js',
			'./src/server/escape.js',
			'./src/server/flatten.js',
			'./src/server/index.js',
			'./src/update/update-ctx.js',
			'./src/update/update-elm.js',
			'./src/update/update-txt.js',
			'./src/client.js',
			'./src/index.js',
		]);
	});

	grunt.registerTask('after', function () {
		const path = './dist/stew.min.js';

		grunt.file.write(path, `(function () {
			${grunt.file.read(path)}
			${direct('stew')}
		})();`);
	});

	grunt.registerTask('default', [
		'before',
		'babel',
		'after',
		'uglify',
		'copy'
	]);
};
