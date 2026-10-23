'use strict';
// The living print: draws the current drawing with WebGL so it can move inside itself.
//   ink boil   the edges of the ink tremble very slightly, eight steps a second, cycling three
//              states, the way animated woodcut films do
//   parallax   each drawing has a depth map (assets/frames/depth/, scripts/depth.py); as the camera
//              moves, near things shift more than far things, so the print reads as a place
// The camera itself (scale and pan of the whole stage) belongs to frames.js, which calls draw().
// If WebGL is not available, the page keeps the plain <img> layers and nothing here runs.
const GLFRAME = (() => {
  const VS = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() { v_uv = vec2(a_pos.x * .5 + .5, .5 - a_pos.y * .5); gl_Position = vec4(a_pos, 0., 1.); }`;
  const FS = `
    precision mediump float;
    uniform sampler2D u_img0, u_img1, u_dep0, u_dep1;
    uniform vec2 u_cov0, u_cov1;        // object-fit: cover, per picture
    uniform float u_mix;                // crossfade towards picture 1
    uniform vec2 u_par;                 // camera pan, for parallax
    uniform float u_zoom;               // camera zoom, for parallax
    uniform float u_boil;               // which of the three boil states
    uniform float u_amp;                // how far the ink trembles, in uv
    varying vec2 v_uv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
    }
    vec2 boil(vec2 uv) {
      vec2 q = uv * vec2(46., 26.) + u_boil * vec2(7.31, 3.17);
      return u_amp * vec2(noise(q) - .5, noise(q + 19.7) - .5);
    }
    // Where on the print does this pixel come from? The shift depends on the depth *there*, so the
    // answer is found by iterating: a few steps settle it, and near things then cover what is behind
    // them instead of leaving a ghost.
    vec4 print(sampler2D img, sampler2D dep, vec2 cov) {
      vec2 c = (v_uv - .5) * cov * .965 + .5;     // a small margin, so a shift never runs off the print
      vec2 p = c;
      for (int i = 0; i < 4; i++) {
        float k = texture2D(dep, clamp(p, 0.001, .999)).r - .5;      // + near, - far
        p = c - u_par * k - (c - .5) * u_zoom * k;
      }
      return texture2D(img, clamp(p + boil(p), 0.001, .999));
    }
    void main() { gl_FragColor = mix(print(u_img0, u_dep0, u_cov0), print(u_img1, u_dep1, u_cov1), u_mix); }`;

  let gl = null, canvas = null, prog = null, U = {}, ok = false;
  const slot = [{ img: null, dep: null, aspect: 16 / 9, key: null }, { img: null, dep: null, aspect: 16 / 9, key: null }];
  let mix = 0, fadeFrom = 0, fading = false, pending = null;
  const FADE = 1100;

  function mount(stage) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    // Off by default: the trembling ink and the depth warp were too much. ?living turns it on to compare.
    if (!/[?&]living\b/.test(location.search)) return false;
    canvas = document.createElement('canvas');
    canvas.id = 'gl';
    try { gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false }); } catch (e) { gl = null; }
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { console.warn('glframe:', e.message); return false; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['u_img0', 'u_img1', 'u_dep0', 'u_dep1', 'u_cov0', 'u_cov1', 'u_mix', 'u_par', 'u_zoom', 'u_boil', 'u_amp']) U[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(U.u_img0, 0); gl.uniform1i(U.u_img1, 1); gl.uniform1i(U.u_dep0, 2); gl.uniform1i(U.u_dep1, 3);
    const grey = texture(null);
    for (const s of slot) { s.img = texture(null); s.dep = grey; }
    stage.insertBefore(canvas, stage.firstChild);
    ok = true;
    return true;
  }
  // a texture from an image, or a 1×1 mid-grey (no depth: no parallax) if there is none
  function texture(source) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    return t;
  }
  function load(src) {
    return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  }
  // show a drawing: key is the frame name or name-0N; src is the picture already known to load
  async function show(key, src) {
    if (!ok) return;
    const want = pending = key;
    const [img, dep] = await Promise.all([load(src), load(`assets/frames/depth/${key}.png`)]);
    if (pending !== want || !img) return;
    if (fading) finishFade();
    const s = slot[1];
    if (s.img) gl.deleteTexture(s.img);
    if (s.dep && s.dep !== slot[0].dep) gl.deleteTexture(s.dep);
    s.img = texture(img); s.dep = dep ? texture(dep) : texture(null);
    s.aspect = img.naturalWidth / img.naturalHeight; s.key = key;
    fading = true; fadeFrom = performance.now(); mix = 0;
    canvas.classList.add('on');
  }
  function finishFade() {
    const t = slot[0]; slot[0] = slot[1]; slot[1] = t;
    fading = false; mix = 0;
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    return w / Math.max(1, h);
  }
  // cam: { s, x, y } as frames.js sets them (x, y in % of the frame); now: ms
  function draw(cam, now) {
    if (!ok || !slot[0].key && !fading) return;
    const ca = resize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    const cover = a => a > ca ? [ca / a, 1] : [1, a / ca];
    if (fading) { mix = Math.min(1, (now - fadeFrom) / FADE); if (mix >= 1) finishFade(); }
    const [s0, s1] = slot;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s0.img);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, s1.img);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, s0.dep);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, s1.dep);
    gl.uniform2fv(U.u_cov0, cover(s0.aspect)); gl.uniform2fv(U.u_cov1, cover(s1.aspect));
    gl.uniform1f(U.u_mix, fading ? mix : 0);
    // the stage moves the whole print by the pan; parallax moves the near things further, the far things less
    gl.uniform2f(U.u_par, cam.x / 100 * PARALLAX, cam.y / 100 * PARALLAX);
    gl.uniform1f(U.u_zoom, (cam.s - 1.12) * PARALLAX);
    gl.uniform1f(U.u_boil, Math.floor(now / 125) % 3);
    gl.uniform1f(U.u_amp, BOIL / Math.max(1, canvas.clientWidth));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  const PARALLAX = .4;    // how much depth the camera reveals
  const BOIL = 1.4;       // how far the ink trembles, in CSS pixels
  return { mount, show, draw, active: () => ok };
})();
