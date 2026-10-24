import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_PASSWORD,
  FOUNDER_PASSWORD,
  MOD_PASSWORD,
  applyRoleSafePlayerUpdate,
  authenticateStaffPassword,
  buildDefaultStaffAccessPolicy,
  canAddPlayer,
  canBanEntity,
  canChangePlayerTeam,
  canDeletePlayer,
  canEditPlayerStats,
  canManageFounderControls,
  canManageHierarchy,
  canManageLeagueStandings,
  canSuspendPlayer,
  getBackgroundBlurClasses,
  getSkillRankInfo,
  isRoleKeyPaused,
  sanitizeSiteConfig,
  sanitizeStaffAccessPolicy,
} from './hierarchy';
import { buildInitialPlayers, filterAndSortPlayers } from './rosterSeed';

test('skill rank system maps S=Very Good, A=Good, B=Decent, and D=Okay', () => {
  assert.equal(getSkillRankInfo('S').quality, 'Very Good');
  assert.equal(getSkillRankInfo('S').fullLabel, 'S Rank · Very Good');
  assert.equal(getSkillRankInfo('A').quality, 'Good');
  assert.equal(getSkillRankInfo('A').fullLabel, 'A Rank · Good');
  assert.equal(getSkillRankInfo('B').quality, 'Decent');
  assert.equal(getSkillRankInfo('B').fullLabel, 'B Rank · Decent');
  assert.equal(getSkillRankInfo('D').quality, 'Okay');
  assert.equal(getSkillRankInfo('D').fullLabel, 'D Rank · Okay');
});

test('staff password authentication distinguishes Mod, Admin, and invalid keys', () => {
  const modAuth = authenticateStaffPassword(MOD_PASSWORD);
  assert.equal(modAuth.valid, true);
  assert.equal(modAuth.role, 'moderator');
  assert.equal(modAuth.securityRank, 'B');

  const adminAuth = authenticateStaffPassword(ADMIN_PASSWORD);
  assert.equal(adminAuth.valid, true);
  assert.equal(adminAuth.role, 'admin');
  assert.equal(adminAuth.securityRank, 'A');

  const badAuth = authenticateStaffPassword('wrong-password');
  assert.equal(badAuth.valid, false);
  assert.equal(badAuth.role, 'guest');
});

test('moderator permissions allow editing stats, changing player teams, adding players, and suspending players, while blocking league standings, ban, delete, and hierarchy', () => {
  assert.equal(canEditPlayerStats('guest'), false);
  assert.equal(canChangePlayerTeam('guest'), false);
  assert.equal(canManageLeagueStandings('guest'), false);
  assert.equal(canSuspendPlayer('guest'), false);

  assert.equal(canEditPlayerStats('moderator'), true);
  assert.equal(canChangePlayerTeam('moderator'), true);
  assert.equal(canAddPlayer('moderator'), true);
  assert.equal(canSuspendPlayer('moderator'), true);
  assert.equal(canManageLeagueStandings('moderator'), false);
  assert.equal(canBanEntity('moderator'), false);
  assert.equal(canDeletePlayer('moderator'), false);
  assert.equal(canManageHierarchy('moderator'), false);
});

test('admin permissions allow league standings control, player team changes, ban, suspend, hierarchy, deletion, and all roster operations', () => {
  assert.equal(canEditPlayerStats('admin'), true);
  assert.equal(canChangePlayerTeam('admin'), true);
  assert.equal(canAddPlayer('admin'), true);
  assert.equal(canManageLeagueStandings('admin'), true);
  assert.equal(canSuspendPlayer('admin'), true);
  assert.equal(canBanEntity('admin'), true);
  assert.equal(canDeletePlayer('admin'), true);
  assert.equal(canManageHierarchy('admin'), true);
});

