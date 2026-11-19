// Seed data generator for Workout Tracker
// Usage: node scripts/seed.js
// Then paste the output into browser console (F12 → Console)

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function randomTime() {
  const h = 6 + Math.floor(Math.random() * 14);
  const m = Math.floor(Math.random() * 12) * 5;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const exerciseConfigs = [
  {
    key: 'pullups',
    repsGen: () => [6 + ~~(Math.random() * 6), 5 + ~~(Math.random() * 6), 4 + ~~(Math.random() * 5), 3 + ~~(Math.random() * 4)],
    weightChance: 0.15,
  },
  {
    key: 'pushups',
    repsGen: () => [12 + ~~(Math.random() * 10), 10 + ~~(Math.random() * 8), 8 + ~~(Math.random() * 6)],
    weightChance: 0.2,
  },
  {
    key: 'dips',
    repsGen: () => [5 + ~~(Math.random() * 5), 6 + ~~(Math.random() * 5), 4 + ~~(Math.random() * 4), 5 + ~~(Math.random() * 4)],
    weightChance: 0.25,
  },
  {
    key: 'squats',
    repsGen: () => [15 + ~~(Math.random() * 10), 12 + ~~(Math.random() * 8), 10 + ~~(Math.random() * 8)],
    weightChance: 0.3,
  },
];

function makeApproaches(repsArr, exConfig) {
  return repsArr.map((reps) => {
    const hasExtra = Math.random() < exConfig.weightChance;
    return {
      id: genId(),
      reps,
      hasExtraWeight: hasExtra,
      extraWeightKg: hasExtra ? [2, 5, 7, 10][~~(Math.random() * 4)] : 0,
    };
  });
}

// Use fixed seed for reproducibility across runs
function generateWorkouts(count = 15) {
  const workouts = [];
  for (let i = count - 1; i >= 0; i--) {
    const days = i === 0 ? 0 : i === 1 ? 1 : Math.max(1, ~~(Math.random() * 4));
    const date = daysAgo(days);
    const numResults = 1 + ~~(Math.random() * 3);
    const results = [];
    const usedKeys = new Set();

    for (let j = 0; j < numResults; j++) {
      let ex;
      let attempts = 0;
      do {
        ex = exerciseConfigs[~~(Math.random() * exerciseConfigs.length)];
        attempts++;
      } while (usedKeys.has(ex.key) && attempts < 10);
      usedKeys.add(ex.key);

      results.push({
        exerciseKey: ex.key,
        approaches: makeApproaches(ex.repsGen(), ex),
      });
    }

    workouts.push({
      id: genId(),
      date,
      time: randomTime(),
      results,
    });
  }
  return workouts;
}

const workouts = generateWorkouts(15);

// Output as a ready-to-paste snippet
console.log(
  '%c=== PASTE THIS INTO BROWSER CONSOLE (F12 → Console) ===%',
  'font-weight:bold;font-size:14px'
);
console.log(`
localStorage.setItem('workout-tracker-data', ${JSON.stringify(workouts, null, 2)});
`);

console.log(`
%c✓ Generated ${workouts.length} workouts (${workouts.reduce((s, w) => s + w.results.length, 0)} exercise entries)%c`,
  'font-weight:bold;color:#6ee7b7',
  ''
);
console.log('Paste the code above into the browser console to seed the data.');
