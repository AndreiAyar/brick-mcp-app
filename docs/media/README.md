# README media

The new banner and first three demos use frames from the author's film, [O alternativă la LEGO](https://www.youtube.com/shorts/fk6eMfdpXWc). The supplied source is 2160 × 3840 at 24 fps. Frames were extracted with FFmpeg at their original pixel dimensions and 24 fps, then cropped and composed in Remotion 4.0.542.

| Asset | Contents | Duration |
| --- | --- | --- |
| `banner-lego.png` | Coral/charcoal layout with a real frame of the physical and virtual models | Still |
| `01-house.gif` | First house beside its expansion | 7.5 s |
| `02-iron-man.gif` | First free-form attempt beside the later model-guided build | 7.5 s |
| `03-build-together.gif` | Physical assembly, then the original camera reveal of both models | 9 s |
| `04-mcp-workflow.gif` | Prepare, inspect, place, and read the scene | 9 s |
| `video-poster.png` | Clickable cover linking to the original YouTube film | Still |

The house uses footage around 00:15.9–00:18 and 00:23.5–00:26.5. The first attempt uses 00:34.4–00:38.1. Physical assembly uses 01:24–01:26.8, followed by the camera movement at 01:44–01:50.8 that reveals the physical Iron Man in front of the model on the monitor. That reveal is real footage, played faster, not a synthetic model animation. The comparison still is from 01:50. Views in the side-by-side comparisons come from different moments in the same experiment.

The technical animation uses actual HTTP MCP responses from [a fictional three-part fixture](../examples/three-bricks.lxfml), with [a small mapping](../examples/three-bricks-mapping.xml). It simplifies the JSON for readability and omits transient session identifiers. It does not run an AI model or reproduce the original Iron Man model. The counters are server results, not invented performance metrics.

Labels, arrows, fades, and the comparison layout are explanatory additions. They are not built-in app interfaces or effects. No generated replacement model or synthetic application output is used.

The editable Remotion project, extracted full-resolution frames, installed authoring dependencies, render scripts, review frames, and 4K H.264 masters are kept outside this application repository. GIFs use 24 fps, an indexed palette, and infinite looping. The house, comparison, and technical clips are 1200 × 675; the original camera reveal is preserved vertically at 540 × 960. The full-resolution source remains available for future reframing.

The original `media/ext-apps-bricks.gif` and `media/emp-state.png` are retained without changes. The repository's MIT [license](../../LICENSE) is unchanged; this documentation does not change third-party media or trademark rights.
