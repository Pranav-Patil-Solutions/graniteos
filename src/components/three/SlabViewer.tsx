"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { haptic } from "@/lib/haptics";

type Pal = { base: string; flecks: [string, number][] };

// fleck colours are "r,g,b"; numbers are cumulative-ish weights
const PALETTES: Record<string, Pal> = {
  black: { base: "#0c0c0e", flecks: [["40,40,46", 0.78], ["201,162,75", 0.18], ["230,230,235", 0.04]] },
  white: { base: "#e7e6e1", flecks: [["120,120,130", 0.5], ["180,178,172", 0.5]] },
  grey: { base: "#2a2f37", flecks: [["255,255,255", 0.4], ["10,10,12", 0.6]] },
  brown: { base: "#2c2017", flecks: [["214,180,120", 0.5], ["20,12,6", 0.5]] },
  green: { base: "#0e2018", flecks: [["180,210,180", 0.4], ["220,235,220", 0.2], ["8,18,12", 0.4]] },
  red: { base: "#2a0f0f", flecks: [["240,220,210", 0.3], ["20,6,6", 0.7]] },
  default: { base: "#15151a", flecks: [["201,162,75", 0.5], ["230,230,235", 0.5]] },
};

function paletteKey(material?: string, color?: string): string {
  const s = `${material ?? ""} ${color ?? ""}`.toLowerCase();
  if (/black|galaxy|absolute|jet/.test(s)) return "black";
  if (/white|carrara|statuario|makrana|albeta|morwad/.test(s)) return "white";
  if (/grey|gray|steel|kuppam|cloud|silver/.test(s)) return "grey";
  if (/brown|tan|coffee|paradiso|kashmir/.test(s)) return "brown";
  if (/green|forest|fusion|rajnagar/.test(s)) return "green";
  if (/red|ruby|lakha|jhansi|maroon|pink/.test(s)) return "red";
  return "default";
}

export default function SlabViewer({
  className = "",
  material,
  color,
}: {
  className?: string;
  material?: string;
  color?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // WebGL blocked/unavailable (some browsers/extensions) — leave the
      // CSS stone-swatch fallback showing behind this transparent layer.
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const resize = () => renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    resize();
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
    cam.position.set(0, 1.4, 5);

    // studio environment so polished stone reflects light realistically
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    // procedural texture from the stone palette
    const pal = PALETTES[paletteKey(material, color)];
    const tc = document.createElement("canvas");
    tc.width = tc.height = 512;
    const g = tc.getContext("2d")!;
    g.fillStyle = pal.base;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      const r = Math.random();
      let acc = 0;
      let chosen = pal.flecks[0][0];
      for (const [c, w] of pal.flecks) {
        acc += w;
        if (r <= acc) {
          chosen = c;
          break;
        }
      }
      g.fillStyle = `rgba(${chosen},${Math.random() * 0.7})`;
      const s = Math.random() * 2.4 + 0.4;
      g.beginPath();
      g.arc(Math.random() * 512, Math.random() * 512, s, 0, 7);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(tc);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const isLight = paletteKey(material, color) === "white";
    // polished-stone look: clear-coat over the speckled surface, reflecting the env
    const mat = new THREE.MeshPhysicalMaterial({
      map: tex,
      roughness: isLight ? 0.4 : 0.28,
      metalness: 0,
      clearcoat: 0.7,
      clearcoatRoughness: isLight ? 0.35 : 0.18,
      envMapIntensity: 1,
    });
    const slab = new THREE.Mesh(new RoundedBoxGeometry(3, 0.16, 2, 6, 0.03), mat);
    scene.add(slab);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xfff2d6, 1.5);
    key.position.set(4, 6, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6fb6ff, 0.7);
    rim.position.set(-5, 2, -3);
    scene.add(rim);

    let ry = 0.5,
      rx = 0.35,
      dragging = false,
      auto = true,
      lastX = 0,
      lastY = 0,
      raf = 0,
      gyro = false,
      gTargetY = ry,
      gTargetX = rx,
      askedPerm = false;
    const dom = renderer.domElement;

    // phone gyroscope → slab rotation
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      gyro = true;
      auto = false;
      gTargetY = 0.5 + (e.gamma / 90) * 1.3; // left-right tilt → yaw
      gTargetX = Math.max(-1, Math.min(1, ((e.beta - 45) / 50) * 0.7)); // front-back → pitch
    };
    window.addEventListener("deviceorientation", onOrient);

    const down = (e: PointerEvent) => {
      dragging = true;
      auto = false;
      lastX = e.clientX;
      lastY = e.clientY;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = "grabbing";
      haptic("tap");
      // iOS 13+ needs an explicit motion permission, granted on a user gesture
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (!askedPerm && DOE && typeof DOE.requestPermission === "function") {
        askedPerm = true;
        DOE.requestPermission()
          .then((s) => {
            if (s === "granted") window.addEventListener("deviceorientation", onOrient);
          })
          .catch(() => {});
      }
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      ry += (e.clientX - lastX) * 0.01;
      rx += (e.clientY - lastY) * 0.01;
      rx = Math.max(-1, Math.min(1, rx));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = () => {
      dragging = false;
      dom.style.cursor = "grab";
    };
    dom.addEventListener("pointerdown", down);
    dom.addEventListener("pointermove", move);
    dom.addEventListener("pointerup", up);
    const onResize = () => {
      resize();
      cam.aspect = mount.clientWidth / mount.clientHeight;
      cam.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    const loop = () => {
      if (dragging) {
        // ry/rx are driven directly by the drag handler
      } else if (gyro) {
        ry += (gTargetY - ry) * 0.08;
        rx += (gTargetX - rx) * 0.08;
      } else if (auto) {
        ry += 0.005;
      }
      slab.rotation.y = ry;
      slab.rotation.x = rx;
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("deviceorientation", onOrient);
      dom.removeEventListener("pointerdown", down);
      dom.removeEventListener("pointermove", move);
      dom.removeEventListener("pointerup", up);
      tex.dispose();
      mat.dispose();
      slab.geometry.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (dom.parentNode === mount) mount.removeChild(dom);
    };
  }, [material, color]);

  return <div ref={mountRef} className={className} />;
}
