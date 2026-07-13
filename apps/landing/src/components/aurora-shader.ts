export const AURORA_VERTEX = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

export const AURORA_FRAGMENT = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uPointerStrength;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.0 + vec2(7.3, 1.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 m = vec2(uPointer.x * aspect, uPointer.y);

  float t = uTime * 0.04;

  // gravity-well swirl around the pointer
  vec2 toM = p - m;
  float dist = length(toM);
  float swirl = uPointerStrength * 1.5 * exp(-dist * 2.0);
  float sSin = sin(swirl);
  float sCos = cos(swirl);
  p = m + mat2(sCos, -sSin, sSin, sCos) * toM;

  // domain-warped fbm (aurora curtains)
  vec2 q = vec2(
    fbm(p * 1.4 + vec2(0.0, t)),
    fbm(p * 1.4 + vec2(5.2, t * 1.3))
  );
  vec2 r = vec2(
    fbm(p * 1.4 + 2.0 * q + vec2(1.7, 9.2) + t * 0.6),
    fbm(p * 1.4 + 2.0 * q + vec2(8.3, 2.8))
  );
  float f = fbm(p * 1.4 + 2.4 * r);

  // palette: deep indigo -> violet -> teal (matches the static wallpaper)
  vec3 c1 = vec3(0.05, 0.04, 0.12);
  vec3 c2 = vec3(0.22, 0.12, 0.42);
  vec3 c3 = vec3(0.07, 0.45, 0.55);
  vec3 col = mix(c1, c2, smoothstep(0.15, 0.65, f));
  col = mix(col, c3, smoothstep(0.55, 0.95, f) * 0.85);
  col += vec3(0.35, 0.2, 0.6) * q.y * 0.25;

  // soft glow under the pointer
  col += vec3(0.25, 0.35, 0.6) * uPointerStrength * exp(-dist * 3.0) * 0.6;

  // vignette
  vec2 v = uv - 0.5;
  col *= 1.0 - dot(v, v) * 0.9;

  // grain against banding
  col += (hash(uv * uResolution + uTime) - 0.5) * 0.02;

  gl_FragColor = vec4(col, 1.0);
}
`
