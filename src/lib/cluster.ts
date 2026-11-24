import type { Place } from '../data/types';
import { centralAngle } from './geo';

export interface Cluster {
  id: string;
  lat: number;
  lng: number;
  places: Place[];
}

/** Kamera balandligiga mos guruhlash radiusi (gradus). Taxminan ekranda ~28px ga teng. */
export function clusterRadiusDeg(altitude: number, viewportHeight: number): number {
  const base = altitude < 1 ? 1.9 * altitude : 1.9 * altitude + (altitude - 1) * 2.5;
  return base * (800 / Math.max(360, viewportHeight));
}

/** Oddiy ochko'z (greedy) klasterlash — 100–1000 ta nuqta uchun juda tez */
export function clusterPlaces(places: Place[], radiusDeg: number): Cluster[] {
  const r = (radiusDeg * Math.PI) / 180;
  const clusters: Cluster[] = [];
  for (const p of places) {
    let target: Cluster | undefined;
    for (const c of clusters) {
      if (centralAngle(c, p) < r) {
        target = c;
        break;
      }
    }
    if (target) {
      target.places.push(p);
      const n = target.places.length;
      target.lat += (p.lat - target.lat) / n;
      target.lng += (p.lng - target.lng) / n;
    } else {
      clusters.push({ id: p.id, lat: p.lat, lng: p.lng, places: [p] });
    }
  }
  for (const c of clusters) if (c.places.length > 1) c.id = 'c:' + c.places.map((p) => p.id).sort().join(',');
  return clusters;
}

/** Klaster nuqtalari ajralib ko'rinishi uchun kerakli balandlik */
export function altitudeToSplit(cluster: Cluster): number {
  let maxD = 0;
  for (const p of cluster.places) maxD = Math.max(maxD, centralAngle(cluster, p));
  const deg = (maxD * 180) / Math.PI;
  return Math.max(0.012, Math.min(1.6, deg * 0.4));
}
