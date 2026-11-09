import { forwardRef } from 'react';

const ThreeCanvas = forwardRef<HTMLDivElement>(function ThreeCanvas(_, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        // A matte, low-saturation backdrop keeps the bright brick colors legible
        // without making a phone camera expose for a near-white host background.
        background: 'radial-gradient(circle at 50% 32%, #425466 0%, #263746 52%, #111923 100%)',
      }}
    />
  );
});

export default ThreeCanvas;
