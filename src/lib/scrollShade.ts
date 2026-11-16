export interface EdgeShadeMetrics {
  edgeProfile: number;
  scaleX: number;
  rotateXDeg: number;
  translateY: number;
  shadeAlpha: number;
  opacity: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Matches the exact semicircular screen-space curvature & depth shading math
 * used in DomSyncWebGL so typography and dark text blocks shade and curl
 * seamlessly in sync with the Selected Work images during scroll.
 */
export function computeEdgeShadeMetrics(
  elementCenterY: number,
  viewportHeight: number,
  curlActivity: number,
  signedVelocity: number
): EdgeShadeMetrics {
  const vh = Math.max(viewportHeight, 1);
  const screenY = clamp(elementCenterY / vh, 0, 1);
  const centeredY = 2 * screenY - 1; // -1 at top edge, 0 at vertical center, +1 at bottom edge
  const edgeProfile = 1 - Math.sqrt(Math.max(0, 1 - centeredY * centeredY));

  const activity = clamp(curlActivity, 0, 1);
  const directional = clamp(signedVelocity, -1, 1);

  // Subtle ambient edge shade + stronger dynamic curl/shade on scroll
  const dynamicCurl = 0.012 + activity * 0.048;
  const scaleX = 1 - edgeProfile * dynamicCurl;
  const rotateXDeg = -centeredY * edgeProfile * (3.5 + activity * 11.5);
  const translateY = -directional * 3.4 - centeredY * edgeProfile * activity * 8.0;

  // Dark edge shading strengthens cleanly as content nears top/bottom screen edges
  const shadeAlpha = clamp(edgeProfile * (0.14 + activity * 0.42), 0, 0.56);
  const opacity = clamp(1 - edgeProfile * (0.16 + activity * 0.34), 0.42, 1);

  return {
    edgeProfile,
    scaleX,
    rotateXDeg,
    translateY,
    shadeAlpha,
    opacity,
  };
}
