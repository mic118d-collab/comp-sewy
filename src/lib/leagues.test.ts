import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  RFF_FEDERATION_LOGO_URL,
  UNKNOWN_TEAM_ROLE,
  applyMatchResultToLeague,
  applyTeamRollToPlayer,
  buildInitialLeagues,
  computeClubStanding,
  filterLeaguesAndClubs,
  findOfficialClubByName,
  getCandidateClubsForRoll,
  getStandingZoneInfo,
  getTeamRoleLabel,
  isPlayerTeamRolled,
  needsCircularBadgeMask,
  pickRolledClub,
  resetLeagueStandings,
  sortLeagueClubs,
} from './leagues';
import {
  AVATAR_REFRESH_INTERVAL_MS,
  buildInitialHierarchyAccounts,
  buildInitialPlayers,
  mergeHierarchyAvatarUpdates,
  mergePlayerAvatarUpdates,
} from './rosterSeed';

test('RFF League Standings initializes 4 strictly separate leagues with 8 clubs each (32 clubs total, Spanish league removed) at Pre-Season 0 stats', () => {
  const leagues = buildInitialLeagues();
  assert.equal(leagues.length, 4);

  const expectedNames = [
    'Deutscher Fußball-Liga',
    'Italia Professionale Divisione',
    'Ligue La Premiere',
    'English Elite Conference',
  ];
  assert.deepEqual(
    leagues.map((l) => l.name),
    expectedNames
  );
  assert.equal(
    leagues.some((l) => l.name.toLowerCase().includes('espanola') || l.id.includes('espanola')),
    false,
    'Spanish league must be completely removed'
  );

  const seenClubIds = new Set<string>();
  const seenClubNames = new Set<string>();

  for (const league of leagues) {
    assert.equal(league.clubs.length, 8, `${league.name} must contain exactly 8 clubs`);
    for (const club of league.clubs) {
      assert.equal(club.leagueId, league.id, `${club.name} must stay strictly in ${league.name}`);
      assert.equal(seenClubIds.has(club.id), false, `Duplicate club id ${club.id}`);
      assert.equal(seenClubNames.has(club.name), false, `Duplicate club name ${club.name}`);
      seenClubIds.add(club.id);
      seenClubNames.add(club.name);

      assert.equal(club.played, 0);
      assert.equal(club.wins, 0);
      assert.equal(club.draws, 0);
      assert.equal(club.losses, 0);
      assert.equal(club.goalsFor, 0);
      assert.equal(club.goalsAgainst, 0);
      assert.equal(club.goalDifference, 0);
      assert.equal(club.points, 0);
    }
  }

  assert.equal(seenClubIds.size, 32);

  // Verify R.C. Palmont is inside Ligue La Premiere with its official uploaded crest
  const liguePremiere = leagues.find((l) => l.id === 'ligue-la-premiere')!;
  const palmont = liguePremiere.clubs.find((c) => c.name === 'R.C. Palmont');
  assert.ok(palmont, 'R.C. Palmont must be in Ligue La Premiere');
  assert.equal(palmont.logoUrl, '/assets/aistudio/image_e34c12dc.png');

  // Verify Hastings United circular mask helper
  const english = leagues.find((l) => l.id === 'english-elite-conference')!;
  const hastings = english.clubs.find((c) => c.id === 'hastings-united')!;
  assert.equal(needsCircularBadgeMask(hastings.logoUrl), true);
  assert.equal(needsCircularBadgeMask(palmont.logoUrl), false);
});

