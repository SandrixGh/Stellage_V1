from typing import NamedTuple


class CreateTokenTuple(NamedTuple):
    encoded_jwt: str
    session_id: str