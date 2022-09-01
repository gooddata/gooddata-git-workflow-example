#!/usr/bin/env python
# (C) 2022 GoodData Corporation
import os
from gooddata_sdk import GoodDataSdk
from pathlib import Path
from dotenv import load_dotenv

def main():
    # Get current environment, defaulting to "development"
    environment = os.getenv("GD_ENV", "development")

    # Load corresponding env variables from file, if exists
    load_dotenv(f".env.{environment}")

    # Get all the necessary arguments from environment
    host = os.getenv("GD_HOST")
    if host is None:
        raise RuntimeError("GD_HOST environmental variable must be defined")

    token = os.getenv("GD_TOKEN")
    if token is None:
        raise RuntimeError("GD_TOKEN environmental variable must be defined")

    credentials_path = os.getenv("GD_CREDENTIALS", f"credentials.{environment}.yaml")
    if not Path(credentials_path).exists():
        raise RuntimeError(f"Credentials file does not exist, trying to load from {credentials_path}")

    test_data_sources = os.getenv("GD_TEST_DATA_SOURCES", "True").lower() in ("true", "t", "1", "yes", "y")

    root_path = Path.cwd()

    sdk = GoodDataSdk.create(host, token)

    # Make sure the GoodData server is running
    if not sdk.support.is_available:
        raise RuntimeError(f"GoodData server at {host} is unavailable")

    # Push data sources and PDM
    sdk.catalog_data_source.load_and_put_declarative_data_sources(root_path, credentials_path, test_data_sources)

    # Push user groups
    sdk.catalog_user.load_and_put_declarative_user_groups(root_path)

    # Push workspaces
    sdk.catalog_workspace.load_and_put_declarative_workspaces(root_path)

    print(f"Pushed definitions to {host}")

if __name__ == "__main__":
    main()
