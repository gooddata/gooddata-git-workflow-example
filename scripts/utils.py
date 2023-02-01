# (C) 2022 GoodData Corporation
import os
from gooddata_sdk import GoodDataSdk

def get_mandatory_env_var(key: str) -> str:
    try:
        return os.environ[key]
    except KeyError:
        raise RuntimeError(f"{key} environmental variable must be defined")

def get_gooddata_sdk() -> GoodDataSdk:
   host = get_mandatory_env_var("GD_HOST")
   token = get_mandatory_env_var("GD_TOKEN")

   sdk = GoodDataSdk.create(host, token)

   # Make sure the GoodData server is running
   if not sdk.support.is_available:
       raise RuntimeError(f"GoodData server at {host} is unavailable")

   return sdk
