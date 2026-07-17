export type WorkerType = "cook" | "maid" | "driver" | "nurse" | "caregiver";

export type Worker = {
  id: string;
  name: string;
  type: WorkerType;
  rating: number;
  reliability: number;
  trust: number;
  jobs: number;
  yearsExp: number;
  zone: string;
  match: number;
  price: number;
  badges: { label: string; color: string }[];
  specialty: string;
};

const C = {
  teal: "var(--teal)",
  amber: "var(--amber)",
  blue: "#5BA8FF",
  purple: "var(--purple)",
  gold: "var(--gold)",
};

export const WORKERS: Worker[] = [
  {
    id: "meena", name: "Meena S.", type: "cook", rating: 4.9, reliability: 97, trust: 91,
    jobs: 347, yearsExp: 8, zone: "Goregaon West", match: 96, price: 220,
    specialty: "South Indian, Jain",
    badges: [
      { label: "South Indian certified", color: C.teal },
      { label: "Jain food expert", color: C.gold },
    ],
  },
  {
    id: "lakshmi", name: "Lakshmi R.", type: "maid", rating: 4.8, reliability: 95, trust: 89,
    jobs: 248, yearsExp: 6, zone: "Andheri East", match: 91, price: 210,
    specialty: "Deep cleaning",
    badges: [{ label: "Reference verified", color: C.amber }],
  },
  {
    id: "rakesh", name: "Rakesh P.", type: "driver", rating: 4.7, reliability: 93, trust: 87,
    jobs: 189, yearsExp: 5, zone: "Bandra", match: 87, price: 250,
    specialty: "Sedan / SUV",
    badges: [
      { label: "RTO verified", color: C.blue },
      { label: "Licence valid", color: C.blue },
    ],
  },
  {
    id: "asha", name: "Asha M.", type: "nurse", rating: 4.8, reliability: 96, trust: 92,
    jobs: 175, yearsExp: 7, zone: "Juhu", match: 84, price: 320,
    specialty: "Elder care",
    badges: [
      { label: "NMC registered", color: C.teal },
      { label: "GNM certified", color: C.purple },
    ],
  },
  {
    id: "sunita", name: "Sunita Devi", type: "caregiver", rating: 4.9, reliability: 98, trust: 94,
    jobs: 412, yearsExp: 9, zone: "Bengaluru South", match: 97, price: 380,
    specialty: "24/7 elder companion",
    badges: [
      { label: "24/7 live-in", color: C.teal },
      { label: "Elder care certified", color: C.purple },
    ],
  },
  {
    id: "kamla", name: "Kamla Bai", type: "caregiver", rating: 4.8, reliability: 96, trust: 91,
    jobs: 287, yearsExp: 7, zone: "Bengaluru East", match: 92, price: 350,
    specialty: "Post-op & mobility",
    badges: [
      { label: "24/7 live-in", color: C.teal },
      { label: "First-aid trained", color: C.amber },
    ],
  },
  {
    id: "ramesh", name: "Ramesh K.", type: "driver", rating: 4.8, reliability: 96, trust: 90,
    jobs: 224, yearsExp: 6, zone: "Bengaluru North", match: 93, price: 260,
    specialty: "Elder-friendly rides",
    badges: [
      { label: "RTO verified", color: C.blue },
      { label: "Elder assistance", color: C.purple },
    ],
  },
];

export function getWorker(id: string) {
  return WORKERS.find((w) => w.id === id) || WORKERS[0];
}

export const SKILL_TAGS: Record<WorkerType, { label: string; count: number }[]> = {
  cook: [
    { label: "Punctual on time", count: 43 },
    { label: "Follows recipe", count: 38 },
    { label: "Good with spices", count: 31 },
    { label: "Kitchen left clean", count: 29 },
    { label: "Authentic flavours", count: 27 },
    { label: "Good with dietary restrictions", count: 19 },
  ],
  maid: [
    { label: "Thorough cleaning", count: 52 },
    { label: "Handles valuables carefully", count: 41 },
    { label: "Trustworthy with belongings", count: 38 },
    { label: "Child-safe", count: 29 },
    { label: "Organises well", count: 24 },
    { label: "Uses products correctly", count: 21 },
  ],
  driver: [
    { label: "Smooth driver", count: 34 },
    { label: "Punctual", count: 31 },
    { label: "Respectful", count: 28 },
    { label: "Good with GPS", count: 25 },
    { label: "Good with children", count: 19 },
    { label: "Reliable for early mornings", count: 17 },
  ],
  nurse: [
    { label: "Patient with elderly", count: 28 },
    { label: "Follows medication schedule", count: 26 },
    { label: "Handles emergencies calmly", count: 22 },
    { label: "Gentle", count: 21 },
    { label: "Trustworthy", count: 19 },
    { label: "Good communication with family", count: 17 },
  ],
  caregiver: [
    { label: "Attentive 24/7", count: 61 },
    { label: "Patient with elderly", count: 54 },
    { label: "Follows medication schedule", count: 48 },
    { label: "Calm in emergencies", count: 39 },
    { label: "Warm companion", count: 34 },
    { label: "Clear updates to family abroad", count: 29 },
  ],
};

