import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import GlobeGL, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import type { Lang, Place } from '../data/types';
import { countryFlag, countryName } from '../data/countries';
import { CATEGORY_COLOR } from '../lib/categories';
import { altitudeToSplit, clusterPlaces, clusterRadiusDeg, type Cluster } from '../lib/cluster';
import { sunPosition, type LatLng } from '../lib/geo';
import { PlaneAnimator, type FlightOptions } from './PlaneAnimation';

export type LightMode = 'real' | 'day' | 'night';

export interface GlobeHandle {
  flyTo(from: LatLng, to: LatLng, opts?: FlightOptions): Promise<void>;
  cancelFlight(): void;
  pointOfView(pov: { lat?: number; lng?: number; altitude?: number }, ms?: number): void;
  getPointOfView(): { lat: number; lng: number; altitude: number };
  nudge(dLat: number, dLng: number): void;
  zoomBy(factor: number): void;
}

interface Props {
  places: Place[];
  selectedId: string | null;
  lightMode: LightMode;
  autoRotate: boolean;
  lang: Lang;
  name: (p: Place) => string;
  clusterLabel: (n: number) => string;
  onPlaceClick: (p: Place) => void;
  onReady: () => void;
  /** Panel ochilganda globusni chetga surish (piksel) */
  offset?: [number, number];
  showAtmosphere?: boolean;
  showGraticules?: boolean;
}

const IS_MOBILE = typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768);
const TEXTURE_MAX = IS_MOBILE ? 2048 : 4096;
const TEX = {
  day: '/textures/earth-blue-marble.jpg',
  night: '/textures/earth-night.jpg',
  sky: '/textures/night-sky.png',
};

/** Teksturani qurilmaga mos o'lchamda yuklash (telefonda 2048px gacha kichraytiriladi) */
function loadAdaptiveTexture(url: string, maxSize: number): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      let source: HTMLImageElement | HTMLCanvasElement = img;
      if (img.width > maxSize) {
        const c = document.createElement('canvas');
        c.width = maxSize;
        c.height = Math.round((img.height / img.width) * maxSize);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        source = c;
      }
      const tex = new THREE.Texture(source);
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      resolve(tex);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function solidTexture(hex: number) {
  const c = new THREE.Color(hex);
  const data = new Uint8Array([c.r * 255, c.g * 255, c.b * 255, 255]);
  const t = new THREE.DataTexture(data, 1, 1);
  t.needsUpdate = true;
  return t;
}

