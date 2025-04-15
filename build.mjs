import packageJson from './package.json' assert { type: 'json' };
import { build, analyzeMetafile } from 'esbuild';

const { version } = packageJson;

const config = {
	entryPoints: ['src/index.js'],
	legalComments: 'linked',
	banner: {
		js: `//@triplett/stew@v${version}`,
	},
	bundle: true,
	minify: true,
	metafile: true
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

console.log(await analyzeMetafile(jsInfo.metafile));
console.log(await analyzeMetafile(mjsInfo.metafile));
