import * as THREE from 'three';
import type { GlobeMethods } from 'react-globe.gl';
import {
  distanceKm,
  easeInOutCubic,
  easeOutCubic,
  flightDurationMs,
  interpolateGreatCircle,
  type LatLng,
} from '../lib/geo';

const ARC_SEGMENTS = 160;
const LANDING_ALTITUDE = 0.55;

export interface FlightOptions {
  /** true bo'lsa — animatsiyasiz: kamera darhol manzilga o'tadi */
  instant?: boolean;
  onProgress?: (t: number) => void;
}

export class FlightCancelled extends Error {
  constructor() {
    super('flight-cancelled');
  }
}

/** Kichik 3D samolyot modeli. Burun +Z yo'nalishda, qanotlar X o'qida, tepa +Y. */
function buildPlaneModel(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: 0xf4f6ff, emissive: 0x2a3550 });
  const accent = new THREE.MeshLambertMaterial({ color: 0xe2a63b, emissive: 0x6b4810 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1fb5c4, emissive: 0x0d5560 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 3.2, 14), body);
  fuselage.rotation.x = Math.PI / 2;
  g.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.75, 14), body);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 1.97;
  g.add(nose);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  cockpit.position.set(0, 0.14, 1.35);
  cockpit.scale.set(1, 0.8, 1.8);
  g.add(cockpit);

  const wings = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.07, 0.75), accent);
  wings.position.set(0, -0.04, 0.25);
  g.add(wings);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.42), accent);
  tail.position.set(0, 0, -1.4);
  g.add(tail);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.5), accent);
  fin.position.set(0, 0.36, -1.42);
  g.add(fin);

  // Porlash (sprite) — samolyot fonda yo'qolib qolmasligi uchun
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,214,140,0.85)');
  grad.addColorStop(0.4, 'rgba(226,166,59,0.25)');
  grad.addColorStop(1, 'rgba(226,166,59,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  glow.scale.set(6, 6, 1);
  g.add(glow);

  g.scale.setScalar(0.75);
  return g;
}

/**
 * Samolyot animatsiyasi: katta doira yoyi, yo'l izi (trail), samolyot va kamera ergashishi.
 * Hamma narsa imperativ tarzda Three.js sahnasida chiziladi — React qayta render qilinmaydi,
 * shuning uchun telefonlarda ham silliq ishlaydi.
 */
export class PlaneAnimator {
  private globe: GlobeMethods;
  private root = new THREE.Group();
  private plane = buildPlaneModel();
  private arc: THREE.Line | null = null;
  private trail: THREE.Mesh | null = null;
  private raf = 0;
  private fadeRaf = 0;
  private reject: ((e: Error) => void) | null = null;

  constructor(globe: GlobeMethods) {
    this.globe = globe;
    this.plane.visible = false;
    this.root.add(this.plane);
    globe.scene().add(this.root);
  }

  get flying() {
    return this.reject !== null;
  }

  private vec(p: LatLng, alt: number) {
    const c = this.globe.getCoords(p.lat, p.lng, alt);
    return new THREE.Vector3(c.x, c.y, c.z);
  }

  private clearPath() {
    cancelAnimationFrame(this.fadeRaf);
    for (const obj of [this.arc, this.trail]) {
      if (!obj) continue;
      this.root.remove(obj);
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }
    this.arc = null;
    this.trail = null;
  }

  private buildPath(from: LatLng, to: LatLng, arcHeight: number) {
    this.clearPath();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const t = i / ARC_SEGMENTS;
      pts.push(this.vec(interpolateGreatCircle(from, to, t), arcHeight * Math.sin(Math.PI * t) + 0.004));
    }

    const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const arc = new THREE.Line(
      arcGeo,
      new THREE.LineDashedMaterial({ color: 0x1fb5c4, dashSize: 1.2, gapSize: 0.9, transparent: true, opacity: 0.75 }),
    );
    arc.computeLineDistances();
    this.arc = arc;
    this.root.add(arc);

