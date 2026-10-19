import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function MouseLook() {
  const { camera } = useThree();
  // -1..1 по обеим осям
  const mouse = useRef({ x: 0, y: 0 });

  // Запоминаем стартовый поворот камеры ОДИН РАЗ
  const baseRot = useRef<THREE.Euler | null>(null);

  useEffect(() => {
    // Порядок YXZ: сначала yaw (y), потом pitch (x), потом roll (z)
    camera.rotation.order = 'YXZ';
    baseRot.current = camera.rotation.clone();

    const onMove = (e: MouseEvent) => {
      // Нормализуем в -1..1 относительно центра окна
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      // Инвертируем y: мышь вверху экрана → +1 → камера смотрит вверх
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [camera]);

  useFrame(() => {
    if (!baseRot.current) return;

    // Амплитуда наклона в радианах
    const pitchAmount = 0.25; // вверх/вниз
    const yawAmount = 0.35;   // влево/вправо

    // Целевые углы относительно стартовых
    const targetX = baseRot.current.x + mouse.current.y * pitchAmount;
    const targetY = baseRot.current.y + mouse.current.x * yawAmount;

    // Плавная интерполяция (lerp) — без скачков
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetX, 0.08);
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetY, 0.08);
    // z не трогаем
  });

  return null;
}
