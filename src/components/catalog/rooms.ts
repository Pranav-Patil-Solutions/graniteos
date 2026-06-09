import type { Pt } from "@/lib/stone-texture";

export type Room = {
  id: string;
  label: string;
  surface: string; // shown to the user
  src: string;
  /** Surface quad as fractions of image w/h, order TL, TR, BR, BL. */
  mask: [Pt, Pt, Pt, Pt];
  /** Strength of the photo's shadow multiply over the stone (0..1). */
  shadow: number;
};

// Free, curated "template rooms" — surfaces pre-masked once (how MSI/Caesarstone do it).
export const ROOMS: Room[] = [
  {
    id: "kitchen-1",
    label: "Kitchen island",
    surface: "countertop",
    src: "/rooms/room-kitchen-1.jpg",
    mask: [
      { x: 0.15, y: 0.63 },
      { x: 0.83, y: 0.6 },
      { x: 0.93, y: 0.74 },
      { x: 0.12, y: 0.82 },
    ],
    shadow: 0.55,
  },
  {
    id: "kitchen-2",
    label: "Modern kitchen",
    surface: "countertop",
    src: "/rooms/room-kitchen-2.jpg",
    mask: [
      { x: 0.0, y: 0.62 },
      { x: 0.6, y: 0.61 },
      { x: 0.52, y: 0.9 },
      { x: 0.0, y: 0.82 },
    ],
    shadow: 0.55,
  },
  {
    id: "bath",
    label: "Bathroom vanity",
    surface: "vanity top",
    src: "/rooms/room-bath.jpg",
    mask: [
      { x: 0.03, y: 0.66 },
      { x: 0.43, y: 0.69 },
      { x: 0.45, y: 0.83 },
      { x: 0.0, y: 0.8 },
    ],
    shadow: 0.5,
  },
  {
    id: "floor",
    label: "Living-room floor",
    surface: "floor",
    src: "/rooms/room-floor.jpg",
    mask: [
      { x: 0.45, y: 0.7 },
      { x: 1.0, y: 0.68 },
      { x: 1.0, y: 1.0 },
      { x: 0.3, y: 1.0 },
    ],
    shadow: 0.5,
  },
];
