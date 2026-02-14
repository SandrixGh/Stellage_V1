from typing import Any

from pydantic import BaseModel


def pact_to_json(data: BaseModel) -> str:
    return data.model_dump_json()

def unpack_from_json(
    json_str: str,
    schema: type[BaseModel]
) -> Any:
    return schema.model_validate(json_str)