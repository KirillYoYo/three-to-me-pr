import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { Mesh, Raycaster, Vector2, Vector3, type Object3D } from 'three';

const LOOK_SPEED = 0.0022;
const PITCH_LIMIT = 1.35;
const EYE_HEIGHT = 1.8;

function isOrbit(value: unknown): value is { target: Vector3; update: () => void } {
  if (typeof value !== 'object' || value === null) return false;
  if (!('target' in value) || !('update' in value)) return false;
  const { target, update } = value;
  return target instanceof Vector3 && typeof update === 'function';
}

function isMesh(object: Object3D): object is Mesh {
  return object instanceof Mesh;
}

export function CityFly({
  enabled,
  speed,
}: {
  enabled: boolean;
  speed: MutableRefObject<number>;
}) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const keys = useRef<Record<string, boolean>>({});
  const raycaster = useRef(new Raycaster());
  const pointer = useRef(new Vector2());
  const forward = useRef(new Vector3());
  const controls = useThree((state) => state.controls);

  useEffect(() => {
    if (!enabled) return;
    camera.rotation.order = 'YXZ';
    yaw.current = camera.rotation.y;
    pitch.current = camera.rotation.x;

    const element = gl.domElement;
    const lock = () => {
      if (document.pointerLockElement !== element) void element.requestPointerLock();
    };
    const look = (event: MouseEvent) => {
      if (document.pointerLockElement !== element) return;
      yaw.current -= event.movementX * LOOK_SPEED;
      pitch.current = Math.min(
        PITCH_LIMIT,
        Math.max(-PITCH_LIMIT, pitch.current - event.movementY * LOOK_SPEED),
      );
    };
    const setKey = (event: KeyboardEvent, down: boolean) => {
      keys.current[event.code] = down;
    };
    const onKeyDown = (event: KeyboardEvent) => setKey(event, true);
    const onKeyUp = (event: KeyboardEvent) => setKey(event, false);

    element.addEventListener('click', lock);
    document.addEventListener('mousemove', look);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      element.removeEventListener('click', lock);
      document.removeEventListener('mousemove', look);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (document.pointerLockElement === element) document.exitPointerLock();
    };
  }, [camera, enabled, gl]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const step = Math.min(delta, 0.05);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    camera.rotation.z = 0;

    const pressed = keys.current;
    const fast = pressed.ShiftLeft || pressed.ShiftRight;
    const meters = speed.current * (fast ? 4 : 1) * step;
    const side = Math.cos(yaw.current);
    const ahead = -Math.sin(yaw.current);
    camera.getWorldDirection(forward.current);
    let moveX = 0;
    let moveY = 0;
    let moveZ = 0;
    if (pressed.KeyW || pressed.ArrowUp) {
      moveX += forward.current.x;
      moveY += forward.current.y;
      moveZ += forward.current.z;
    }
    if (pressed.KeyS || pressed.ArrowDown) {
      moveX -= forward.current.x;
      moveY -= forward.current.y;
      moveZ -= forward.current.z;
    }
    if (pressed.KeyD || pressed.ArrowRight) {
      moveX += side;
      moveZ += ahead;
    }
    if (pressed.KeyA || pressed.ArrowLeft) {
      moveX -= side;
      moveZ -= ahead;
    }
    if (pressed.KeyE || pressed.Space) moveY += 1;
    if (pressed.KeyQ || pressed.KeyC) moveY -= 1;
    const length = Math.hypot(moveX, moveY, moveZ);
    if (length > 0) {
      camera.position.x += (moveX / length) * meters;
      camera.position.y += (moveY / length) * meters;
      camera.position.z += (moveZ / length) * meters;
    }
  });

  useEffect(() => {
    const element = gl.domElement;
    const jump = (event: MouseEvent) => {
      if (document.pointerLockElement === element) return;
      const rect = element.getBoundingClientRect();
      pointer.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(pointer.current, camera);
      const hit = raycaster.current.intersectObjects(scene.children, true).find((item) => isMesh(item.object));
      if (!hit) return;
      const facing = camera.rotation.y;
      camera.position.set(hit.point.x, hit.point.y + EYE_HEIGHT, hit.point.z);
      camera.rotation.order = 'YXZ';
      camera.rotation.set(0, facing, 0);
      const lookX = -Math.sin(facing);
      const lookZ = -Math.cos(facing);
      if (isOrbit(controls)) {
        controls.target.set(
          camera.position.x + lookX * 40,
          camera.position.y,
          camera.position.z + lookZ * 40,
        );
        controls.update();
      }
      yaw.current = camera.rotation.y;
      pitch.current = camera.rotation.x;
    };
    element.addEventListener('dblclick', jump);
    return () => element.removeEventListener('dblclick', jump);
  }, [camera, controls, gl, scene, speed]);

  return null;
}

export function placeInFront(camera: { position: Vector3; getWorldDirection: (target: Vector3) => Vector3 }, distance: number) {
  const direction = new Vector3();
  camera.getWorldDirection(direction);
  return camera.position.clone().addScaledVector(direction, distance);
}
