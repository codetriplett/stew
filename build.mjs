import packageJson from './package.json' with { type: 'json' };
import { build, analyzeMetafile } from 'esbuild';
import { copy } from 'esbuild-plugin-copy';

const { version } = packageJson;

const config = {
	entryPoints: ['src/stew.js'],
	legalComments: 'linked',
	banner: {
		js: `//@triplett/stew@v${version}`,
	},
	bundle: true,
	minify: true,
	metafile: true,
};

const jsInfo = await build({
	...config,
	footer: {
		js: 'if(typeof window===\'object\'){window.stew=stew.default}else{module.exports=stew.default}',
	},
	outfile: 'dist/stew.min.js',
	format: 'iife',
	globalName: 'stew',
});

const mjsInfo = await build({
	...config,
	outfile: 'dist/stew.min.mjs',
	format: 'esm',
});

const uiInfo = await build({
	entryPoints: ['src/index.js'],
	outfile: 'dist/index.min.js',
	format: 'iife',
	// globalName: 'App',
	// footer: {
	// 	js: 'window.App=App.default',
	// },
	external: ['@triplett/stew'],
	bundle: true,
	minify: true,
	metafile: true,
    plugins: [
		copy({
			resolveFrom: 'cwd',
			assets: {
				from: [
					'./src/server.js',
					'./src/index.css',
					'./src/index.html',
					'./src/index.png',
					'./src/favicon.ico',
				],
				to: ['./dist'],
			},
		}),
	],
});

console.log(await analyzeMetafile(jsInfo.metafile));
console.log(await analyzeMetafile(mjsInfo.metafile));
console.log(await analyzeMetafile(uiInfo.metafile));