export const REVIEW_TAGS: Record<WorkerType, string[]> = {
  cook: ["Punctual on time","Followed my recipe","Good spice level","Kitchen left clean","Authentic flavours","Good with dietary restrictions","Friendly and professional"],
  maid: ["Thorough cleaning","Handled my valuables carefully","Organised my space well","Used cleaning products correctly","Good with my children","Trustworthy","Friendly and professional"],
  driver: ["Smooth driving","Punctual arrival","Respectful and polite","Followed GPS correctly","Good with my children","Reliable for early mornings","Safe driver"],
  nurse: ["Patient with my family member","Followed medication schedule exactly","Calm in difficult moments","Gentle and caring","Clear communication with me","Trustworthy with medications","Professional"],
  caregiver: ["Warm with my parents","Follows routine exactly","Sends me daily updates","Calm in emergencies","Trustworthy live-in","Patient and gentle","Professional"],
};

export type QAItem = { q: string; askerArea: string; askerBookings: number; a: string; ansArea: string; ansBookings: number };

export const QA: Record<WorkerType, QAItem[]> = {
  cook: [
    { q: "Does she cook South Indian food authentically or does she adapt it too much?", askerArea: "Bandra", askerBookings: 4, a: "Very authentic. She makes proper rasam and sambar. Does not cut corners.", ansArea: "Goregaon", ansBookings: 23 },
    { q: "Is she comfortable with Jain food restrictions — no onion, no garlic?", askerArea: "Powai", askerBookings: 2, a: "Yes, we are Jain and she has never made a mistake in 8 months.", ansArea: "Andheri", ansBookings: 11 },
    { q: "Does she clean up the kitchen properly after cooking or leave it messy?", askerArea: "Versova", askerBookings: 1, a: "Always leaves it spotless. Better than we could.", ansArea: "Juhu", ansBookings: 7 },
  ],
  maid: [
    { q: "Is she careful around fragile items and electronics?", askerArea: "Bandra", askerBookings: 3, a: "Extremely careful. She always asks before moving anything.", ansArea: "Khar", ansBookings: 14 },
    { q: "Can she handle deep cleaning of bathrooms thoroughly?", askerArea: "Andheri", askerBookings: 2, a: "Yes, bathrooms come out sparkling. Worth the time she takes.", ansArea: "Vile Parle", ansBookings: 9 },
    { q: "Is she comfortable working when only my children are home?", askerArea: "Juhu", askerBookings: 5, a: "We trust her completely with our kids. Very gentle.", ansArea: "Santacruz", ansBookings: 16 },
  ],
  driver: [
    { q: "Is he punctual for 6 AM airport pickups?", askerArea: "Powai", askerBookings: 2, a: "Always 10 minutes early. Never missed a single pickup.", ansArea: "Bandra", ansBookings: 18 },
    { q: "Does he drive smoothly on highways with elderly passengers?", askerArea: "Andheri", askerBookings: 1, a: "Very smooth. My mother-in-law actually fell asleep.", ansArea: "Khar", ansBookings: 12 },
    { q: "Is he comfortable with long inter-city trips?", askerArea: "Juhu", askerBookings: 3, a: "Did Mumbai-Pune-Mumbai with us. Totally professional.", ansArea: "Versova", ansBookings: 8 },
  ],
  nurse: [
    { q: "Is she patient with a dementia patient who can be difficult?", askerArea: "Bandra", askerBookings: 2, a: "Incredibly patient. Never raises her voice.", ansArea: "Juhu", ansBookings: 11 },
    { q: "Does she follow exact medication timings without reminders?", askerArea: "Khar", askerBookings: 1, a: "Sets her own alarms. Never missed a dose in 6 months.", ansArea: "Andheri", ansBookings: 9 },
    { q: "Can she handle minor medical emergencies calmly?", askerArea: "Powai", askerBookings: 3, a: "Handled a fall incident better than we could have. Stays calm.", ansArea: "Goregaon", ansBookings: 7 },
  ],
  caregiver: [
    { q: "Is she comfortable being live-in for weeks at a time?", askerArea: "San Jose", askerBookings: 3, a: "She has been live-in with my parents for 4 months. Zero issues.", ansArea: "Bengaluru", ansBookings: 14 },
    { q: "Does she share daily updates I can see from the US?", askerArea: "New Jersey", askerBookings: 2, a: "Yes — photos and a short note every evening. Very reassuring.", ansArea: "Bengaluru", ansBookings: 9 },
    { q: "How does she handle medical emergencies when family is asleep abroad?", askerArea: "London", askerBookings: 1, a: "She called the doctor first, then messaged us with the plan. Handled it beautifully.", ansArea: "Bengaluru", ansBookings: 7 },
  ],
};

// 0 = no booking, 1 = completed, 2 = late, 3 = no-show
export function reliabilityLog(seed: number): number[] {
  const out: number[] = [];
  let s = seed || 1;
  for (let i = 0; i < 30; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    if (r < 0.12) out.push(0);
    else if (r < 0.92) out.push(1);
    else if (r < 0.99) out.push(2);
    else out.push(3);
  }
  return out;
}