/** Kunduz/tun shader: quyosh yo'nalishiga qarab kunduzgi va tungi (shahar chiroqlari) teksturalarni aralashtiradi */
function createDayNightMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      dayTex: { value: solidTexture(0x0e2350) },
      nightTex: { value: solidTexture(0x050a1a) },
      sunDir: { value: new THREE.Vector3(1, 0, 0) },
      mode: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D dayTex;
      uniform sampler2D nightTex;
      uniform vec3 sunDir;
      uniform float mode; // 0 = haqiqiy vaqt, 1 = kunduz, 2 = tun
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vec3 day = texture2D(dayTex, vUv).rgb;
        vec3 night = texture2D(nightTex, vUv).rgb;
        float intensity = dot(normalize(vNormalW), normalize(sunDir));
        float k = smoothstep(-0.12, 0.2, intensity);
        vec3 dayLit = day * (0.62 + 0.5 * max(intensity, 0.0));
        if (mode > 1.5) { k = 0.0; }
        else if (mode > 0.5) { k = 1.0; dayLit = day * 1.03; }
        vec3 nightCol = night * 1.35 + day * 0.05;
        gl_FragColor = vec4(mix(nightCol, dayLit, k), 1.0);
      }
    `,
  });
}

function altBucket(alt: number) {
  return Math.round(Math.log2(Math.max(alt, 0.005)) * 3);
}

export const Globe = forwardRef<GlobeHandle, Props>(function Globe(
  { places, selectedId, lightMode, autoRotate, lang, name, clusterLabel, onPlaceClick, onReady, offset = [0, 0], showAtmosphere = true, showGraticules = false },
  ref,
) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const animatorRef = useRef<PlaneAnimator | null>(null);
  const material = useMemo(createDayNightMaterial, []);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [bucket, setBucket] = useState(altBucket(2.5));
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const autoRotateRef = useRef(autoRotate);
  const resumeTimer = useRef<number | undefined>(undefined);
  const selectedIdRef = useRef(selectedId);

  // Eng so'nggi callback'larni ref'da saqlaymiz — HTML elementlar qayta yaratilmasligi uchun
  const handlers = useRef({ onPlaceClick, name, clusterLabel });
  handlers.current = { onPlaceClick, name, clusterLabel };

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Teksturalar
  useEffect(() => {
    let alive = true;
    const max = Math.min(TEXTURE_MAX, globeRef.current?.renderer().capabilities.maxTextureSize ?? TEXTURE_MAX);
    Promise.all([loadAdaptiveTexture(TEX.day, max), loadAdaptiveTexture(TEX.night, max)])
      .then(([day, night]) => {
        if (!alive) return;
        material.uniforms.dayTex.value = day;
        material.uniforms.nightTex.value = night;
      })
      .catch((e) => console.warn('Tekstura yuklanmadi', e));
    return () => {
      alive = false;
    };
  }, [material]);

  // Kunduz/tun rejimi va quyosh holati
  useEffect(() => {
    material.uniforms.mode.value = lightMode === 'real' ? 0 : lightMode === 'day' ? 1 : 2;
    const update = () => {
      const g = globeRef.current;
      if (!g) return;
      const s = sunPosition();
      const c = g.getCoords(s.lat, s.lng, 0);
      material.uniforms.sunDir.value.set(c.x, c.y, c.z).normalize();
    };
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [lightMode, material]);

  // Avtomatik aylanish
  useEffect(() => {
    autoRotateRef.current = autoRotate;
    const c = globeRef.current?.controls();
    if (c) c.autoRotate = autoRotate;
  }, [autoRotate]);

  const handleReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    g.renderer().setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
    const c = g.controls();
    c.autoRotate = autoRotateRef.current;
    c.autoRotateSpeed = 0.35;
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = g.getGlobeRadius() * 1.012;
    c.maxDistance = g.getGlobeRadius() * 6;
    c.addEventListener('start', () => {
      c.autoRotate = false;
      window.clearTimeout(resumeTimer.current);
    });
    c.addEventListener('end', () => {
      window.clearTimeout(resumeTimer.current);
      resumeTimer.current = window.setTimeout(() => {
        if (autoRotateRef.current && !animatorRef.current?.flying) c.autoRotate = true;
      }, 7000);
    });
    animatorRef.current = new PlaneAnimator(g);
    const s = sunPosition();
    const sc = g.getCoords(s.lat, s.lng, 0);
    material.uniforms.sunDir.value.set(sc.x, sc.y, sc.z).normalize();
    onReady();
  }, [material, onReady]);

  useEffect(() => () => animatorRef.current?.dispose(), []);

  useImperativeHandle(
    ref,
    () => ({
      async flyTo(from, to, opts) {
        const g = globeRef.current;
        const a = animatorRef.current;
        if (!g || !a) return;
        g.controls().autoRotate = false;
        await a.fly(from, to, opts);
      },
      cancelFlight() {
        animatorRef.current?.cancel();
      },
      pointOfView(pov, ms = 0) {
        globeRef.current?.pointOfView(pov, ms);
      },
      getPointOfView() {
        return globeRef.current?.pointOfView() ?? { lat: 0, lng: 0, altitude: 2.5 };
      },
      nudge(dLat, dLng) {
        const g = globeRef.current;
        if (!g) return;
        const p = g.pointOfView();
        const k = Math.min(1, p.altitude / 2);
        g.pointOfView({ lat: Math.max(-85, Math.min(85, p.lat + dLat * k)), lng: p.lng + dLng * k }, 300);
      },
      zoomBy(f) {
        const g = globeRef.current;
        if (!g) return;
        const p = g.pointOfView();
        g.pointOfView({ altitude: Math.max(0.012, Math.min(5, p.altitude * f)) }, 300);
      },
    }),
    [],
  );

  // Klasterlash: faqat balandlik "pog'onasi" o'zgarganda qayta hisoblanadi
  const clusters = useMemo(() => {
    const alt = 2 ** (bucket / 3);
    // O'zbekiston joylari birinchi — ular klaster markazi bo'lib qoladi
    const sorted = [...places].sort((a, b) => Number(b.country === 'UZ') - Number(a.country === 'UZ'));
    return clusterPlaces(sorted, clusterRadiusDeg(alt, size.h));
    // lang ham bog'liqlik: yorliqlar tilini yangilash uchun yangi obyektlar kerak
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, bucket, size.h, lang]);

  const handleZoom = useCallback((pov: { altitude: number }) => {
    const b = altBucket(pov.altitude);
    setBucket((prev) => (prev === b ? prev : b));
  }, []);

  const makeElement = useCallback((d: object) => {
    const cl = d as Cluster;
    const el = document.createElement('button');
    el.type = 'button';
    el.style.pointerEvents = 'auto';
    const { name: nm, clusterLabel: cLabel } = handlers.current;

    if (cl.places.length === 1) {
      const p = cl.places[0];
      const label = `${nm(p)} — ${countryName(p.country, lang)}`;
      el.className = 'gm' + (p.country === 'UZ' ? ' gm-uz' : '') + (p.id === selectedIdRef.current ? ' is-selected' : '');
      el.style.setProperty('--c', CATEGORY_COLOR[p.category]);
      el.setAttribute('aria-label', label);
      el.innerHTML = `<span class="gm-pulse"></span><span class="gm-dot"></span><span class="gm-tip" role="presentation"><b></b><small></small></span>`;
      el.querySelector('b')!.textContent = nm(p);
      el.querySelector('small')!.textContent = `${countryFlag(p.country)} ${countryName(p.country, lang)}`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.current.onPlaceClick(p);
      });
      elementsRef.current.set(p.id, el);
    } else {
      const label = cLabel(cl.places.length);
      el.className = 'gm gm-cluster' + (cl.places.some((p) => p.country === 'UZ') ? ' gm-uz' : '');
      el.setAttribute('aria-label', label + ': ' + cl.places.map((p) => nm(p)).join(', '));
      el.innerHTML = `<span class="gm-count"></span><span class="gm-tip" role="presentation"><b></b><small></small></span>`;
      el.querySelector('.gm-count')!.textContent = String(cl.places.length);
      const names = cl.places.slice(0, 4).map((p) => nm(p)).join(' · ');
      el.querySelector('b')!.textContent = names + (cl.places.length > 4 ? ' …' : '');
      el.querySelector('small')!.textContent = label;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = globeRef.current;
        if (!g) return;
        g.controls().autoRotate = false;
        // Kamida 2 baravar yaqinlashamiz, aks holda katta klasterlarda kamera deyarli joyidan qimirlamaydi
        const altitude = Math.max(0.012, Math.min(altitudeToSplit(cl), g.pointOfView().altitude * 0.45));
        g.pointOfView({ lat: cl.lat, lng: cl.lng, altitude }, 900);
      });
    }
    return el;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Tanlangan nuqtani elementlarni qayta yaratmasdan belgilaymiz
  useEffect(() => {
    selectedIdRef.current = selectedId;
    elementsRef.current.forEach((el, id) => el.classList.toggle('is-selected', id === selectedId));
  }, [selectedId]);

  // Globusning orqa tomonidagi nuqtalarni yashiramiz (chizilmaydi, Tab bilan ham tanlanmaydi)
  const visibilityModifier = useCallback((el: HTMLElement, visible: boolean) => {
    el.classList.toggle('is-hidden', !visible);
    el.tabIndex = visible ? 0 : -1;
    el.setAttribute('aria-hidden', String(!visible));
  }, []);

  return (
    <GlobeGL
      ref={globeRef}
      width={size.w}
      height={size.h}
      globeOffset={offset}
      backgroundColor="#03050f"
      backgroundImageUrl={TEX.sky}
      globeMaterial={material}
      showAtmosphere={showAtmosphere}
      showGraticules={showGraticules}
      atmosphereColor="#3fb8ff"
      atmosphereAltitude={0.2}
      rendererConfig={{ antialias: !IS_MOBILE, powerPreference: 'high-performance' }}
      onGlobeReady={handleReady}
      onZoom={handleZoom}
      htmlElementsData={clusters}
      htmlLat={(d) => (d as Cluster).lat}
      htmlLng={(d) => (d as Cluster).lng}
      htmlAltitude={0.006}
      htmlElement={makeElement}
      htmlElementVisibilityModifier={visibilityModifier}
      htmlTransitionDuration={0}
    />
  );
});
