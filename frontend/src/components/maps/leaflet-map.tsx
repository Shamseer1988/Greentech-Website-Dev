"use client";

import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useRouter } from "@/i18n/navigation";
import type { MapPin } from "./map";

const QATAR: [number, number] = [25.35, 51.3];
const SINGLE_PIN_ZOOM = 14;
const AREA_ZOOM = 11; // below this, pins are grouped by area

function icon(label: string, area: boolean) {
  const element = document.createElement("span");
  element.className = area ? "map-pin map-pin-area" : "map-pin";
  element.dir = "auto";
  element.textContent = label;
  return L.divIcon({ html: element, className: "", iconSize: [0, 0] });
}

function Fit({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  // Move only when the set of pins changes, not on every render.
  const key = pins.map((p) => p.id).join();
  useEffect(() => {
    if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], SINGLE_PIN_ZOOM);
    else if (pins.length > 1) {
      map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])), {
        padding: [60, 60],
        maxZoom: 13,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function Pins({ pins }: { pins: MapPin[] }) {
  const router = useRouter();
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const shown = useMemo(() => {
    if (zoom >= AREA_ZOOM) return pins.map((pin) => ({ pin, group: null as MapPin[] | null }));
    const groups = new Map<string, MapPin[]>();
    for (const pin of pins) {
      const key = pin.area ? `area:${pin.area.slug}` : `pin:${pin.id}`;
      groups.set(key, [...(groups.get(key) ?? []), pin]);
    }
    return [...groups.values()].map((group) => ({
      pin: group[0],
      group: group[0].area ? group : null,
    }));
  }, [pins, zoom]);

  return shown.map(({ pin, group }) => {
    const area = group && pin.area;
    const label = area ? `${area.name} · ${group.length}` : pin.label;
    return (
      <Marker
        key={area ? `area:${area.slug}` : pin.id}
        position={area ? [area.lat, area.lng] : [pin.lat, pin.lng]}
        icon={icon(label, Boolean(area) || Boolean(pin.accent))}
        title={label}
        alt={label}
        riseOnHover
        interactive={Boolean(area || pin.href)}
        keyboard={Boolean(area || pin.href)}
        eventHandlers={{
          click: () => {
            if (area) {
              const bounds = L.latLngBounds(group.map((p) => [p.lat, p.lng]));
              map.setView(bounds.getCenter(), Math.max(13, map.getBoundsZoom(bounds.pad(0.3))));
            } else if (pin.href) router.push(pin.href);
          },
        }}
      />
    );
  });
}

export default function LeafletMap({ pins }: { pins: MapPin[] }) {
  return (
    <MapContainer
      center={QATAR}
      zoom={9}
      scrollWheelZoom={false}
      className="size-full"
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <Fit pins={pins} />
      <Pins pins={pins} />
    </MapContainer>
  );
}