test('applyRoleSafePlayerUpdate allows suspend/unsuspend for moderators while stripping ban/securityRank mutations, and permits all for admins', () => {
  const players = buildInitialPlayers();
  const sampleAthlete = players.find((p) => !p.isFounder)!;

  const modUpdated = applyRoleSafePlayerUpdate(
    sampleAthlete,
    {
      goals: 42,
      assists: 19,
      rating: 68,
      club: 'FC Blox',
      banned: true,
      banReason: 'Unauthorized ban attempt',
      suspended: true,
      securityRank: 'S',
    },
    'moderator'
  );

  assert.equal(modUpdated.goals, 42);
  assert.equal(modUpdated.assists, 19);
  assert.equal(modUpdated.rating, 68);
  assert.equal(modUpdated.club, 'FC Blox');
  assert.equal(modUpdated.suspended, true);
  assert.equal(modUpdated.banned, false);
  assert.equal(modUpdated.banReason, undefined);
  assert.equal(modUpdated.securityRank, 'D');

  const modReinstated = applyRoleSafePlayerUpdate(
    modUpdated,
    { suspended: false },
    'moderator'
  );
  assert.equal(modReinstated.suspended, false);

  const adminUpdated = applyRoleSafePlayerUpdate(
    sampleAthlete,
    {
      banned: true,
      suspended: true,
      banReason: 'Match fixing violation',
      securityRank: 'B',
    },
    'admin'
  );

  assert.equal(adminUpdated.banned, true);
  assert.equal(adminUpdated.suspended, true);
  assert.equal(adminUpdated.banReason, 'Match fixing violation');
  assert.equal(adminUpdated.securityRank, 'B');
});

test('initial roster configures Founders at Rank 99 S-Rank and all regular players at Rank 60 D-Class', () => {
  const players = buildInitialPlayers();
  const founders = players.filter((p) => p.isFounder);
  const regulars = players.filter((p) => !p.isFounder);

  assert.equal(founders.length, 5);
  assert.ok(regulars.length >= 265);

  for (const founder of founders) {
    assert.equal(founder.rating, 99);
    assert.equal(founder.tier, 'S');
    assert.equal(founder.securityRank, 'S');
    assert.equal(founder.goals, 0);
    assert.equal(founder.assists, 0);
    assert.equal(founder.appearances, 0);
    assert.ok(founder.robloxId && founder.robloxId > 0);
  }

  for (const regular of regulars) {
    assert.equal(regular.rating, 60);
    assert.equal(regular.tier, 'D');
    assert.equal(regular.securityRank, 'D');
    assert.equal(regular.goals, 0);
    assert.equal(regular.assists, 0);
    assert.equal(regular.appearances, 0);
  }

  const saqFounder = founders.find((f) => f.username === 'saqholdersab');
  assert.ok(saqFounder, 'saqholdersab should be registered as one of the 5 Founders');
  assert.equal(saqFounder.robloxId, 10290252897);
  assert.equal(
    players.some((p) => p.username.toLowerCase() === 'mapw'),
    false,
    'Mapw should be replaced by saqholdersab'
  );

  const foundByRobloxId = filterAndSortPlayers(players, { search: '10290252897' });
  assert.equal(foundByRobloxId.length, 1);
  assert.equal(foundByRobloxId[0].username, 'saqholdersab');
});

test('Discord audit registers all verified ID members without removing Founders or existing players and excludes non-ID users/bots', () => {
  const players = buildInitialPlayers();
  const founders = players.filter((p) => p.isFounder);
  const regulars = players.filter((p) => !p.isFounder);

  // All 5 Founders untouched
  assert.deepEqual(
    founders.map((f) => f.username),
    ['uK0Ab', 'THAHKYOU200', 'Kai_wesh', 'respetoe', 'saqholdersab']
  );

  // Expanded roster includes original 269 regulars + 83 newly verified Discord members = 352 regulars (357 total)
  assert.equal(regulars.length, 352);
  assert.equal(players.length, 357);

  // Existing non-ID players remain untouched
  for (const existingKeep of ['kklacko', 'nfot', 'vDaramy', 'Logan', 'Bongo', 'LASAGNA', 'AnnJones']) {
    assert.ok(
      players.some((p) => p.username.toLowerCase() === existingKeep.toLowerCase()),
      `Existing player ${existingKeep} must not be removed`
    );
  }

  // Newly verified Discord members with Roblox IDs are registered at OVR 60 D-Rank with exact Roblox IDs
  const sampleNewVerified: Array<[string, number]> = [
    ['0lise_rw', 3161026326],
    ['samjan666', 1847115819],
    ['sekerwz', 10928898374],
    ['Krxzy', 4680830398],
    ['kimmvch', 11708065779],
    ['qetzvu', 3417755762],
    ['roblox_user_9898985265', 9898985265],
    ['Messiisthegoat67774', 10189651233],
  ];
  for (const [uname, expectedRobloxId] of sampleNewVerified) {
    const rec = players.find((p) => p.username.toLowerCase() === uname.toLowerCase());
    assert.ok(rec, `Newly verified player ${uname} should be registered`);
    assert.equal(rec.robloxId, expectedRobloxId);
    assert.equal(rec.rating, 60);
    assert.equal(rec.tier, 'D');
    assert.equal(rec.goals, 0);
    assert.equal(rec.assists, 0);
  }

  // Unverified Discord nicknames and bots without Roblox IDs are NOT added
  for (const excluded of [
    'Fedora GF',
    'falling in love',
    'jay10270200',
    'Santannn7',
    'Founder',
    'Carl-bot',
    'Bloxlink',
    'Dyno',
    'Tickets v2',
    'TTS Bot',
    'Discohook Utils',
    'Alt Detector',
    'Security',
  ]) {
    assert.equal(
      players.some((p) => p.username.toLowerCase() === excluded.toLowerCase()),
      false,
      `Non-ID Discord user/bot ${excluded} must NOT be added`
    );
  }

  // Team of the Week spotlight player x5_sy is linked to R.C. Palmont
  const x5sy = players.find((p) => p.username.toLowerCase() === 'x5_sy');
  assert.ok(x5sy, 'x5_sy must be registered');
  assert.equal(x5sy.club, 'R.C. Palmont');
  assert.equal(x5sy.robloxId, 11741499280);
  assert.equal(x5sy.rating, 60);
  assert.equal(x5sy.goals, 0);
  assert.equal(x5sy.assists, 0);
});

