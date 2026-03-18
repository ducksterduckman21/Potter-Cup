// Potter Cup - Vercel Serverless Function
// Fetches live NCAA game data from the FREE henrygd/ncaa-api

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { gameId } = req.query;

  if (!gameId) {
    return res.status(400).json({ 
      error: 'gameId parameter required',
      example: '/api/game-stats?gameId=6412345'
    });
  }

  try {
    // Fetch game data from the FREE NCAA API
    const baseUrl = 'https://ncaa-api.henrygd.me';
    
    // Get box score (player stats)
    const boxscoreResponse = await fetch(`${baseUrl}/game/${gameId}/boxscore`);
    
    if (!boxscoreResponse.ok) {
      throw new Error(`API returned ${boxscoreResponse.status}: Game not found or unavailable`);
    }

    const boxscoreData = await boxscoreResponse.json();

    // Also get general game info for status/score
    const gameInfoResponse = await fetch(`${baseUrl}/game/${gameId}`);
    const gameInfo = gameInfoResponse.ok ? await gameInfoResponse.json() : null;

    // Parse the data into our format
    const playerStats = {
      status: gameInfo?.game?.gameState || 'unknown',
      clock: gameInfo?.game?.contestClock || '',
      home: gameInfo?.game?.home?.names?.short || '',
      away: gameInfo?.game?.away?.names?.short || '',
      score: {
        home: gameInfo?.game?.home?.score || 0,
        away: gameInfo?.game?.away?.score || 0
      },
      players: []
    };

    // Extract player stats from boxscore
    if (boxscoreData && boxscoreData.teams) {
      // Process each team's players
      Object.entries(boxscoreData.teams).forEach(([teamKey, teamData]) => {
        if (teamData && teamData.players) {
          teamData.players.forEach(player => {
            playerStats.players.push({
              name: player.name || player.Name || '',
              team: teamData.name || teamData.displayName || teamKey,
              points: parseFloat(player.PTS || player.points || 0),
              position: player.position || player.Pos || '',
              minutes: player.MIN || player.minutes || '0'
            });
          });
        }
      });
    }

    // Add metadata
    playerStats.lastUpdated = new Date().toISOString();
    playerStats.source = 'ncaa-api.henrygd.me';
    playerStats.gameId = gameId;

    return res.status(200).json(playerStats);

  } catch (error) {
    console.error('Error fetching game stats:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch game stats',
      message: error.message,
      gameId: gameId
    });
  }
}