    const curve = new THREE.CatmullRomCurve3(pts);
    const trailGeo = new THREE.TubeGeometry(curve, ARC_SEGMENTS, 0.22, 6, false);
    trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Mesh(
      trailGeo,
      new THREE.MeshBasicMaterial({ color: 0xe2a63b, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    this.trail = trail;
    this.root.add(trail);
  }

  /** Bekor qilish — joriy uchish promise'i FlightCancelled bilan tugaydi */
  cancel() {
    cancelAnimationFrame(this.raf);
    this.plane.visible = false;
    const rej = this.reject;
    this.reject = null;
    rej?.(new FlightCancelled());
  }

  fly(from: LatLng, to: LatLng, opts: FlightOptions = {}): Promise<void> {
    this.cancel();
    const km = distanceKm(from, to);
    const angle = km / 6371;
    const arcHeight = Math.min(0.42, Math.max(0.04, angle * 0.32));
    const controls = this.globe.controls();

    if (opts.instant || km < 1) {
      this.clearPath();
      if (km >= 1) {
        this.buildPath(from, to, arcHeight);
        this.trail!.geometry.setDrawRange(0, Infinity);
      }
      this.globe.pointOfView({ lat: to.lat, lng: to.lng, altitude: LANDING_ALTITUDE }, opts.instant ? 0 : 900);
      return new Promise((r) => setTimeout(r, opts.instant ? 0 : 950));
    }

    this.buildPath(from, to, arcHeight);
    const duration = flightDurationMs(km);
    const startAlt = this.globe.pointOfView().altitude;
    const cruiseAlt = Math.min(2.4, Math.max(1.0, 0.8 + km / 7000));
    const trailGeo = this.trail!.geometry;
    const indexPerSegment = 6 * 6; // radialSegments * 6 indeks
    controls.enabled = false;
    this.plane.visible = true;

    // Kamera boshlanish nuqtasidan samolyotga silliq o'tishi uchun avval qisqa "olib chiqish"
    const camFrom = this.globe.pointOfView();

    return new Promise<void>((resolve, reject) => {
      this.reject = (e) => {
        controls.enabled = true;
        reject(e);
      };
      const start = performance.now();

      const tick = (now: number) => {
        const raw = Math.min(1, (now - start) / duration);
        const p = easeInOutCubic(raw);

        // Samolyot holati
        const pos = interpolateGreatCircle(from, to, p);
        const alt = arcHeight * Math.sin(Math.PI * p) + 0.01;
        const pAhead = Math.min(1, p + 0.01);
        const ahead = interpolateGreatCircle(from, to, pAhead);
        const altAhead = arcHeight * Math.sin(Math.PI * pAhead) + 0.01;
        const v = this.vec(pos, alt);
        const vAhead = pAhead > p ? this.vec(ahead, altAhead) : v.clone().add(v.clone().sub(this.vec(interpolateGreatCircle(from, to, p - 0.01), alt)));
        this.plane.position.copy(v);
        this.plane.up.copy(v).normalize();
        this.plane.lookAt(vAhead);

        trailGeo.setDrawRange(0, Math.floor(p * ARC_SEGMENTS) * indexPerSegment);

        // Kamera: samolyot ortidan biroz kechikib ergashadi, oxirida joyga yaqinlashadi
        const lag = 0.07 * Math.sin(Math.PI * p);
        const camPos = interpolateGreatCircle(from, to, Math.max(0, p - lag));
        const blendIn = easeOutCubic(Math.min(1, raw / 0.18));
        const camLat = camFrom.lat + (camPos.lat - camFrom.lat) * blendIn;
        let dLng = camPos.lng - camFrom.lng;
        if (dLng > 180) dLng -= 360;
        if (dLng < -180) dLng += 360;
        const camLng = camFrom.lng + dLng * blendIn;
        const camAlt =
          p < 0.5
            ? startAlt + (cruiseAlt - startAlt) * easeOutCubic(p * 2)
            : cruiseAlt + (LANDING_ALTITUDE - cruiseAlt) * easeInOutCubic((p - 0.5) * 2);
        this.globe.pointOfView({ lat: camLat, lng: camLng, altitude: camAlt }, 0);

        opts.onProgress?.(raw);

        if (raw < 1) {
          this.raf = requestAnimationFrame(tick);
        } else {
          this.plane.visible = false;
          this.reject = null;
          controls.enabled = true;
          trailGeo.setDrawRange(0, Infinity);
          this.fadeArc();
          resolve();
        }
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  /** Qo'ngandan keyin uzuq chiziqni sekin so'ndiramiz, oltin iz xira bo'lib qoladi */
  private fadeArc() {
    const arcMat = this.arc?.material as THREE.LineDashedMaterial | undefined;
    const trailMat = this.trail?.material as THREE.MeshBasicMaterial | undefined;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 1400);
      if (arcMat) arcMat.opacity = 0.75 * (1 - k);
      if (trailMat) trailMat.opacity = 0.9 - 0.55 * k;
      if (k < 1) this.fadeRaf = requestAnimationFrame(step);
    };
    this.fadeRaf = requestAnimationFrame(step);
  }

  dispose() {
    this.cancel();
    this.clearPath();
    this.globe.scene().remove(this.root);
    this.plane.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
