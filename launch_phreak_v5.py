import asyncio
from phreak_v5 import PhreakControlTower
from phreak_v5.core.connection import LoopbackConnector
from phreak_v5.models import CommandRequest, Device

async def main():
    tower = PhreakControlTower()
    tower.bootstrap()  # Creates ~/.phreak folders, vault, and audit log.

    device = Device(device_id="demo-01", connection_uri="loop://demo")
    tower.register_devices([device])
    tower.connection_matrix.bind_connector("demo-01", LoopbackConnector())

    request = CommandRequest(
        action="hello_world",
        device_ids=("demo-01",),
        arguments={"greeting": "Howdy"},
        requested_by="friendly-operator",
    )

    await tower.dispatch(request)

if __name__ == "__main__":
    asyncio.run(main())
