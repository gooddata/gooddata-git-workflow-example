const fs = require('fs/promises');
const path = require('path');
const yml = require('yaml');
const util = require('util');
const glob = util.promisify(require('glob'));

// Ideally, should look for cwd or any parent folder that contains package.json
const projectRoot = process.cwd();

const environment = process.argv.includes('--production') ? 'production' : 'development';

const getVariables = async (environment) => {
	const [pub, priv] = await Promise.all([
		fs.readFile(path.join(projectRoot, 'http-client.env.json'), 'utf8'),
		fs.readFile(path.join(projectRoot, './http-client.private.env.json'), 'utf8'),
	]);

	return Object.assign(
		JSON.parse(pub)[environment] || {},
		JSON.parse(priv)[environment] || {},
	);
};

const replaceVars = (o, vars) => {
	Object.keys(o).forEach(key => {
		if (typeof o[key] === 'string') {
			o[key] = o[key].replace(/\{\{([^}]+)}}/g, (match, capture) => {
				const varName = capture.trim();

				if (varName in vars) {
					return vars[varName];
				}

				return match;
			});
		} else if (typeof o[key] === 'object' && o[key] !== null) {
			replaceVars(o[key], vars); // go deeper recursive
		}
	});
};

const processFile = async (filePath) => {
	const contents = yml.parse(await fs.readFile(filePath, 'utf8'));
	const isEntity = filePath.endsWith('entity.yml'); // TODO need a better way to distinguish entities

	replaceVars(contents, await getVariables(environment));

	const contentsJson = JSON.stringify(isEntity ? {data: contents} : contents, null, '  ');
	const newFilePath = filePath
		.replace(`${path.sep}definitions${path.sep}`, `${path.sep}json${path.sep}`)
		.replace(/\.yml$/, '.json');

	await fs.mkdir(path.dirname(newFilePath), {recursive: true});
	await fs.writeFile(newFilePath, contentsJson);
};

const main = async () => {
	const items = await glob(path.join(projectRoot, 'definitions', '**', '*.yml'));

	await Promise.all(items.map(processFile));
};

main()
	.then(() => {
		console.log('JSON files generated')
	})
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