test('all 357 players initialize with Position Unknown and Preferred Foot Unknown, and support filtering and staff updates', () => {
  const players = buildInitialPlayers();
  assert.equal(players.length, 357);

  for (const p of players) {
    assert.equal(
      p.position,
      'Unknown',
      `Expected @${p.username} position to be Unknown, got ${p.position}`
    );
    assert.equal(
      p.foot,
      'Unknown',
      `Expected @${p.username} preferred foot to be Unknown, got ${p.foot}`
    );
  }

  // Filtering by Position=Unknown and Foot=Unknown matches all 357 athletes
  assert.equal(filterAndSortPlayers(players, { position: 'Unknown' }).length, 357);
  assert.equal(filterAndSortPlayers(players, { foot: 'Unknown' }).length, 357);
  assert.equal(filterAndSortPlayers(players, { position: 'ST' }).length, 0);
  assert.equal(filterAndSortPlayers(players, { foot: 'Right' }).length, 0);

  // Staff updates can assign a specific position & preferred foot and reset back to Unknown
  const sample = players[0];
  const updated = applyRoleSafePlayerUpdate(
    sample,
    { position: 'CAM', foot: 'Both' },
    'moderator'
  );
  assert.equal(updated.position, 'CAM');
  assert.equal(updated.foot, 'Both');

  const reset = applyRoleSafePlayerUpdate(
    updated,
    { position: 'Unknown', foot: 'Unknown' },
    'moderator'
  );
  assert.equal(reset.position, 'Unknown');
  assert.equal(reset.foot, 'Unknown');
});

