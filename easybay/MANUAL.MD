## Launching the Control Tower

The quickest way to prove everything works is to bootstrap the control tower and register a loopback device. Drop the following snippet into a file named `launch_phreak_v5.py` inside the repository root:

```python
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
```

Then launch it:

```bash
python launch_phreak_v5.py
```

What happens:

- `PhreakControlTower()` builds every subsystem and exposes them via the `components` property if you need direct access later. 【F:phreak_v5/__init__.py†L31-L151】
- `bootstrap()` ensures every storage path exists, initializes the audit log, vault, and emits a telemetry event announcing the first run. 【F:phreak_v5/__init__.py†L173-L186】
- `register_devices()` drops the device into the connection matrix and device graph, generating audit entries and telemetry events. 【F:phreak_v5/__init__.py†L115-L137】【F:phreak_v5/core/connection.py†L62-L79】
- Binding the `LoopbackConnector` gives the demo device an echo transport so commands succeed without hardware. 【F:phreak_v5/core/connection.py†L27-L59】【F:phreak_v5/core/connection.py†L81-L116】
- `dispatch()` pushes a structured `CommandRequest` through the policy engine and command router; results are logged and emitted on the telemetry bus. 【F:phreak_v5/__init__.py†L152-L172】【F:phreak_v5/core/router.py†L1-L120】【F:phreak_v5/telemetry.py†L20-L59】

You should see the script exit quietly. Check `~/.phreak/audit.log.jsonl` to confirm the command was recorded.

---

## 5. Watching the Telemetry Stream

The telemetry bus is lightweight but powerful. Add this snippet to the end of your script if you want to observe events in real time:

```python
    async def printer(event):
        print(f"[{event.topic}] {event.payload}")

    tower.telemetry.subscribe("*", printer)
```

Every audit or device event (registrations, command completions, policy rejections) will now print to your console as the control tower runs. 【F:phreak_v5/telemetry.py†L12-L59】【F:phreak_v5/core/connection.py†L70-L116】

---

## 6. Connecting Real Devices

When you're ready to graduate from loopback mode:

1. Replace the demo `Device` with real metadata, e.g. `Device(device_id="pixel-7", connection_uri="adb://USB:pixel-7")`.
2. Implement or import a proper connector that speaks ADB/Fastboot and bind it just like the loopback version. The `DeviceConnector` protocol shows the async `execute()` signature your adapter should expose. 【F:phreak_v5/core/connection.py†L15-L38】
3. Extend the policy engine with rules to keep your lab safe, then register them via the `PhreakControlTower` constructor.
4. Layer on presentation surfaces: the `CursesControlRoom` already subscribes to device and command topics so you can iterate on a TUI quickly. 【F:phreak_v5/presentation/curses_ui.py†L12-L52】

---

## 7. Next Steps & Happy Path

- **Explore services:** The `phreak_v5.services` package includes registry, firmware, forensics, backup, ML, and plugin managers ready to script against. 【F:phreak_v5/__init__.py†L99-L151】
- **Automate:** Use `dispatch_batch()` to run commands against device cohorts once your graph is populated. 【F:phreak_v5/__init__.py†L166-L172】
- **Secure secrets:** Store ADB keys in the `SecurityVault` with `store_secret()` and retrieve them via `load_secret()` when connectors spin up. 【F:phreak_v5/__init__.py†L188-L198】
- **Keep smiling:** The control tower is designed for experimentation, so don’t hesitate to customize policies, connectors, and telemetry subscribers to match your lab’s vibe.

Enjoy exploring PHREAK v5—your friendly launchpad to a fully orchestrated Android fleet!
