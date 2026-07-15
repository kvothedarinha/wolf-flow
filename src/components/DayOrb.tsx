import { useEffect, useRef, useState } from "react";

export function DayOrb({
  progress,
  onComplete,
}: {
  progress: number; // 0..1
  onComplete?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbApiRef = useRef<{ set: (v: number) => void; getMorph: () => number } | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
    if (!gl) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);

    let pTarget = progress;
    let pCur = progress;
    let morphTarget = progress >= 1 ? 1 : 0;
    let morph = morphTarget;

    // Shader vertex
    const vSrc = `#version 300 es
      in vec3 pos;
      out vec3 vN;
      uniform mat4 model;
      uniform mat4 view;
      uniform mat4 proj;
      void main(){
        vN = normalize((model * vec4(pos, 0.)).xyz);
        gl_Position = proj * view * model * vec4(pos, 1.);
      }
    `;

    // Shader fragment
    const fSrc = `#version 300 es
      precision highp float;
      in vec3 vN;
      uniform float uP, uM, uR;

      float sdBlob(vec3 p, float s) {
        float f = length(p) - s;
        for (int i = 0; i < 3; i++) {
          f = max(f, length(p.xy * sin(p.z * 2.) * 0.5) - s * 0.6);
          p = p.zxy * 0.8;
        }
        return f;
      }

      float sdCone(vec3 p, float h, float r) {
        vec2 q = vec2(length(p.xz), p.y);
        vec2 k = vec2(r, h);
        vec2 a = q - k * clamp(dot(q, k) / dot(k, k), 0., 1.);
        return length(a) * (q.x * k.y - q.y * k.x < 0. ? -1. : 1.);
      }

      float sdTorus(vec3 p, float r, float t) {
        return length(vec2(length(p.xy) - r, p.z)) - t;
      }

      float sceneTrophy(vec3 p) {
        float cup = min(length(p - vec3(0., 0.3, 0.)) - 0.4,
                        length(p.xz) - 0.35 - smoothstep(-0.4, 0.5, p.y) * 0.15);
        float handles = length(vec2(length(vec2(abs(p.x) - 0.5, p.y - 0.2)) - 0.1, p.z)) - 0.08;
        float base = sdCone(p - vec3(0., -0.5, 0.), 0.3, 0.6);
        float stem = length(p.xz) - 0.08 - max(0., p.y + 0.2) * 0.3;
        return min(min(cup, handles), min(base, stem));
      }

      float sceneBlob(vec3 p) {
        return sdBlob(p, 0.35 + sin(p.z * 3.) * 0.05);
      }

      float scene(vec3 p) {
        float m1 = mix(1., 0., uM);
        float m2 = mix(0., 1., uM);
        float sdf = sceneBlob(p) * m1 + sceneTrophy(p) * m2;
        return sdf;
      }

      void main() {
        vec3 rd = normalize(vN);
        vec3 ro = -rd * 2.0;

        float t = 0., d;
        for (int i = 0; i < 96; i++) {
          d = scene(ro + rd * t);
          if (d < 0.002 || t > 5.) break;
          t += d * 0.8;
        }

        vec3 p = ro + rd * t;
        vec3 n = normalize(vec3(
          scene(p + vec3(0.002, 0., 0.)) - scene(p - vec3(0.002, 0., 0.)),
          scene(p + vec3(0., 0.002, 0.)) - scene(p - vec3(0., 0.002, 0.)),
          scene(p + vec3(0., 0., 0.002)) - scene(p - vec3(0., 0., 0.002))
        ));

        float hit = t < 5. ? 1. : 0.;

        vec3 lightDir = normalize(vec3(1., 1., 1.));
        float dif = max(0., dot(n, lightDir));

        vec3 cold = vec3(0.45, 0.95, 0.88);
        vec3 warm = vec3(0.9, 0.5, 0.2);
        vec3 col = mix(cold, warm, uP) * (0.55 + 0.6 * dif) + vec3(1.) * 0.3;

        float fresnel = pow(max(0., 1. - dot(-rd, n)), 2.5);
        col += vec3(1.) * fresnel * 0.4;

        col = mix(vec3(0.), col, hit);
        col = pow(col, vec3(1. / 2.2));

        gl_FragColor = vec4(col, 1.);
      }
    `;

    const prog = gl.createProgram()!;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(vs, vSrc);
    gl.shaderSource(fs, fSrc);
    gl.compileShader(vs);
    gl.compileShader(fs);
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const posLoc = gl.getAttribLocation(prog, "pos");
    const verts = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 12, 0);

    const uLocs = {
      uP: gl.getUniformLocation(prog, "uP"),
      uM: gl.getUniformLocation(prog, "uM"),
      uR: gl.getUniformLocation(prog, "uR"),
      model: gl.getUniformLocation(prog, "model"),
      view: gl.getUniformLocation(prog, "view"),
      proj: gl.getUniformLocation(prog, "proj"),
    };

    const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    gl.uniformMatrix4fv(uLocs.model, false, identity);
    gl.uniformMatrix4fv(uLocs.view, false, identity);
    gl.uniformMatrix4fv(uLocs.proj, false, identity);

    orbApiRef.current = {
      set: (v: number) => {
        pTarget = Math.max(0, Math.min(1, v));
        if (pTarget >= 1 && !hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete?.();
          morphTarget = 1;
        }
      },
      getMorph: () => morph,
    };

    const loop = () => {
      pCur += (pTarget - pCur) * 0.05;
      morph += (morphTarget - morph) * 0.022;

      const mEase = morph * morph * (3 - 2 * morph); // smoothstep

      gl.uniform1f(uLocs.uP, pCur);
      gl.uniform1f(uLocs.uM, mEase);
      gl.uniform1f(uLocs.uR, 0);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onComplete]);

  // Update orb progress when prop changes
  useEffect(() => {
    orbApiRef.current?.set(progress);
  }, [progress]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
