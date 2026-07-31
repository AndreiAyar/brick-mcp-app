import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { useApp, useHostStyles } from '@modelcontextprotocol/ext-apps/react';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SceneData, CameraState } from './types';
import BrickBuilder from './components/BrickBuilder';
import './global.css';

function parseScenePayload(result: CallToolResult): { scene?: SceneData; camera?: CameraState; message?: string } | null {
  const textContent = result.content?.find((c) => c.type === 'text');
  if (!textContent || !('text' in textContent)) return null;
  try {
    return JSON.parse(textContent.text as string);
  } catch {
    return null;
  }
}

interface PlacementSceneUpdate {
  revision: number;
  type: 'placement';
  brick: SceneData['bricks'][number];
  brickType?: NonNullable<SceneData['dynamicTypes']>[string];
}

interface SnapshotSceneUpdate {
  revision: number;
  type: 'snapshot';
  scene: SceneData;
}

type SceneUpdate = PlacementSceneUpdate | SnapshotSceneUpdate;

interface SceneUpdatesPayload {
  revision: number;
  scene?: SceneData;
  updates?: SceneUpdate[];
}

function parseSceneUpdates(result: CallToolResult): SceneUpdatesPayload | null {
  const textContent = result.content?.find((c) => c.type === 'text');
  if (!textContent || !('text' in textContent)) return null;
  try {
    return JSON.parse(textContent.text as string);
  } catch {
    return null;
  }
}

function BrickApp() {
  const [sceneData, setSceneData] = useState<SceneData | null>(null);
  const [cameraState, setCameraState] = useState<CameraState | null>(null);
  const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
  const sceneUpdateQueue = useRef<SceneUpdate[]>([]);

  // Central handler for ALL tool results — both host-initiated and app-initiated
  const handleToolResult = useCallback((result: CallToolResult) => {
    const payload = parseScenePayload(result);
    if (!payload) return;
    if (payload.scene) {
      setSceneData(payload.scene);
    }
    if (payload.camera) {
      setCameraState(payload.camera);
    }
  }, []);

  const onAppCreated = useCallback((app: App) => {
    app.ontoolresult = async (result: CallToolResult) => {
      handleToolResult(result);
    };

    app.onerror = console.error;

    app.onhostcontextchanged = (ctx: McpUiHostContext) => {
      setHostContext((prev) => ({ ...prev, ...ctx }));
    };

    app.onteardown = async () => ({ });
  }, [handleToolResult]);

  const { app, error } = useApp({
    appInfo: { name: 'Brick Builder', version: '1.0.0' },
    capabilities: { availableDisplayModes: ['inline', 'fullscreen'] },
    onAppCreated,
  });

  useHostStyles(app ?? null);

  useEffect(() => {
    if (!app) return;
    setHostContext(app.getHostContext());
    app.requestDisplayMode({ mode: 'fullscreen' }).catch(() => {});
  }, [app]);

  // Fetch compact scene changes from LLM tool calls. Placement updates are
  // queued and rendered one by one, even when one MCP call places a full batch.
  useEffect(() => {
    if (!app) return;
    let active = true;
    let afterRevision: number | undefined;
    let timeout: number | undefined;

    const poll = async () => {
      try {
        const result = await app.callServerTool({
          name: 'brick_get_scene_updates',
          arguments: afterRevision === undefined ? {} : { afterRevision },
        });
        if (!active) return;
        const payload = parseSceneUpdates(result);
        if (payload) {
          afterRevision = payload.revision;
          if (payload.scene) {
            sceneUpdateQueue.current = [];
            setSceneData(payload.scene);
          }
          if (payload.updates?.length) {
            sceneUpdateQueue.current.push(...payload.updates);
          }
        }
      } catch { /* ignore */ }
      if (active) timeout = window.setTimeout(poll, 100);
    };

    void poll();
    return () => {
      active = false;
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [app]);

  // A short cadence makes every placement perceptible without slowing down
  // the model-facing tool call that produced the batch.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const update = sceneUpdateQueue.current.shift();
      if (!update) return;
      if (update.type === 'snapshot') {
        setSceneData(update.scene);
        return;
      }
      setSceneData((current) => {
        if (!current) return current;
        const existingIndex = current.bricks.findIndex((brick) => brick.id === update.brick.id);
        const bricks = existingIndex === -1
          ? [...current.bricks, update.brick]
          : current.bricks.map((brick, index) => index === existingIndex ? update.brick : brick);
        const dynamicTypes = update.brickType
          ? { ...(current.dynamicTypes ?? {}), [update.brickType.id]: update.brickType }
          : current.dynamicTypes;
        return { ...current, bricks, ...(dynamicTypes ? { dynamicTypes } : {}) };
      });
    }, 75);
    return () => window.clearInterval(interval);
  }, []);

  // Update model context when scene changes
  useEffect(() => {
    if (!app || !sceneData) return;
    app.updateModelContext({
      content: [{ type: 'text', text: `Brick Builder scene '${sceneData.name}': ${sceneData.bricks.length} bricks` }],
    }).catch(() => {});
  }, [app, sceneData]);

  if (error) {
    return (
      <div style={{ padding: 20, color: '#ff4444' }}>
        <strong>Connection error:</strong> {error.message}
      </div>
    );
  }

  if (!app) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>
        Connecting to host...
      </div>
    );
  }

  return (
    <main
      style={{
        width: '100%',
        height: '100%',
        paddingTop: hostContext?.safeAreaInsets?.top,
        paddingRight: hostContext?.safeAreaInsets?.right,
        paddingBottom: hostContext?.safeAreaInsets?.bottom,
        paddingLeft: hostContext?.safeAreaInsets?.left,
      }}
    >
      <BrickBuilder app={app} sceneData={sceneData} cameraState={cameraState} onToolResult={handleToolResult} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrickApp />
  </StrictMode>,
);
