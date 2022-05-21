precision highp float;
#define GLSLIFY 1

varying vec3 vPosition;

uniform vec3 ucolor;

uniform float uopacity;
uniform float time;
float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
void main(void) {
    float opacity = (96.0 - length(vPosition)) / 256.0 * 0.6;
    vec4 gl_FragColor = vec4(ucolor, uopacity / opacity);
}

