# Run Brick Builder locally

Use Node.js 20+ and npm 10+. An MCP host with MCP Apps support is needed for the embedded React editor. The included browser harness works without a model or host.

## Install and start

```sh
git clone https://github.com/AndreiAyar/brick-mcp-app.git
cd brick-mcp-app
npm ci
npm run download:ldraw
npm run build
npm run serve
```

The MCP endpoint is `http://localhost:3001/mcp`. Open [the visual harness](http://localhost:3001/test), click **Connect**, and use **Perimeter**, **Random**, or **Tower** to try actual tool calls. The scene is shared with other MCP sessions connected to that server.

`npm run dev` watches the client and server together. `npm start` builds and starts them. `PORT=3002 npm run serve` selects another HTTP port on macOS/Linux; update the harness URL and host connection to match.

See the [original host connection instructions](../README.md#connecting-to-hosts) for HTTP setup. The server also supports stdio via `node dist/index.js --stdio`; embedded app support depends on the host. Keep the process running while using the editor.

## Parts library

`npm run download:ldraw` downloads the official LDraw library into ignored `ldraw/`, then generates `ldraw-parts-index.json`. The committed index enables name search, but it does not contain geometry: real placement and rendering need the downloaded `.dat` files.

`brick_get_available` returns curated parts. `brick_search_parts` searches or browses the full index, and `brick_get_part_info` reads dimensions for one part. IDs are LDraw numbers such as `3001`, not the old `brick_2x4` names. To update the index after changing your local library, run `npm run generate:index`.

## Build through MCP

Connect your host to the endpoint and ask:

> Read the Brick Builder guide and available parts, open the scene, then build a small house. Keep batches small and check placement results.

The core calls are:

| Tool | Use |
| --- | --- |
| `brick_read_me` | Read the coordinate system and building guide |
| `brick_render_scene` | Open the embedded viewer |
| `brick_search_parts` | Find parts by name or category |
| `brick_place` | Place CSV rows: `typeId,x,y,z,rotation,color` |
| `brick_get_scene` | Inspect the current scene and footprints |
| `brick_set_build_mode` | Choose strict or relaxed support checks; optionally enable Y snapping |
| `brick_prepare_lxfml_build` | Prepare a separate guided session |
| `brick_get_lxfml_build_step` | Inspect the cursor and next part |
| `brick_place_lxfml_next` | Place the next part or current instruction step |
| `brick_import_lxfml` | Import a model directly, without walking its steps |
| `brick_export_scene` | Export scene JSON or a readable summary |

For example, `brick_place` accepts:

```json
{
  "bricks": "3001,20,0,20,0,#cc0000\n3001,20,3,20,0,#ffd700"
}
```

Coordinates use studs for X/Z and plate units for Y. Grid placement is validated; exact-transform imports use the model's converted matrices and bypass grid collision/support checks.

## LXFML models and the mapping file

The original Iron Man LXFML is not present in this checkout or the locally available Git history. The footage shows that earlier experiment. Supply your own model to reproduce a full build.

The converter also needs a design/material/correction mapping. This checkout's default path is `imports/generic_iron_studio_v5_lxfml/ldraw.xml`, but the file is absent from the current branch. It exists in commit `69f992d` on the fork's `beta` history. From the repository root, recover it locally with:

```sh
# If that history is not available locally:
git fetch origin beta
mkdir -p imports/generic_iron_studio_v5_lxfml
git show 69f992d:imports/generic_iron_studio_v5_lxfml/ldraw.xml \
  > imports/generic_iron_studio_v5_lxfml/ldraw.xml
```

The path is ignored by Git. Alternatively, pass the raw mapping XML in the `ldrawXml` tool argument. Do not feed unconverted LXFML `Bone` matrices to `brick_place_transform`: the importer applies ID mapping, correction transforms, axis conversion, scaling, and centering.

For a guided build:

1. Call `brick_prepare_lxfml_build` with `lxfmlPath` pointing to a file readable by the **server**, or pass the raw `lxfml` XML. Supply `ldrawXml` if you do not use the default mapping file.
2. Save the returned `sessionId`. Preparation does not modify the scene.
3. Call `brick_get_lxfml_build_step` with that ID to inspect the current step and next part.
4. Call `brick_place_lxfml_next` with the ID and `unit: "part"` or `unit: "step"`. Set `clearBeforeFirstPlace: true` only when you want an empty scene for the first placement.
5. Repeat until `summary.done` is true, then export the scene if you want to keep it.

`brick_import_lxfml` places the full converted model directly. Unmapped or unavailable parts may be skipped; inspect the returned counts. If the XML has no instruction steps, the guided builder puts its parts into one fallback step. Sessions and scenes are held in memory, so restarting the server clears them.

### Small reproducible example

Use [three-bricks.lxfml](examples/three-bricks.lxfml) and [three-bricks-mapping.xml](examples/three-bricks-mapping.xml). These are fictional inputs with three `3001` bricks and three steps, not the Iron Man model.

Pass the example LXFML through `lxfml` or its server-local `lxfmlPath`. For this fixture, use this exact `ldrawXml` argument:

```xml
<LDrawMapping><Brick lego="3001" ldraw="3001.dat"/><Material lego="4" ldraw="4"/><Material lego="24" ldraw="14"/></LDrawMapping>
```

A preparation response reports `steps: 3`, `totalParts: 3`, and `buildableParts: 3`. Three next-part calls produce a scene with three parts. These calls were exercised against the real HTTP server for the README's technical animation; no AI model was invoked for that fixture.

## Troubleshooting

- **Parts search works but placement does not:** download `ldraw/`; the index alone is insufficient.
- **Mapping read error:** restore the historical XML or pass `ldrawXml` explicitly.
- **A supplied model path cannot be read:** paths are resolved on the machine running the MCP server, not the host application's machine.
- **Scene lost after restart:** import an earlier JSON export or prepare the model again. There is no persistence database.
- **Browser harness works but embedded editor does not:** verify the host supports MCP Apps, rebuild the client, and reconnect the host.

The older static-catalog examples in the original README are retained for context. The current part system is LDraw based.
