"use client";

import L from "leaflet";
import { Maximize, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { typeIcon } from "@/lib/type-icons";

export type MapProperty = {
  code: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
  type: string;
  area: string;
  reserved: boolean;
};

type Props = {
  properties: MapProperty[];
  selected: string | null;
  onSelect: (code: string | null) => void;
  labels: { zoomIn: string; zoomOut: string; showAll: string };
};

const QATAR: [number, number] = [25.35, 51.3];
const GROUP_PIXELS = 94; // pins closer than this are shown as one circle
const ALWAYS_SINGLE_ZOOM = 17;
const DETAIL_ZOOM = 15;
const SVG = "http://www.w3.org/2000/svg";

function pinIcon(property: MapProperty, active: boolean): L.DivIcon {
  const pin = document.createElement("span");
  pin.className = `price-pin${active ? " is-active" : ""}${property.reserved ? " is-reserved" : ""}`;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", typeIcon(property.type));
  svg.append(path);
  const text = document.createElement("span");
  text.dir = "auto";
  text.textContent = property.label;
  pin.append(svg, text);
  return L.divIcon({ html: pin, className: "", iconSize: [0, 0] });
}

function groupIcon(count: number, name: string): L.DivIcon {
  const pin = document.createElement("span");
  pin.className = "group-pin";
  const number = document.createElement("strong");
  number.textContent = String(count);
  const text = document.createElement("span");
  text.textContent = name;
  pin.append(number, text);
  return L.divIcon({ html: pin, className: "", iconSize: [0, 0] });
}

const boundsOf = (items: MapProperty[]) =>
  L.latLngBounds(items.map((p): [number, number] => [p.lat, p.lng]));

function showAll(map: L.Map, items: MapProperty[]) {
  const { x, y } = map.getSize();
  const padding: [number, number] = [Math.min(80, x / 6), Math.min(80, y / 5)];
  if (items.length) map.fitBounds(boundsOf(items), { padding, maxZoom: 14 });
  else map.setView(QATAR, 9);
}

function Camera({ properties, selected }: Pick<Props, "properties" | "selected">) {
  const map = useMap();
  const reduced = useReducedMotion();
  const key = properties.map((p) => p.code).join();

  useEffect(() => {
    showAll(map, properties);
    // Move only when the set of properties changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  useEffect(() => {
    const property = properties.find((p) => p.code === selected);
    if (!property) return;
    const zoom = Math.max(map.getZoom(), DETAIL_ZOOM);
    map.flyTo([property.lat, property.lng], zoom, { animate: !reduced, duration: 0.9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, map]);

  // The map must know its size again when the phone turns or the panel changes.
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function Pins({ properties, selected, onSelect }: Omit<Props, "labels">) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()), click: () => onSelect(null) });

  const groups = useMemo(() => {
    const result: { point: L.Point; items: MapProperty[] }[] = [];
    for (const property of properties) {
      const point = map.project([property.lat, property.lng], zoom);
      const near =
        zoom < ALWAYS_SINGLE_ZOOM && property.code !== selected
          ? result.find(
              (g) => g.items[0].code !== selected && g.point.distanceTo(point) < GROUP_PIXELS,
            )
          : undefined;
      if (near) near.items.push(property);
      else result.push({ point, items: [property] });
    }
    return result;
  }, [properties, selected, zoom, map]);

  return groups.map(({ items }) => {
    const [first] = items;
    if (items.length === 1) {
      const active = first.code === selected;
      return (
        <Marker
          key={first.code}
          position={[first.lat, first.lng]}
          icon={pinIcon(first, active)}
          title={first.title}
          alt={first.title}
          riseOnHover
          zIndexOffset={active ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(first.code) }}
        />
      );
    }
    const areas = [...new Set(items.map((p) => p.area))];
    const name = areas.length <= 2 ? areas.join(" · ") : "";
    return (
      <Marker
        key={`group:${items.map((p) => p.code).join()}`}
        // The first pin, not the middle: so circles keep their distance from each other.
        position={[first.lat, first.lng]}
        icon={groupIcon(items.length, name)}
        title={`${name} ${items.length}`.trim()}
        alt={`${name} ${items.length}`.trim()}
        riseOnHover
        eventHandlers={{
          click: () => {
            const bounds = boundsOf(items);
            const fit = map.getBoundsZoom(bounds.pad(0.4));
            map.setView(bounds.getCenter(), Math.min(18, Math.max(fit, map.getZoom() + 1)));
          },
        }}
      />
    );
  });
}

function Controls({ properties, labels }: Pick<Props, "properties" | "labels">) {
  const map = useMap();
  const button =
    "flex size-11 items-center justify-center text-slate transition-colors hover:bg-tint hover:text-green-700";
  return (
    // Leaflet must not treat these clicks as clicks on the map.
    <div
      ref={(element) => {
        if (element) L.DomEvent.disableClickPropagation(element);
      }}
      className="absolute end-4 top-4 z-[800] flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-white shadow-[0_10px_30px_rgb(4_29_21/.18)]"
    >
      <button type="button" aria-label={labels.zoomIn} title={labels.zoomIn} className={button} onClick={() => map.zoomIn()}>
        <Plus className="size-5" />
      </button>
      <button type="button" aria-label={labels.zoomOut} title={labels.zoomOut} className={button} onClick={() => map.zoomOut()}>
        <Minus className="size-5" />
      </button>
      <button type="button" aria-label={labels.showAll} title={labels.showAll} className={button} onClick={() => showAll(map, properties)}>
        <Maximize className="size-4.5" />
      </button>
    </div>
  );
}

export default function PropertyMap({ properties, selected, onSelect, labels }: Props) {
  return (
    <MapContainer center={QATAR} zoom={9} zoomControl={false} className="premium-map size-full">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <Camera properties={properties} selected={selected} />
      <Pins properties={properties} selected={selected} onSelect={onSelect} />
      <Controls properties={properties} labels={labels} />
    </MapContainer>
  );
}
