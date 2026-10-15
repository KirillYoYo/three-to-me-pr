uniform vec3 uColor;
uniform float uFresnelPower;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - clamp(dot(viewDirection, normal), 0.0, 1.0), uFresnelPower);
  vec3 color = mix(uColor * 0.12, uColor, fresnel);
  gl_FragColor = vec4(color, 1.0);
}
