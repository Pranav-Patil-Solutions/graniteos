"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A draggable, auto-rotating 3D granite slab with a procedurally generated
 * "Black Galaxy" texture (black with gold + white flecks). Pure Three.js so it
 * stays light and avoids React-19 renderer version churn.
 */
export default function SlabViewer({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const resize = () => renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    resize();
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
    cam.position.set(0, 1.4, 5);

    // procedural granite texture
    const tc = document.createElement("canvas");
    tc.width = tc.height = 512;
    const g = tc.getContext("2d")!;
    g.fillStyle = "#0c0c0e";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) {
      const r = Math.random();
      g.fillStyle =
        r < 0.78
          ? `rgba(40,40,46,${Math.random() * 0.5})`
          : r < 0.96
            ? `rgba(201,162,75,${Math.random() * 0.9})`
            : `rgba(230,230,235,${Math.random() * 0.8})`;
      const s = Math.random() * 2.4 + 0.4;
      g.beginPath();
      g.arc(Math.random() * 512, Math.random() * 512, s, 0, 7);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(tc);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.55 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(3, 0.16, 2), mat);
    scene.add(slab);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
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
      raf = 0;

    const dom = renderer.domElement;
    const down = (e: PointerEvent) => {
      dragging = true;
      auto = false;
      lastX = e.clientX;
      lastY = e.clientY;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = "grabbing";
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
      if (auto) ry += 0.005;
      slab.rotation.y = ry;
      slab.rotation.x = rx;
      renderer.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      dom.removeEventListener("pointerdown", down);
      dom.removeEventListener("pointermove", move);
      dom.removeEventListener("pointerup", up);
      tex.dispose();
      mat.dispose();
      slab.geometry.dispose();
      renderer.dispose();
      if (dom.parentNode === mount) mount.removeChild(dom);
    };
  }, []);

  return <div ref={mountRef} className={className} />;
}
