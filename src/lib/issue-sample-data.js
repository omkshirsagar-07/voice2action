import { getCityMapConfig } from "./city-map";

let cityMap = getCityMapConfig();

export let sampleIssueData = [
  {
    title: "Overflowing garbage mound near CIDCO bus stop",
    description:
      "Garbage has not been collected for two days and waste is spilling onto the service lane, causing odor and stray animal activity.",
    category: "Garbage",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80",
    city: "CIDCO",
    coordinates: [75.3449, 19.8728],
    votes: 19,
    priorityScore: 28,
    createdAt: new Date("2026-05-05T08:25:00.000Z"),
  },
  {
    title: "Large pothole cluster on Jalna Road",
    description:
      "Multiple deep potholes near the signal are forcing vehicles into sudden lane changes and creating a dangerous bottleneck during peak hours.",
    category: "Road Damage",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
    city: "Jalna Road",
    coordinates: [75.3534, 19.8803],
    votes: 24,
    priorityScore: 31,
    createdAt: new Date("2026-05-05T05:40:00.000Z"),
  },
  {
    title: "Water pipeline leakage near Kranti Chowk",
    description:
      "A steady underground leak is flooding the footpath and wasting clean water. The surrounding surface is slippery for pedestrians.",
    category: "Water Leakage",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1542228262-3d663b306a53?auto=format&fit=crop&w=900&q=80",
    city: "Kranti Chowk",
    coordinates: [75.3315, 19.8836],
    votes: 16,
    priorityScore: 24,
    createdAt: new Date("2026-05-05T10:10:00.000Z"),
  },
  {
    title: "Dark stretch with failed street lights at Osmanpura",
    description:
      "Three consecutive poles are not working on the internal road, leaving the area poorly lit and unsafe for walkers after sunset.",
    category: "Street Light",
    status: "resolved",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    city: "Osmanpura",
    coordinates: [75.3219, 19.8671],
    votes: 11,
    priorityScore: 18,
    createdAt: new Date("2026-05-04T18:30:00.000Z"),
  },
  {
    title: "Traffic signal congestion near Prozone Mall",
    description:
      "Signal timing is causing unusually long queues and vehicles are blocking the intersection during office commute hours.",
    category: "Traffic",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=900&q=80",
    city: "Prozone Mall",
    coordinates: [75.3706, 19.8948],
    votes: 13,
    priorityScore: 22,
    createdAt: new Date("2026-05-05T07:55:00.000Z"),
  },
  {
    title: "Drainage gully blocked after heavy rain near Anand Nagar",
    description:
      "Stormwater drains are clogged with debris and leaves, causing water to pool around the bus stop and subway entrance.",
    category: "Drainage",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
    city: "Anand Nagar",
    coordinates: [75.3569, 19.8773],
    votes: 22,
    priorityScore: 30,
    createdAt: new Date("2026-05-05T09:20:00.000Z"),
  },
  {
    title: "Unauthorized construction debris blocking footpath near Panchavati",
    description:
      "Builders have dumped concrete fragments and sand on the pavement, forcing pedestrians into the road.",
    category: "Construction",
    status: "pending",
    image:
      "https://images.unsplash.com/photo-1529429614666-705d36b88c8f?auto=format&fit=crop&w=900&q=80",
    city: "Panchavati",
    coordinates: [75.3482, 19.8696],
    votes: 15,
    priorityScore: 23,
    createdAt: new Date("2026-05-05T10:50:00.000Z"),
  },
].map(function mapSampleIssue(issue) {
  return {
    ...issue,
    cityKey: cityMap.key,
    locationAccuracy: 12,
    source: "sample-seed",
  };
});
