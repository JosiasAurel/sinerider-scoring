async function generateNewLevels(count) {
  const url = "https://sinerider-scoring.up.railway.app/generate";
  const handlers = [];
  for (let i = 0; i < count; i++) {
    handlers.push(fetch(url));
  }

  const results = await Promise.all(handlers);

  const _statuses = results.map(result => result.json());

  const statuses = await Promise.all(_statuses);

  statuses.forEach(status => console.log(status));
}

generateNewLevels(5);
