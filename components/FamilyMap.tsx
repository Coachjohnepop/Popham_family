"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { MapScope, TimelineEvent } from "@/lib/types";
import "leaflet/dist/leaflet.css";

type FamilyMapProps = {
  events: TimelineEvent[];
  year: number;
  scope: MapScope;
  activeId?: string;
};

function MapViewport({ events, scope }: { events: TimelineEvent[]; scope: MapScope }) {
  const map = useMap();

  useEffect(() => {
    if (events.length === 0) {
      map.setView(scope === "us" ? [39.8, -98.5] : [30, 10], scope === "us" ? 4 : 2);
      return;
    }
    const bounds = L.latLngBounds(events.map((e) => [e.location.lat, e.location.lng]));
    map.fitBounds(bounds.pad(0.25), { animate: true, maxZoom: scope === "us" ? 6 : 4 });
  }, [events, map, scope]);

  return null;
}

export default function FamilyMap({ events, year, scope, activeId }: FamilyMapProps) {
  const visible = useMemo(
    () =>
      events.filter(
        (event) => event.year <= year && (scope === "world" || event.location.scope === "us"),
      ),
    [events, year, scope],
  );

  const center: [number, number] = scope === "us" ? [39.8, -98.5] : [30, 10];
  const zoom = scope === "us" ? 4 : 2;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className="h-[420px] w-full rounded-3xl"
      style={{ background: "#dce9f7" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport events={visible} scope={scope} />

      {visible.map((event) => {
        const isActive = event.id === activeId;
        const isHighlight = event.famousPeople.length > 0 || event.mentionsFamily;
        const color = isActive ? "#b45309" : isHighlight ? "#7c3aed" : "#8b5e34";
        const radius = isActive ? 11 : isHighlight ? 8 : 5;

        return (
          <CircleMarker
            key={event.id}
            center={[event.location.lat, event.location.lng]}
            radius={radius}
            pathOptions={{
              color: "#fffaf2",
              weight: 2,
              fillColor: color,
              fillOpacity: isActive ? 0.95 : 0.75,
            }}
          />
        );
      })}
    </MapContainer>
  );
}