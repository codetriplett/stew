import { task } from '../task';

describe('task', () => {
	const registerTask = jest.fn();
	const config = jest.fn();
	const expandMapping = jest.fn();
	const read = jest.fn();
	const write = jest.fn();
	let grunt;

	function prepare (mock, value) {
		mock.mockClear();
		
		if (typeof value === 'function') {
			mock.mockImplementation(value);
		} else if (value !== undefined) {
			mock.mockReturnValue(value);
		}
	}

	beforeEach(() => {
		prepare(registerTask, (name, callback) => callback.call({ name }));
		prepare(config, [{ cwd: 'src/', src: '*.js', dest: 'dist/' }]);
		prepare(expandMapping, [{ src: '/src/abc.js', dest: '/dist/abc.js' }]);
		prepare(read, '<div>abc</>');
		prepare(write);

		grunt = {
			registerTask,
			config,
			file: {
				expandMapping,
				read,
				write
			}
		};
	});

	it('processes files', () => {
		task(grunt);
		
		expect(registerTask).toHaveBeenCalled();

		expect(write).toHaveBeenCalledWith(
			'/dist/abc.js',
			'{"":["","div",["abc"]]}'
		);
	});
});
