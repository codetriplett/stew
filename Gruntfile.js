const stew = require('./lib/stew');

module.exports = function (grunt) {
	function merge (path, files, resolve) {
		const lib = path.startsWith('./lib/');
		const regex = lib ? /^/ : /(^|[ \r\n]*)(import[^;]*;[ \r\n]*|export (default )?|module.exports = )/g;

		grunt.file.write(path, files.map(path => {
			let file = grunt.file.read(path).replace(regex, '');

			if (!resolve) {
				return file;
			}

			return resolve(file, path.match(/[^.\/]+(?=\.[^\/]+$)/)[0]);
		}).join('\n'));
	}

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		babel: {
			main: {
				files: {
					'dist/stew.min.js': 'dist/stew.min.js',
					'lib/parse.js': 'src/parse.js',
					'lib/grunt.js': 'src/grunt.js',
					'lib/fetch.js': 'src/fetch.js',
					'lib/evaluate.js': 'src/evaluate.js',
					'lib/modify.js': 'src/modify.js',
					'lib/traverse.js': 'src/traverse.js',
					'lib/render.js': 'src/render.js',
					'lib/stew.js': 'lib/stew.js',
				}
			}
		},
		uglify: {
			main: {
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
			}
		},
		stew: {
			main: {
				files: [
					{
						cwd: 'preview/',
						src: '**/*.stew',
						dest: 'preview/'
					}
				]
			}
		}
	});

	grunt.loadNpmTasks('grunt-babel');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('before', () => {
		merge('./dist/stew.min.js', [
			'./src/parse.js',
			'./src/fetch.js',
			'./src/evaluate.js',
			'./src/modify.js',
			'./src/traverse.js',
			'./src/render.js',
			'./src/stew.js',
		]);
		
		merge('./lib/stew.js', [
			'./src/stew.js',
		], file => {
			return file.replace(
				/(?=export default )/,
				'export { grunt } from \'./grunt\';\n\n'
			);
		});
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

	stew.grunt(grunt);

	grunt.registerTask('default', [
		'before',
		'babel',
		'after',
		'uglify',
		'stew',
	]);
};
