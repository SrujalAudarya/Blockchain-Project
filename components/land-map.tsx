"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Land } from "@/lib/types";
import { shortenAddress, formatCurrency } from "@/components/shared";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const pickerIcon = new L.DivIcon({
  className: "",
  html: '<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#1e40af;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

function RecenterMap({ land }: { land: Land | null }) {
  const map = useMap();
  useEffect(() => {
    if (land && land.latitude !== null && land.longitude !== null) {
      map.flyTo([land.latitude, land.longitude], 13, { duration: 0.6 });
    }
  }, [land, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type MappedLand = Land & { latitude: number; longitude: number };

function filterMapped(lands: Land[]): MappedLand[] {
  return lands.filter((l): l is MappedLand => l.latitude !== null && l.longitude !== null);
}

export function LandMap({
  lands,
  selectedId,
  onSelect,
  className,
}: {
  lands: Land[];
  selectedId?: number;
  onSelect?: (land: Land) => void;
  className?: string;
}) {
  const mappedLands = filterMapped(lands);
  const selectedLand = mappedLands.find((l) => l.id === selectedId) ?? null;

  return (
    <div key="land-map" className={className ?? "h-[360px]"}>
      <MapContainer center={[22.8, 78.9]} zoom={5} scrollWheelZoom className="h-full w-full rounded-lg">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap land={selectedLand} />
        {mappedLands.map((land) => (
          <Marker
            key={land.id}
            position={[land.latitude, land.longitude]}
            icon={markerIcon}
            eventHandlers={{ click: () => onSelect?.(land) }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <strong>Land #{land.id}</strong>
                <p className="mt-1 text-sm">{land.location}</p>
                <p className="mt-0.5 text-xs text-gray-500">{formatCurrency(land.marketValue)} &middot; Owner {shortenAddress(land.currentOwner)}</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-blue-700 underline"
                  onClick={() => onSelect?.(land)}
                >
                  View record
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export function LandMapPicker({
  latitude,
  longitude,
  onPick,
  className,
}: {
  latitude: number | null;
  longitude: number | null;
  onPick: (lat: number, lng: number) => void;
  className?: string;
}) {
  const hasCoords = latitude !== null && longitude !== null;
  const center: [number, number] = hasCoords ? [latitude!, longitude!] : [22.8, 78.9];
  const zoom = hasCoords ? 14 : 5;

  return (
    <div key="land-map-picker" className={className ?? "h-[300px]"}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full rounded-lg">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        {hasCoords && <Marker position={[latitude!, longitude!]} icon={pickerIcon} />}
      </MapContainer>
    </div>
  );
}