test('every RFF seal, league logo, and club crest points to an existing high-resolution local asset file on disk', () => {
  const publicDir = path.resolve(process.cwd(), 'public');
  const rffSealDiskPath = path.join(publicDir, RFF_FEDERATION_LOGO_URL);
  assert.equal(fs.existsSync(rffSealDiskPath), true, `Missing RFF seal at ${rffSealDiskPath}`);
  assert.equal(RFF_FEDERATION_LOGO_URL, '/assets/aistudio/image_4f742f5b.png');

  const leagues = buildInitialLeagues();
  for (const league of leagues) {
    const leagueLogoDisk = path.join(publicDir, league.logoUrl);
    assert.equal(
      fs.existsSync(leagueLogoDisk),
      true,
      `Missing league logo for ${league.name}: ${leagueLogoDisk}`
    );
    assert.ok(fs.statSync(leagueLogoDisk).size > 500, `Empty league logo: ${leagueLogoDisk}`);

    for (const club of league.clubs) {
      const clubLogoDisk = path.join(publicDir, club.logoUrl);
      assert.equal(
        fs.existsSync(clubLogoDisk),
        true,
        `Missing club crest for ${club.name}: ${clubLogoDisk}`
      );
      assert.ok(fs.statSync(clubLogoDisk).size > 500, `Empty club crest: ${clubLogoDisk}`);
    }
  }
});

test('standings math calculates MP, GD, Pts, sorts by Pts -> GD -> GF -> Name, and blocks cross-league matches', () => {
  const leagues = buildInitialLeagues();
  const ligue = leagues.find((l) => l.id === 'ligue-la-premiere')!;

  const afterMatch1 = applyMatchResultToLeague(ligue, 'rc-palmont', 'saint-roche', 3, 0);
  assert.equal(afterMatch1.clubs[0].id, 'rc-palmont');
  assert.equal(afterMatch1.clubs[0].points, 3);
  assert.equal(afterMatch1.clubs[0].goalDifference, 3);
  assert.equal(afterMatch1.clubs[0].played, 1);

  const saintRoche = afterMatch1.clubs.find((c) => c.id === 'saint-roche')!;
  assert.equal(saintRoche.points, 0);
  assert.equal(saintRoche.goalDifference, -3);
  assert.equal(saintRoche.losses, 1);
  assert.equal(saintRoche.id, afterMatch1.clubs[afterMatch1.clubs.length - 1].id);

  const afterMatch2 = applyMatchResultToLeague(afterMatch1, 'us-verdelac', 'fc-porteclaire', 2, 1);
  assert.equal(afterMatch2.clubs[0].id, 'rc-palmont');
  assert.equal(afterMatch2.clubs[1].id, 'us-verdelac');

  assert.throws(
    () => applyMatchResultToLeague(afterMatch2, 'rc-palmont', 'as-rome', 1, 0),
    /Both clubs must belong/
  );

  const reset = resetLeagueStandings(afterMatch2);
  assert.equal(reset.clubs.every((c) => c.points === 0 && c.played === 0), true);

  const patched = computeClubStanding(reset.clubs[0], {
    wins: 4,
    draws: 2,
    losses: 1,
    goalsFor: 12,
    goalsAgainst: 5,
  });
  assert.equal(patched.played, 7);
  assert.equal(patched.goalDifference, 7);
  assert.equal(patched.points, 14);
  assert.equal(sortLeagueClubs([reset.clubs[1], patched])[0].id, patched.id);

  const filtered = filterLeaguesAndClubs(leagues, 'all', 'Palmont');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'ligue-la-premiere');
  assert.equal(filtered[0].clubs.length, 1);
  assert.equal(filtered[0].clubs[0].name, 'R.C. Palmont');
});

