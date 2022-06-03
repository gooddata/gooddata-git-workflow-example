const fsSync = require('fs');
const fs = require('fs/promises');
const path = require('path');
const yml = require('yaml');

const injectPlaceholdersFile = async (json, filePath) => {
	// Only do this for dataSources for now
	// TODO Ideally we should preserve placeholders everywhere, needs more research
	if (json.type !== 'dataSource')
		return;

	try {
		const oldYaml = await fs.readFile(filePath, 'utf8');
		const oldJson = yml.parse(oldYaml);

		Object.keys(oldJson.attributes).forEach(attr => {
			if (/{{([^}]+)}}/g.test(oldJson.attributes[attr])) {
				// There is a variable in the old value, keep it
				json.attributes[attr] = oldJson.attributes[attr];
			}
		});
	} catch(e) {
		// Nothing to do if the old file does not exist
	}
};

const main = async () => {
	const json = JSON.parse(fsSync.readFileSync(process.stdin.fd).toString());

	if (json.failedRequests > 0) {
		throw new Error('Failed to run some of the requests. Make sure your pull.http file is defined correctly and environment variables are set.');
	}

	if (json.totalRequests < 1) {
		console.log('No requests were executed');
		return;
	}

	json.requests.forEach(item => {
		if (item.response.statusCode !== 200) {
			throw new Error(`Request to ${item.response.request.url} resulted in status code ${item.response.statusCode}.`);
		}
	});

	await Promise.all(json.requests.map(async item => {
		const url = item.response.request.url;
		const isEntity = url.includes('/api/entities/');
		const filePath = path.join(process.cwd(), 'definitions', ...url.replace(/.+\/api\/(entities|layout)/i, '').split('/')) + `${isEntity ? path.sep + 'entity' : ''}.yml`;
		const parsedBody = JSON.parse(item.response.body);
		const body = isEntity ? parsedBody.data : parsedBody;

		// Inject placeholders from previous version of the file, if any
		// TODO we also might want to preserve the properties order
		// 	and define some default order (e.g. pull `id` and `name` to the top of the list)
		await injectPlaceholdersFile(body, filePath);

		const yamlBody = yml.stringify(body);

		await fs.mkdir(path.dirname(filePath), {recursive: true});
		await fs.writeFile(filePath, yamlBody);
	}));
};

main()
	.then(() => {
		console.log('YAML files generated')
	})
	.catch(err => {
		console.error(err);
		process.exitCode = 1;
	});
