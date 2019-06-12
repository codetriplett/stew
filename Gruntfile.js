module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		babel: {
			dist: {
				files: {
					'lib/stew.js': 'src/stew.js',
					'dist/stew.min.js': 'dist/stew.min.js'
				}
			}
		},
		uglify: {
			options: {
				banner: [
					'/*! ',
					'<%= pkg.name %> ',
					'<%= grunt.template.today("yyyy-mm-dd") %> ',
					'*/'
				].join('')
			},
			build: {
				src: 'dist/stew.min.js',
				dest: 'dist/stew.min.js'
			}
		}
	});

	grunt.loadNpmTasks('grunt-babel');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('before', () => {
		const regex = /(^|[ \r\n]*)(import[^;]*;[ \r\n]*|export (default )?)/g;

		grunt.file.write('./dist/stew.min.js', [
			'./src/state.js',
			'./src/view.js',
			'./src/stew.js'
		].map(path => grunt.file.read(path).replace(regex, '')).join('\n'));
	});

	grunt.registerTask('after', function () {
		const path = './dist/stew.min.js';
		const file = grunt.file.read(path);
		const root = '\nwindow.stew = stew;\n';

		const amd = [
			'\nif (typeof define === \'function\' && define.amd) {',
				'\n\tdefine(\'stew\', function () { return stew; });',
			'\n}\n\n'
		].join('');

		grunt.file.write(path, `(function () {\n\n${file}${root}${amd}})();`);
	});

	grunt.registerTask('default', ['before', 'babel', 'after', 'uglify']);
};