test('Team Role defaults to Unknown until assigned and resolves official club + crest metadata across 32 clubs', () => {
  const players = buildInitialPlayers();
  const leagues = buildInitialLeagues();

  // Unassigned athletes default to Unknown
  const unrolled = players.filter((p) => p.username.toLowerCase() !== 'x5_sy');
  assert.equal(unrolled.length, 356);
  for (const p of unrolled) {
    assert.equal(p.club, UNKNOWN_TEAM_ROLE);
    assert.equal(isPlayerTeamRolled(p.club), false);
    assert.equal(getTeamRoleLabel(p.club), 'Unknown');
  }

  // x5_sy is already linked to R.C. Palmont with official crest lookup
  const x5sy = players.find((p) => p.username.toLowerCase() === 'x5_sy')!;
  assert.equal(isPlayerTeamRolled(x5sy.club), true);
  const palmontMeta = findOfficialClubByName(x5sy.club);
  assert.ok(palmontMeta);
  assert.equal(palmontMeta.leagueName, 'Ligue La Premiere');
  assert.equal(palmontMeta.clubLogoUrl, '/assets/aistudio/image_e34c12dc.png');

  // Diacritic-insensitive lookup resolves Mainhügel United & Grüntal S.C.
  assert.equal(findOfficialClubByName('Mainhugel United')?.clubId, 'mainhugel-united');
  assert.equal(findOfficialClubByName('Gruntal S.C.')?.clubId, 'gruntal-sc');

  // Candidate pools respect division filter (32 all vs 8 single division)
  assert.equal(getCandidateClubsForRoll(leagues, 'all').length, 32);
  assert.equal(getCandidateClubsForRoll(leagues, 'english-elite-conference').length, 8);

  // Deterministic pick assigns official team and resolves crest
  const samplePlayer = unrolled[0];
  const rolledPick = pickRolledClub(leagues, 'italia-professionale-divisione', 0);
  assert.equal(rolledPick.league.name, 'Italia Professionale Divisione');

  const afterRoll = applyTeamRollToPlayer(samplePlayer, rolledPick.club.name);
  assert.equal(afterRoll.club, rolledPick.club.name);
  assert.equal(isPlayerTeamRolled(afterRoll.club), true);
  assert.ok(findOfficialClubByName(afterRoll.club)?.clubLogoUrl);

  // Resetting back to Unknown clears team role cleanly
  const resetBack = applyTeamRollToPlayer(afterRoll, 'Unknown');
  assert.equal(resetBack.club, 'Unknown');
  assert.equal(isPlayerTeamRolled(resetBack.club), false);

  // Rejects non-existent or retired Spanish club names
  assert.throws(
    () => applyTeamRollToPlayer(samplePlayer, 'Murcia S.A.D.'),
    /not one of the official RFF clubs/
  );
});

test('getStandingZoneInfo maps 8-club RFF division ranks to Coupe des Champions, Coupe d Europa, Midtable, and Relegation', () => {
  assert.equal(getStandingZoneInfo(1, 8).zone, 'champions');
  assert.equal(getStandingZoneInfo(2, 8).label, 'Coupe des Champions');
  assert.equal(getStandingZoneInfo(3, 8).zone, 'europa');
  assert.equal(getStandingZoneInfo(4, 8).label, "Coupe d'Europa");
  assert.equal(getStandingZoneInfo(5, 8).zone, 'midtable');
  assert.equal(getStandingZoneInfo(6, 8).zone, 'midtable');
  assert.equal(getStandingZoneInfo(7, 8).zone, 'relegation');
  assert.equal(getStandingZoneInfo(8, 8).label, 'Relegation');
  assert.equal(getStandingZoneInfo(8, 8).rangeLabel, '7-8');
});

test('computeClubStanding supports Admin edits to W, D, L, G/A, and both auto and explicit PTS', () => {
  const leagues = buildInitialLeagues();
  const sampleClub = leagues[0].clubs[0];
  assert.equal(sampleClub.wins, 0);
  assert.equal(sampleClub.draws, 0);
  assert.equal(sampleClub.losses, 0);
  assert.equal(sampleClub.goalsAgainst, 0);
  assert.equal(sampleClub.points, 0);

  const autoPts = computeClubStanding(sampleClub, {
    wins: 3,
    draws: 1,
    losses: 2,
    goalsAgainst: 5,
  });
  assert.equal(autoPts.wins, 3);
  assert.equal(autoPts.draws, 1);
  assert.equal(autoPts.losses, 2);
  assert.equal(autoPts.goalsAgainst, 5);
  assert.equal(autoPts.points, 10);

  const customPts = computeClubStanding(sampleClub, {
    wins: 3,
    draws: 1,
    losses: 2,
    goalsAgainst: 5,
    points: 8,
  });
  assert.equal(customPts.points, 8);
});

