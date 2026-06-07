// ============================================
// NEXO CAPTURE — GLTF Exporter
// Gera arquivo .GLB que pode ser convertido online para .SKP
// ============================================

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

interface ProjectData {
  name: string;
  walls: Array<{
    start: [number, number];
    end: [number, number];
    thickness?: number;
  }>;
  doors: Array<{
    wallIndex: number;
    position: number;
    width: number;
    height?: number;
  }>;
  windows: Array<{
    wallIndex: number;
    position: number;
    width: number;
    height: number;
    sill?: number;
  }>;
}

const WALL_HEIGHT = 2.7; // meters
const WALL_THICKNESS_DEFAULT = 0.15;

/**
 * Constrói cena Three.js com paredes, portas e janelas
 */
export function buildScene(project: ProjectData): THREE.Scene {
  const scene = new THREE.Scene();
  scene.name = `NEXO_${project.name}`;

  // Calcular bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of project.walls) {
    minX = Math.min(minX, w.start[0], w.end[0]);
    minY = Math.min(minY, w.start[1], w.end[1]);
    maxX = Math.max(maxX, w.start[0], w.end[0]);
    maxY = Math.max(maxY, w.start[1], w.end[1]);
  }
  const centerX = (minX + maxX) / 2;
  const centerZ = (minY + maxY) / 2;

  // Group principal
  const root = new THREE.Group();
  root.name = 'NEXO_Capture';

  // === PAREDES ===
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.7,
    metalness: 0.1,
    name: 'MaterialParedes',
  });

  for (let i = 0; i < project.walls.length; i++) {
    const wall = project.walls[i];
    const startX = (wall.start[0] - centerX) / 1000;
    const startZ = (wall.start[1] - centerZ) / 1000;
    const endX = (wall.end[0] - centerX) / 1000;
    const endZ = (wall.end[1] - centerZ) / 1000;

    const dx = endX - startX;
    const dz = endZ - startZ;
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length === 0) continue;

    const thickness = (wall.thickness || 150) / 1000;

    const geometry = new THREE.BoxGeometry(length, WALL_HEIGHT, thickness);
    const mesh = new THREE.Mesh(geometry, wallMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const midX = (startX + endX) / 2;
    const midZ = (startZ + endZ) / 2;
    mesh.position.set(midX, WALL_HEIGHT / 2, midZ);

    const angle = Math.atan2(dx, dz);
    mesh.rotation.y = angle;

    mesh.name = `Parede_${i + 1}`;
    root.add(mesh);
  }

  // === PORTAS ===
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x22c97a,
    roughness: 0.5,
    name: 'MaterialPortas',
  });

  for (let i = 0; i < project.doors.length; i++) {
    const door = project.doors[i];
    if (door.wallIndex >= project.walls.length) continue;

    const wall = project.walls[door.wallIndex];
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
    mesh.name = `Porta_${i + 1}`;
    root.add(mesh);
  }

  // === JANELAS ===
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a9be8,
    roughness: 0.3,
    transparent: true,
    opacity: 0.7,
    name: 'MaterialJanelas',
  });

  for (let i = 0; i < project.windows.length; i++) {
    const win = project.windows[i];
    if (win.wallIndex >= project.walls.length) continue;

    const wall = project.walls[win.wallIndex];
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

    const geometry = new THREE.BoxGeometry(winWidth, winHeight, 0.05);
    const mesh = new THREE.Mesh(geometry, windowMaterial);
    mesh.position.set(midX, winSill - winHeight / 2, midZ);

    const angle = Math.atan2(dx, dz);
    mesh.rotation.y = angle;
    mesh.name = `Janela_${i + 1}`;
    root.add(mesh);
  }

  // === CHÃO (referência) ===
  const floorSize = Math.max((maxX - minX) / 1000, (maxY - minY) / 1000) * 1.5;
  const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.9,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.name = 'Piso';
  root.add(floor);

  scene.add(root);
  return scene;
}

/**
 * Exporta projeto para GLB (formato binário)
 */
export function exportToGLB(project: ProjectData): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const scene = buildScene(project);
    const exporter = new GLTFExporter();

    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          // Se vier como JSON, converter para blob
          const json = JSON.stringify(result, null, 2);
          const encoder = new TextEncoder();
          resolve(encoder.encode(json).buffer);
        }
      },
      (error) => reject(error),
      {
        binary: true,
        embedImages: true,
        animations: [],
      }
    );
  });
}

/**
 * Exporta projeto para GLTF (formato texto JSON)
 */
export function exportToGLTF(project: ProjectData): Promise<string> {
  return new Promise((resolve, reject) => {
    const scene = buildScene(project);
    const exporter = new GLTFExporter();

    exporter.parse(
      scene,
      (result) => {
        if (typeof result === 'object' && !(result instanceof ArrayBuffer)) {
          resolve(JSON.stringify(result, null, 2));
        } else {
          reject(new Error('Resultado inesperado'));
        }
      },
      (error) => reject(error),
      {
        binary: false,
        embedImages: true,
        animations: [],
      }
    );
  });
}

/**
 * Download direto do arquivo GLB
 */
export async function downloadGLB(project: ProjectData): Promise<void> {
  const buffer = await exportToGLB(project);
  const blob = new Blob([buffer], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.glb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download direto do arquivo GLTF
 */
export async function downloadGLTF(project: ProjectData): Promise<void> {
  const json = await exportToGLTF(project);
  const blob = new Blob([json], { type: 'model/gltf+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.gltf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}