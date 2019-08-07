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
			stew: {
				files: {
					'dist/stew.min.js': 'dist/stew.min.js',
					'lib/parse.js': 'src/parse.js',
					'lib/grunt.js': 'src/grunt.js',
					'lib/populate.js': 'src/populate.js',
					'lib/evaluate.js': 'src/evaluate.js',
					'lib/traverse.js': 'src/traverse.js',
					'lib/stitch.js': 'src/stitch.js',
					'lib/stew.js': 'lib/stew.js',
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
			'./src/traverse.js',
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

	grunt.registerTask('preview', function () {
		merge('./preview/preview.min.js', [
			'./preview/carousel.js',
			'./preview/accordion.js',
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
		'stew',
		'preview',
		'babel:preview',
		'uglify:preview'
	]);
};
