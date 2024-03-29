#!/usr/bin/env python
# (C) 2022 GoodData Corporation
import os, shutil, tempfile
from pathlib import Path
from dotenv import load_dotenv
from utils import get_gooddata_sdk

# TODO "gooddata_layouts" should be imported from the lib
LAYOUT_ROOT_FOLDER = "gooddata_layouts"

def main():
    # Get current environment, defaulting to "development"
    environment = os.getenv("GD_ENV", "development")

    # Load corresponding env variables from file, if exists
    load_dotenv(f".env.{environment}")

    layout_path = Path.cwd() / LAYOUT_ROOT_FOLDER

    sdk = get_gooddata_sdk()

    # Load new MD to a temp path. This way, if something goes wrong we will
    # still have at least old MD. Also, drop the old MD before copying so that
    # MD deleted on server is also deleted from declarative layout
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)

        # Pull data sources and PDM
        sdk.catalog_data_source.store_declarative_data_sources(temp_path)

        # Pull user groups
        sdk.catalog_user.store_declarative_user_groups(temp_path)

        # Pull workspaces
        sdk.catalog_workspace.store_declarative_workspaces(temp_path)

        # It seems the pull went OK, we can now drop original folder
        if layout_path.exists():
            shutil.rmtree(layout_path)

        # and copy staff from temp folder
        shutil.copytree(temp_path / LAYOUT_ROOT_FOLDER, layout_path)

    print(f"Pulled definitions to {layout_path}")

if __name__ == "__main__":
    main()
