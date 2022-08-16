# GoodData declarative definitions

This repo contains a set of Python scripts that you can use to manage
[GoodData.CN](https://www.gooddata.com/developers/cloud-native/) and GoodData Cloud workspaces in a declarative way.
Here is when you might want to use it:

* Version Control System (e.g. Git) integration for versioning, collaboration, CI/CD etc.
* Moving metadata between different environments (e.g. production, staging, development).

## Quick start

This project is built using [GoodData Python SDK](https://gooddata-sdk.readthedocs.io/). Make sure you have Python 3.7 or newer on your machine.

In terminal, navigate to the root folder of this repository and run `python -m pip install -r requirements.txt`.
This will install all necessary dependencies for the CLI scripts that we are going to use.

This repository contains two scripts that you can run to sync between declarative definitions in the local files and
GoodData.CN or GoodData Cloud server.

* [`scripts/pull.py`](./scripts/pull.py) will fetch all data sources, workspaces and user groups from GoodData server and store it in YAML files under `gooddata_layouts`.
* [`scripts/push.py`](./scripts/push.py) will load all YAML files from `gooddata_layouts` folder and push them to your GoodData server instance.

Given you have [GoodData.CN Docker image](https://hub.docker.com/r/gooddata/gooddata-cn-ce/) running at `http://localhost:3000`,
you can simply execute in your console:

```shell
python ./scripts/push.py`
```

The script will push the metadata from `gooddata_layouts` folder to your GoodData.CN server. You should see newly created assets in your
browser if you navigate to [http://localhost:3000](http://localhost:3000).

> Note, this is a destructive operation. Any data source configurations, workspaces or user groups that you might have on GoodData.CN
> will be deleted. Consider running a fresh GoodData.CN instance for this test.

We are using GoodData.CN built-in Postgres server with [an example database](https://www.gooddata.com/developers/cloud-native/doc/hosted/getting-started/connect-data/#example-database) for this setup.
If you want to try this out with GoodData Cloud, you'll need to update [the data source configuration](./gooddata_layouts/default/data_sources/demo_ds/demo_ds.yaml)
to point to our [Snowflake demo setup](https://www.gooddata.com/developers/cloud-native/doc/cloud/getting-started/connect-data/#example-database), as GoodData Cloud does not have a built-in Postgres server.

## Folder structure

* [`gooddata_layouts`](./gooddata_layouts) folder contains an example definitions that you can use as a starting point.
* [`scripts`](./scripts) folder contains Python scripts to handle metadata sync between `gooddata_layouts` folder and GoodData server.
* [`.github/workflows/cd.yaml`](.github/workflows/cd.yaml) contains an example CD pipeline that updates production server every time there is a new commit to master branch of this repository.

## Configuration

We are using environment variables to pass all necessary info to the Python scripts.

* `GD_HOST` - A URL of your GoodData server instance, including protocol and port. For example, `https://example.gooddata.com` or `http://localhost:300`.
* `GD_TOKEN` - A Token to be used to authenticate with GoodData server. [You can obtain the token from GoodData web UI](https://www.gooddata.com/developers/cloud-native/doc/hosted/getting-started/create-api-token/).
* `GD_CREDENTIALS` - A path to the file with data source passwords and tokens. Read more about the file purpose and format below. Defaults to `credentials.${GD_ENV}.yaml`.
* `GD_ENV` - Optional, an environment name to use for autoloading env variables. Defaults to `development`. See description below.

### `.env.*` files

While it's perfectly fine to fill the env variables every time you need to pull or push the metadata, it is
much more convenient to store these variables into files, specially if you need to pull / push between different
GoodData server instances.

Our Python scripts support loading variables from the `.env` files. By default, the script will check if there is a
`.env.development` file in the project root and if it's there - load the variables from file. You can create more of
such `.env.*` files (`.env.production`, `.env.staging` etc.) and switch between them by defining `GD_ENV` variable.

For example, if you have defined `.env.development` and `.env.production` and want to propagate changes from dev to prod
env, you could run the following commands:

```shell
python ./scripts/pull.py # "development" is the default GD_ENV
GD_ENV=production python ./scripts/push.py # explicitly select production env
```

Refer to [`.env.development`](./.env.development) for an example.

> We do not recommend putting your env files to version control system or otherwise share them publicly, as they
> may contain credentials, such as GoodData.CN API Token. We are including `.env.development` here as
> an example because it contains a well-known default GoodData.CN token.

### Credential files

`GD_CREDENTIALS` env variable contains a path to the file where your data source credentials are stored. You can either
provide the variable explicitly, or it will be derived from the `GD_ENV` as `credentials.${GD_ENV}.yaml`.

For example, if your environment is set to `development`, autogenerated `GD_CREDENTIALS` path would be `credentials.development.yaml`.

Contents of the credentials file look like this:

```yaml
data_sources:
  data_source_1: passwd
  data_source_2: ./path/to/big_query/token.json
```

Every entry in the `data_sources` object consists of the data source id as a key and either a password or a path to the JSON token (for BigQuery database).

> Since credential files contain sensitive data, make sure not to put the contents of the file to the version control system.
> Consider removing `!credentials.development.yaml` line from `.gitignore` once you start using the setup with your own data sources.

## CI/CD pipelines

You can find an example of the CI/CD pipeline in the [`.github/workflows/cd.yaml`](.github/workflows/cd.yaml) file.
The configuration is rather simple. Every time there a new commit to the master branch, GitHub Actions will execute
`python ./scripts/push.py` to push the new changes to the **production** server.

Using our configuration file as an example, you can set up any other pipeline (CircleCI, Bitbucket Pipelines, Jenkins etc.).
Few steps to keep in mind:

1. Configure your pipeline to be executed on every commit to the main branch.
2. Make sure that the environment you're running in supports Python 3.7+ (e.g. by specifying the correct Docker image for your pipeline).
3. Checkout repo on the master branch and navigate to the project root folder.
4. Install Python dependencies by executing `python -m pip install -r requirements.txt`.
5. Ensure environment variables are defined according to the docs above. Make sure to use best practices for storing credentials for your pipeline. For example, in GitHub we are using Secrets to store data source credentials.
6. Execute `python ./scripts/push.py` to push new changes to the production server.

> NOTE. Current setup will override any changes done on production server through our Web UI. If you want to allow some
> level of self-service to your users, you would need to define a more complex workflow. With some scripting, it should
> be relatively easy to verify if there are changes on server since last upload. Then, you can either notify a more
> technical user about the need to merge changes or even do that automatically to some extent.

## How do I...

### ...start using Git workflow for my project

* Make sure the environment is prepared according to the [instruction above](#configuration).
* Remove the `gooddata_layouts` folder completely.
* Run `python ./scripts/pull.py` command. Make sure you've selected the correct environment with `GD_ENV` variable.

The script will create `gooddata_layouts` folder and populate it with corresponding YAML files. Next, you can commit the new definitions to you VCS.

### ...track users with declarative definitions

By default, we only include feeds for the user groups management into the `.http` files. That's because we expect you
to have a different set of users on your dev, QA and production environment anyway. On top of that, storing user in VCS
might not be the best idea, as this is the data that changes rather often in most cases.

However, if you only manage a handful of predefined users and have the same SSO provider on all your environments,
you can edit python scripts to sync users. For example, in [`pull.py`](./scripts/pull.py) you can add the following
line into `main` function after the line that loads user groups:

```python
sdk.catalog_user.store_declarative_users(temp_path)
```

And a similar snippet has to be added to [`push.py`](./scripts/push.py):

```python
sdk.catalog_user.load_and_put_declarative_users(temp_path)
```

## Known limitations

This project is set up to manage all of your metadata at once. If you want to handle only a subset of your workspaces
or have different data sources for different environments, you would have to edit Python scripts accordingly.

Refer to [Python SDK documentation](https://gooddata-sdk.readthedocs.io/en/latest/index.html) for more details.

---

*Copyright 2022 GoodData Corporation. For more information, please see [LICENSE](./LICENSE).*