test('Founder key Fflacko198Pnk$ grants supreme Founder role and can pause Admin/Mod keys or toggle permissions', () => {
  assert.equal(FOUNDER_PASSWORD, 'Fflacko198Pnk$');

  const founderAuth = authenticateStaffPassword(FOUNDER_PASSWORD);
  assert.equal(founderAuth.valid, true);
  assert.equal(founderAuth.paused, false);
  assert.equal(founderAuth.role, 'founder');
  assert.equal(founderAuth.securityRank, 'S');
  assert.equal(canManageFounderControls('founder'), true);
  assert.equal(canManageFounderControls('admin'), false);
  assert.equal(canManageFounderControls('moderator'), false);

  // Pause Admin and Moderator keys
  const pausedPolicy = sanitizeStaffAccessPolicy({
    admin: { keyPaused: true },
    moderator: { keyPaused: true },
  });

  assert.equal(isRoleKeyPaused('admin', pausedPolicy), true);
  assert.equal(isRoleKeyPaused('moderator', pausedPolicy), true);
  assert.equal(isRoleKeyPaused('founder', pausedPolicy), false);

  const blockedAdminLogin = authenticateStaffPassword(ADMIN_PASSWORD, pausedPolicy);
  assert.equal(blockedAdminLogin.valid, false);
  assert.equal(blockedAdminLogin.paused, true);
  assert.equal(blockedAdminLogin.pausedRole, 'admin');

  const blockedModLogin = authenticateStaffPassword(MOD_PASSWORD, pausedPolicy);
  assert.equal(blockedModLogin.valid, false);
  assert.equal(blockedModLogin.paused, true);
  assert.equal(blockedModLogin.pausedRole, 'moderator');

  // Founder still authenticates and exercises every permission even when Admin & Mod keys are paused
  const founderWhenOthersPaused = authenticateStaffPassword(FOUNDER_PASSWORD, pausedPolicy);
  assert.equal(founderWhenOthersPaused.valid, true);
  assert.equal(founderWhenOthersPaused.role, 'founder');
  assert.equal(canBanEntity('founder', pausedPolicy), true);
  assert.equal(canDeletePlayer('founder', pausedPolicy), true);
  assert.equal(canManageLeagueStandings('founder', pausedPolicy), true);
  assert.equal(canBanEntity('admin', pausedPolicy), false);
  assert.equal(canSuspendPlayer('moderator', pausedPolicy), false);

  // Granular permission removal on Admin (e.g., Founder removes banEntity & manageLeagueStandings from Admin)
  const customPolicy = buildDefaultStaffAccessPolicy();
  customPolicy.admin.permissions.banEntity = false;
  customPolicy.admin.permissions.manageLeagueStandings = false;
  customPolicy.admin.permissions.changePlayerTeam = false;

  assert.equal(canBanEntity('admin', customPolicy), false);
  assert.equal(canManageLeagueStandings('admin', customPolicy), false);
  assert.equal(canChangePlayerTeam('admin', customPolicy), false);
  assert.equal(canEditPlayerStats('admin', customPolicy), true);

  const players = buildInitialPlayers();
  const sample = players.find((p) => !p.isFounder)!;
  const restrictedAdminEdit = applyRoleSafePlayerUpdate(
    sample,
    {
      club: 'FC Blox',
      banned: true,
      banReason: 'Attempted ban while permission removed',
      rating: 75,
    },
    'admin',
    customPolicy
  );
  assert.equal(restrictedAdminEdit.rating, 75);
  assert.equal(restrictedAdminEdit.club, sample.club);
  assert.equal(restrictedAdminEdit.banned, false);

  // Founder can override anything including isFounder, robloxId, avatarUrl, ban, and team
  const founderEdit = applyRoleSafePlayerUpdate(
    sample,
    {
      club: 'R.C. Palmont',
      isFounder: true,
      robloxId: 999888777,
      avatarUrl: '/assets/aistudio/image_e34c12dc.png',
      banned: true,
      banReason: 'Founder executive order',
    },
    'founder',
    customPolicy
  );
  assert.equal(founderEdit.club, 'R.C. Palmont');
  assert.equal(founderEdit.isFounder, true);
  assert.equal(founderEdit.robloxId, 999888777);
  assert.equal(founderEdit.avatarUrl, '/assets/aistudio/image_e34c12dc.png');
  assert.equal(founderEdit.banned, true);
});

test('sanitizeSiteConfig and getBackgroundBlurClasses validate Website Studio customization', () => {
  const customSite = sanitizeSiteConfig({
    brandName: '  RFF² Season 1  ',
    heroHeadline: 'Custom Founder Headline',
    announcementBanner: 'Season 1 Kickoff Tonight!',
    announcementActive: true,
    backgroundBlurPx: 2,
    totwPlayerUsername: '@uK0Ab',
    showMarquee: false,
  });

  assert.equal(customSite.brandName, 'RFF² Season 1');
  assert.equal(customSite.heroHeadline, 'Custom Founder Headline');
  assert.equal(customSite.announcementBanner, 'Season 1 Kickoff Tonight!');
  assert.equal(customSite.announcementActive, true);
  assert.equal(customSite.backgroundBlurPx, 2);
  assert.equal(customSite.totwPlayerUsername, 'uK0Ab');
  assert.equal(customSite.showMarquee, false);
  assert.equal(getBackgroundBlurClasses(2), 'blur-[2px] scale-[1.01]');
  assert.equal(getBackgroundBlurClasses(0), 'blur-none scale-100');
  assert.equal(getBackgroundBlurClasses(5), 'blur-[5px] scale-[1.03]');
});
