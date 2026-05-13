export type Category =
  | "Garbage"
  | "Road Damage"
  | "Water Leakage"
  | "Street Light"
  | "Traffic"
  | string;

export type Status = "pending" | "resolved";

export interface Coordinates {
  type: "Point";
  coordinates: [number, number];
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  lat: number;
  lng: number;
  coordinates: Coordinates;
  city: string;
  cityKey: string;
  locationAccuracy: number;
  image?: string;
  votes: number;
  priorityScore: number;
  priorityBand: "low" | "medium" | "high";
  createdAt: string;
}
