// ============================================
// NEXO CAPTURE — Three.js 3D Viewer
// Visualizador 3D interativo em tempo real
// ============================================

import { useRef, useEffect, useState } from 'react';
import { Box, Maximize2, Download, RotateCw } from 'lucide-react';
import * as THREE from 'three';

interface Wall {
  start: [number, number];
  end: [number, number];
  thickness?: number;
}

interface Door {
  wallIndex: number;
  position: number;
  width: number;
  height?: number;
}

interface Window {
  wallIndex: number;
  position: number;
  width: number;
  height: number;
  sill?: number;
}

interface Viewer3DProps {
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  height?: number;
}

export function Viewer3D({ walls, doors, windows, height = 2.7 }: Viewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotating, setIsRotating] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Limpar
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Calcular bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const w of walls) {
      minX = Math.min(minX, w.start[0], w.end[0]);
      minY = Math.min(minY, w.start[1], w.end[1]);
      maxX = Math.max(maxX, w.start[0], w.end[0]);
      maxY = Math.max(maxY, w.start[1], w.end[1]);
    }

    if (!isFinite(minX) || !isFinite(maxX)) {
      const msg = document.createElement('div');
      msg.className = 'flex items-center justify-center h-full text-slate-400';
      msg.textContent = 'Sem dados para visualizar';
      container.appendChild(msg);
      return;
    }

    // Setup Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Center
    const centerX = (minX + maxX) / 2;
    const centerZ = (minY + maxY) / 2;
    const planWidth = (maxX - minX) / 1000;
    const planDepth = (maxY - minY) / 1000;
    const maxDim = Math.max(planWidth, planDepth, 4);

    // Camera position
    camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
    camera.lookAt(0, 1, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Floor
    const floorSize = maxDim * 2;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const grid = new THREE.GridHelper(floorSize, 20, 0x334155, 0x1e293b);
    scene.add(grid);

    // Wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.7,
      metalness: 0.1,
    });

    const wallEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const wallLineMaterial = new THREE.LineBasicMaterial({ color: 0x64748b });

    // Build walls
    const wallGroup = new THREE.Group();

    for (const wall of walls) {
      const startX = (wall.start[0] - centerX) / 1000;
      const startZ = (wall.start[1] - centerZ) / 1000;
      const endX = (wall.end[0] - centerX) / 1000;
      const endZ = (wall.end[1] - centerZ) / 1000;

      const dx = endX - startX;
      const dz = endZ - startZ;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length === 0) continue;

      const thickness = (wall.thickness || 150) / 1000;
      const wallHeight = height;

      // Criar box para a parede
      const geometry = new THREE.BoxGeometry(length, wallHeight, thickness);
      const mesh = new THREE.Mesh(geometry, wallMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Posição no centro da parede
      const midX = (startX + endX) / 2;
      const midZ = (startZ + endZ) / 2;
      mesh.position.set(midX, wallHeight / 2, midZ);

      // Rotação
      const angle = Math.atan2(dx, dz);
      mesh.rotation.y = angle;

      // Adicionar edges
      const edges = new THREE.LineSegments(wallEdges, wallLineMaterial);
      edges.scale.copy(mesh.scale);
      edges.position.copy(mesh.position);
      edges.rotation.copy(mesh.rotation);
      edges.scale.set(length, wallHeight, thickness);

      wallGroup.add(mesh);
      wallGroup.add(edges);
    }
    scene.add(wallGroup);

    // Doors (representados como boxes verdes)
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x22c97a,
      roughness: 0.5,
      transparent: true,
      opacity: 0.8,
    });

    for (const door of doors) {
      if (door.wallIndex >= walls.length) continue;
      const wall = walls[door.wallIndex];
      const startX = (wall.start[0] - centerX) / 1000;
      const startZ = (wall.start[1] - centerZ) / 1000;
      const endX = (wall.end[0] - centerX) / 1000;
      const endZ = (wall.end[1] - centerZ) / 1000;
      const dx = endX - startX;
      const dz = endZ - startZ;
      const length = Math.sqrt(dx * dx + dz * dz);

      const doorPos = door.position / 1000;
      const doorWidth = door.width / 1000;
      const doorHeight = (door.height || 2100) / 1000;

      const midX = startX + dx * (doorPos + doorWidth / 2) / length;
      const midZ = startZ + dz * (doorPos + doorWidth / 2) / length;

      const geometry = new THREE.BoxGeometry(doorWidth, doorHeight, 0.05);
      const mesh = new THREE.Mesh(geometry, doorMaterial);
      mesh.position.set(midX, doorHeight / 2, midZ);
      const angle = Math.atan2(dx, dz);
      mesh.rotation.y = angle;

      scene.add(mesh);
    }

    // Windows (representados como boxes azuis)
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a9be8,
      roughness: 0.3,
      transparent: true,
      opacity: 0.6,
    });

    for (const win of windows) {
      if (win.wallIndex >= walls.length) continue;
      const wall = walls[win.wallIndex];
      const startX = (wall.start[0] - centerX) / 1000;
      const startZ = (wall.start[1] - centerZ) / 1000;
      const endX = (wall.end[0] - centerX) / 1000;
      const endZ = (wall.end[1] - centerZ) / 1000;
      const dx = endX - startX;
      const dz = endZ - startZ;
      const length = Math.sqrt(dx * dx + dz * dz);

      const winPos = win.position / 1000;
      const winWidth = win.width / 1000;
      const winHeight = win.height / 1000;
      const winSill = (win.sill || 1100) / 1000;

      const midX = startX + dx * (winPos + winWidth / 2) / length;
      const midZ = startZ + dz * (winPos + winWidth / 2) / length;

      const yPos = winSill - winHeight / 2;

      const geometry = new THREE.BoxGeometry(winWidth, winHeight, 0.05);
      const mesh = new THREE.Mesh(geometry, windowMaterial);
      mesh.position.set(midX, yPos, midZ);
      const angle = Math.atan2(dx, dz);
      mesh.rotation.y = angle;

      scene.add(mesh);
    }

    // Animation
    let frameId: number;
    const startTime = Date.now();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = (Date.now() - startTime) / 1000;

      if (isRotating) {
        const angle = elapsed * 0.3;
        const distance = maxDim * 1.5;
        camera.position.x = Math.cos(angle) * distance;
        camera.position.z = Math.sin(angle) * distance;
        camera.position.y = maxDim * 1.2;
        camera.lookAt(0, 1, 0);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Mouse controls
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let cameraTheta = Math.atan2(camera.position.x, camera.position.z);
    let cameraPhi = Math.acos(camera.position.y / camera.position.length());

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;
      cameraTheta -= dx * 0.01;
      cameraPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraPhi - dy * 0.01));
      mouseX = e.clientX;
      mouseY = e.clientY;
      updateCamera();
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaY > 0 ? 1.1 : 0.9;
      const newLength = camera.position.length() * scale;
      if (newLength > 2 && newLength < 100) {
        camera.position.normalize().multiplyScalar(newLength);
        camera.lookAt(0, 1, 0);
      }
    };

    const updateCamera = () => {
      if (isRotating) return;
      const distance = camera.position.length();
      camera.position.x = distance * Math.sin(cameraPhi) * Math.sin(cameraTheta);
      camera.position.z = distance * Math.sin(cameraPhi) * Math.cos(cameraTheta);
      camera.position.y = distance * Math.cos(cameraPhi);
      camera.lookAt(0, 1, 0);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [walls, doors, windows, height, isRotating]);

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Box className="w-4 h-4" />
          <span>Visualizador 3D</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-1.5 rounded-md ${
              isRotating ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
            }`}
            title={isRotating ? 'Parar rotação' : 'Rotacionar'}
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-100 rounded-md hover:bg-slate-200"
            title="Tela cheia"
          >
            <Maximize2 className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div
        ref={containerRef}
        className={`bg-slate-900 rounded-xl overflow-hidden ${
          isFullscreen ? 'h-[600px]' : 'h-[400px]'
        }`}
        style={{ minHeight: '300px' }}
      />

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-slate-300 rounded-sm" />
          <span>Paredes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded-sm" />
          <span>Portas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-500 rounded-sm" />
          <span>Janelas</span>
        </div>
      </div>
    </div>
  );
}