---
description: Create seamless video loops, animated backgrounds, and title sequences with frame interpolation and Veo
---

Run the motion-graphics skill. Define the motion purpose (ambient, transition, emphasis, or narrative), run `gflow doctor`, generate a start frame and a subtle end-frame variation with gflow-cli (inheriting `--project <brand>` if a brand exists), interpolate them into a loop with `gflow video --start-frame --end-frame --model veo-3.1-quality`, validate that the first and last frames match for a seamless loop and regenerate if it jumps, then batch additional resolutions, optionally grow longer title sequences or backgrounds with `gflow extend` (repeated `--prompt` or `--add-clip`) when one generation is not enough, and run the full quality gate before delivering. Execute every gflow command with one shared `--project <name>` for the run (the brand project if one exists) and `--no-headed`; only `gflow auth login` runs headed.
