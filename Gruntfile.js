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
					'lib/task.js': 'src/task.js',
					'lib/parse.js': 'src/parse.js',
					'lib/fetch.js': 'src/fetch.js',
					'lib/evaluate.js': 'src/evaluate.js',
					'lib/locate.js': 'src/locate.js',
					'lib/reduce.js': 'src/reduce.js',
					'lib/clean.js': 'src/clean.js',
					'lib/render.js': 'src/render.js',
					'lib/hydrate.js': 'src/hydrate.js',
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
		}
	});

	grunt.loadNpmTasks('grunt-babel');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('before', () => {
		merge('./dist/stew.min.js', [
			'./src/parse.js',
			'./src/fetch.js',
			'./src/evaluate.js',
			'./src/locate.js',
			'./src/reduce.js',
			'./src/clean.js',
			'./src/render.js',
			'./src/hydrate.js',
			'./src/stew.js',
		]);
		
		merge('./lib/stew.js', [
			'./src/stew.js',
		], file => file.replace(
			/(?=export default )/,
			'export { task } from \'./task\';\n\n'
		));
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

	grunt.registerTask('default', [
		'before',
		'babel',
		'after',
		'uglify'
	]);
};