test('10-second Roblox avatar refresh merges newly resolved and updated avatar URLs without clobbering existing avatars', () => {
  assert.equal(AVATAR_REFRESH_INTERVAL_MS, 10_000);

  const players = buildInitialPlayers().slice(0, 3);
  const hierarchy = buildInitialHierarchyAccounts(buildInitialPlayers());

  // Initial sync resolves avatars for player 1 and 2
  const firstPass = mergePlayerAvatarUpdates(players, [
    {
      id: players[0].id,
      robloxId: 5194519731,
      avatarUrl: 'https://tr.rbxcdn.com/first-avatar-1.png',
    },
    {
      id: players[1].id,
      robloxId: 4633121540,
      avatarUrl: 'https://tr.rbxcdn.com/first-avatar-2.png',
    },
  ]);
  assert.equal(firstPass.updatedCount, 2);
  assert.equal(firstPass.players[0].avatarUrl, 'https://tr.rbxcdn.com/first-avatar-1.png');
  assert.equal(firstPass.players[1].avatarUrl, 'https://tr.rbxcdn.com/first-avatar-2.png');
  assert.equal(firstPass.players[2].avatarUrl, '');

  // Identical payload preserves array reference (zero wasted re-renders)
  const noOpPass = mergePlayerAvatarUpdates(firstPass.players, [
    {
      id: players[0].id,
      robloxId: 5194519731,
      avatarUrl: 'https://tr.rbxcdn.com/first-avatar-1.png',
    },
    {
      id: players[1].id,
      robloxId: 4633121540,
      avatarUrl: '',
    },
  ]);
  assert.equal(noOpPass.updatedCount, 0);
  assert.equal(noOpPass.players, firstPass.players);
  assert.equal(noOpPass.players[1].avatarUrl, 'https://tr.rbxcdn.com/first-avatar-2.png');

  // Refreshed Roblox CDN URL updates cleanly on subsequent 10s poll
  const refreshedPass = mergePlayerAvatarUpdates(firstPass.players, [
    {
      id: players[0].id,
      robloxId: 5194519731,
      avatarUrl: 'https://tr.rbxcdn.com/refreshed-avatar-1.png',
    },
  ]);
  assert.equal(refreshedPass.updatedCount, 1);
  assert.equal(refreshedPass.players[0].avatarUrl, 'https://tr.rbxcdn.com/refreshed-avatar-1.png');

  const hierarchyMerged = mergeHierarchyAvatarUpdates(hierarchy, [
    {
      id: hierarchy[0].id,
      robloxId: 5194519731,
      avatarUrl: 'https://tr.rbxcdn.com/founder-headshot.png',
    },
  ]);
  assert.equal(hierarchyMerged.updatedCount, 1);
  assert.equal(hierarchyMerged.hierarchy[0].avatarUrl, 'https://tr.rbxcdn.com/founder-headshot.png');
});

test('Founder-customized liveLeagues resolves renamed clubs and crests in findOfficialClubByName and applyTeamRollToPlayer', () => {
  const customLeagues = buildInitialLeagues();
  customLeagues[0].name = 'Premier Federation Division';
  customLeagues[0].clubs[0].name = 'Royal Palmont CF';
  customLeagues[0].clubs[0].shortCode = 'RPC';
  customLeagues[0].clubs[0].logoUrl = '/assets/aistudio/image_4f742f5b.png';

  const resolved = findOfficialClubByName('Royal Palmont CF', customLeagues);
  assert.ok(resolved);
  assert.equal(resolved.leagueName, 'Premier Federation Division');
  assert.equal(resolved.shortCode, 'RPC');
  assert.equal(resolved.clubLogoUrl, '/assets/aistudio/image_4f742f5b.png');

  const samplePlayer = buildInitialPlayers().find((p) => !p.isFounder)!;
  const assigned = applyTeamRollToPlayer(samplePlayer, 'Royal Palmont CF', customLeagues);
  assert.equal(assigned.club, 'Royal Palmont CF');
});


