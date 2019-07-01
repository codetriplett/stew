module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		babel: {
			dist: {
				files: {
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
			'./src/parse.js',
			'./src/populate.js',
			'./src/render.js',
			'./src/stew.js'
		].map(path => grunt.file.read(path).replace(regex, '')).join('\n'));
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

	grunt.registerTask('default', ['before', 'babel', 'after', 'uglify']);
};
