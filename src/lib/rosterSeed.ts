import type {
  HierarchyAccount,
  PlayerClass,
  PlayerRecord,
  PositionCode,
} from './types.ts';

export const FOUNDERS_CONFIG: Array<{
  username: string;
  displayName: string;
  robloxId: number;
  pos: PositionCode;
  goals: number;
  assists: number;
  report: string;
}> = [
  {
    username: 'uK0Ab',
    displayName: 'uK0Ab',
    robloxId: 5194519731,
    pos: 'Unknown',
    goals: 0,
    assists: 0,
    report: 'Supreme Founder (S Rank · 99) — Exceptional technical clinicality and match command entering Pre-Season.',
  },
  {
    username: 'THAHKYOU200',
    displayName: 'Heavan',
    robloxId: 4633121540,
    pos: 'Unknown',
    goals: 0,
    assists: 0,
    report: 'Supreme Founder (S Rank · 99) — Master tactician orchestrating high-tempo transitions entering Pre-Season.',
  },
  {
    username: 'Kai_wesh',
    displayName: 'kai_wesh',
    robloxId: 11164876258,
    pos: 'Unknown',
    goals: 0,
    assists: 0,
    report: 'Supreme Founder (S Rank · 99) — Elite goal threat with relentless off-ball movement entering Pre-Season.',
  },
  {
    username: 'respetoe',
    displayName: 'respe',
    robloxId: 2314367996,
    pos: 'Unknown',
    goals: 0,
    assists: 0,
    report: 'Supreme Founder (S Rank · 99) — Commanding presence breaking up opposition lines entering Pre-Season.',
  },
  {
    username: 'saqholdersab',
    displayName: 'RFF_Mapw',
    robloxId: 10290252897,
    pos: 'Unknown',
    goals: 0,
    assists: 0,
    report: 'Supreme Founder (S Rank · 99) — Visionary playmaker dictating match tempo entering Pre-Season.',
  },
];

export const REGULAR_ATHLETE_NAMES: string[] = [
  // Group 1 (41)
  '04xReaper', '1tz_Rudiger', '4_7zq', '4razza', '4tng', '4xvmv', '4zr_el', '7xqvrn', '8wzvirezz', '9coiv',
  '9xMak', '9xfee', 'Abooudfafiali2015', 'Ad11am22', 'Agenttvx', 'Aiki', 'AlexandreParis80', 'AnnJones', 'Aqeellicious155', 'Babijon_lol228',
  'BAMBUC_MISHEL', 'BRIEN2323', 'Bitalik7000', 'Bongo', 'Braynofriends', 'Camxron', 'Chiho Shibata', 'Claudia_34510', 'CsStandoff',
  'DanderPanda123', 'DavidFredwic', 'Daylexw', 'DevinCamacho', 'Dimt1mx', 'Dominican0oooo', 'DuckCookieZap', 'EQUINOPP', 'Enz0_q21', 'F475FR',
  'Fe3arl3s', 'FlyingTillDawn',
  // Group 2 (33)
  'Frosblaz7046', 'HEADBOOY', 'Hinkalya1488', 'Hqjjajakwkjw', 'IVVZR', 'Imnothing_367', 'Imran', 'Jaqz_s', 'Jakv1z',
  'JessicaCarlson', 'Kaiserking194', 'KelliPerkins', 'LEVQPOK', 'LUXAR1NEE', 'LASAGNA', 'Lavnchh', 'Legenda322_Zz', 'LegendLuckyNova', 'Leggomaker',
  'LocalDoge', 'Logan', 'Lwkyhvsnn', 'LxwdiveLuvr', 'MOMO973020', 'Mbappé', 'Mercdidi', 'Messiisthegoat677', 'MichelleRamirez', 'MirandaChavez',
  'Moss', 'Muitutu1 x Prime Psg', 'Nex2naker', 'Neyvmarrjr',
  // Group 3 (45)
  'Neyxmar_jr', 'Nintendo Station One X', 'Nitua', 'Nosignalalex', 'ON9boy76', 'Ofully', 'OhhhhhTheOne44s', 'Oplinklo2', 'Perliespd', 'PhillipWeaver',
  'Pixxi18', 'Rapid', 'Real Flame Trust', 'ReazuFx', 'RichardMiller', 'SANTIAGO_RP43', 'Saq1boy', 'Savertzq', 'Schnitzler', 'Scwanzee',
  'Skitsss', 'SlingshotBoyio', 'Slowy_emre2', 'SmokyQuartz', 'Stortc5140', 'SuperLukaModric', 'TastyObama', 'TempestXWX', 'TheDemonofSenju', 'TheodoreRobinson',
  'Thiezf', 'Thisber7458', 'Toni_Kross817', 'Trevvick', 'Txmoes', 'UpRushx', 'Velouraz', 'Viperr22224', 'VlquYVqtxZ', 'WOLF_Pix3l72',
  'WalkingYouLikeADogs', 'Xielesss', 'YikesKaka445', 'Yes_ImBacon06', 'Zapcog4666',
  // Group 4 (62)
  'al0vnee', 'alchem123432', 'aliwael504', 'amoitiska', 'arasoyunda191', 'arda', 'arkazionfr', 'astrafell_', 'b88x', 'baconcampot3',
  'bewitN8382', 'bleckifr', 'bombrighter', 'brickzformylife', 'brittiannn', 'by Astrexv1', 'c3xzm', 'chas2612', 'chvteraa', 'cosevilo',
  'crowxzrn', 'cxtzfr', 'czr1svn', 'damjanbucic22', 'dedretey21', 'dinoaevyn', 'ellacko', 'emirbilbey85', 'emmanuelangrom', 'emre2007emir2012',
  'err3fedefe', 'estozv', 'fakeihkira', 'fflacko', 'fil4ik2_0', 'flairbait', 'freddo102', 'freerunOnyx', 'freezingpolish', 'g2sify',
  'gargoyle23', 'gl6bxz', 'GloriousBacon', 'goroetoreal', 'gumball3k122', 'gxrczz', 'hazvrdd', 'hemlock0363_91181', 'idklilac', 'ihatefrancia',
  'iloveblueblade', 'imbestatzombie', 'iraqiklng', 'joshobosaski', 'kaenetaa', 'kargezxv', 'kbean', 'kin9yo', 'kj60', 'kjeok',
  'kklacko', 'korollooo',
  // Group 5 (88 -> note deduplicated against founders)
  'kROVOSIS99', 'kyroxzn1', 'kyzenskvri', 'leoand99915', 'lexdgoat', 'limpylols', 'lolhisks', 'lucasbuca4', 'luminavie', 'luvforv2',
  'lxnivii', 'lysech', 'm6_ge', 'm6lonee', 'm7asik', 'mez67ki', 'mike_197833', 'milanomag', 'moo05993', 'mps_lover12',
  'mxldlni', 'naneko.', 'nattonep', 'never fail', 'nezu', 'nfot', 'nicolas93t', 'nikita7let', 'oaidtdidg', 'oliverpooppooppop',
  'oqniu_l', 'outrageeeee', 'palenjos', 'paratrp.87015', 'pebaboss67', 'pedrigonzalez8x', 'petrarunicholas', 'powerful_starfish_98503', 'pr_eice', 'proustakaan',
  'pvrlooooooooooooo', 'quhoma', 'qyrvxo', 'r1hardinho', 'r3tro_funky', 'r4nnyx', 'ra1zenYT', 'ramadebatata', 'rayen1542', 'reas3n',
  'redraptor420', 'relaxurv', 'rezaxac123456', 'rezwisz', 'riisiese', 'rnzbowmtsvwyvok', 'roblox_user_50', 'rrroonnchik', 'rugenyi', 'rvddrii',
  'rvexvr', 'satovxo', 'slfhfwsuifl', 'smurfovich', 'st4r.sh4rky', 'sv2os', 'sxqzen', 'tr7dz', 'ttqqkjxddzmipe', 'tuprimavegetarian',
  'tvwi', 'vDaramy', 'vlsykirgaiwlxdo', 'vyulvet', 'w0ksyaash', 'wKOMARUw', 'x3_6r', 'x5_sy', 'xantreeeeeeeeeee', 'xw_ei',
  'yamalvz', 'yerrar1', 'yesyesyes123hi5', 'yvlkri', 'zeujia_0', 'zidz1231', 'zirq1tw', 'zoara_ishim',
  // Group 6 — Verified Discord Member Audit (83 newly synced members with Roblox IDs)
  '0lise_rw', '11vla_a', '3thanz19', '8xtvol', 'AMOGUSluffycalvo', 'Aleluupojrb', 'Au_BouloNaigroo', 'Aymaneno6819', 'DANI127127127', 'Dvbmble',
  'FihyFinger', 'Guicasmiguel', 'Heyyimpuppyyy', 'ImranBakour', 'Jbara2216', 'Josuethemaster15', 'K4CMmk', 'Kristijan_vi', 'Krxzy', 'Kv4ntal',
  'Lehancik2012', 'Lionoel2012', 'Lite_mogs', 'Messiisthegoat67774', 'Msa1em', 'NitzzzRegen', 'NohamJR7', 'Not_aSnn', 'Nyxoat', 'Piopjseh',
  'Qaswara77', 'RF24_ALLROUNDER2', 'RentarLub', 'Robloxianh6h5y4g9f', 'Silenga0236', 'Silent_alt99', 'Soakrf24', 'TayIsAHuman', 'Toor1um', 'Yuuichi_bluelock',
  'albertwolf35', 'aparrat_pidrilla', 'arianos26', 'auksinislukas', 'blazaIskregel', 'bombika1888', 'code13alert', 'd4s3o', 'daddystoji', 'dribblian',
  'duckadvm', 'dwirkaaa', 'f272f', 'gorvtzka', 'iikadxen', 'irsyadkorthebestman', 'kdgfyt', 'kimmvch', 'leonardolagarto1990', 'lizoksoset228',
  'lukyszzn', 'miuelall', 'mkhitary4n', 'nurivapro9999', 'p4cifica', 'prince95150', 'qetzvu', 'redn00b11', 'rentarlob8', 'roblox_user_9898985265',
  'ronvzzzzz', 'rrtrtettrt', 'ryzlqn', 'samjan666', 'sekerwz', 'self1solation', 'siIentfalth', 'si_parszn', 'skyrizzline', 'sousa_hp20',
  'tsainttuffgng6', 'ugihjn3', 'ztf_300iq',
];

// Authoritative Bloxlink-verified Roblox User IDs extracted from the RFF Discord directory
export const VERIFIED_ROBLOX_IDS: Record<string, number> = {
  '04xreaper': 10751040636,
  '0lise_rw': 3161026326,
  '11vla_a': 6026649839,
  '1tz_rudiger': 5336455221,
  '3thanz19': 11857843400,
  '4razza': 11319495005,
  '4tng': 418839559,
  '4zr_el': 11224251483,
  '7xqvrn': 11802948635,
  '8wzvirezz': 7995540543,
  '8xtvol': 2243701939,
  '9coiv': 11129100745,
  '9xfee': 5247847522,
  '9xmak': 944486192,
  'abooudfafiali2015': 3705205278,
  'ad11am22': 2028137471,
  'agenttvx': 7010242284,
  'albertwolf35': 51517167,
  'aleluupojrb': 3038085486,
  'alexandreparis80': 1242779846,
  'aliwael504': 1942606705,
  'amogusluffycalvo': 4198077336,
  'amoitiska': 3175260069,
  'aparrat_pidrilla': 7405130881,
  'aqeellicious155': 2612958350,
  'arasoyunda191': 2795050046,
  'arianos26': 918733609,
  'arkazionfr': 4662743497,
  'au_boulonaigroo': 5328468504,
  'auksinislukas': 1756768423,
  'aymaneno6819': 5749505430,
  'b88x': 4058364391,
  'babijon_lol228': 4306382111,
  'bambuc_mishel': 1275773900,
  'bewitn8382': 10571033824,
  'blazaiskregel': 7042755025,
  'bleckifr': 11611756598,
  'bombika1888': 7749743755,
  'bombrighter': 1106355675,
  'braynofriends': 5854466271,
  'brickzformylife': 7079783072,
  'brien2323': 10475491902,
  'brittiannn': 2236795642,
  'c3xzm': 3546519423,
  'chas2612': 1672514595,
  'chvteraa': 11486226893,
  'claudia_34510': 10396445471,
  'code13alert': 10944515728,
  'cosevilo': 3851904931,
  'crowxzrn': 11275371846,
  'cxtzfr': 7206200965,
  'czr1svn': 2512515454,
  'd4s3o': 3214600014,
  'daddystoji': 10468499960,
  'damjanbucic22': 2056055324,
  'danderpanda123': 527297367,
  'dani127127127': 1502948074,
  'davidfredwic': 1219318679,
  'daylexw': 7501903531,
  'dedretey21': 2584916215,
  'dimt1mx': 9088003672,
  'dinoaevyn': 7472939224,
  'dominican0oooo': 3970090443,
  'dribblian': 11686658747,
  'duckadvm': 4210365180,
  'duckcookiezap': 8670984714,
  'dvbmble': 11079042905,
  'dwirkaaa': 8704052899,
  'emirbilbey85': 3599358669,
  'emmanuelangrom': 4553413941,
  'emre2007emir2012': 1171458392,
  'enz0_q21': 11819982802,
  'equinopp': 10045734484,
  'err3fedefe': 1401167197,
  'f272f': 8492106046,
  'f475fr': 8680112074,
  'fakeihkira': 11826019747,
  'fe3arl3s': 1199026879,
  'fihyfinger': 10892479407,
  'fil4ik2_0': 1367788544,
  'flairbait': 370155933,
  'flyingtilldawn': 5405241525,
  'freddo102': 425042474,
  'freerunonyx': 2679533943,
  'freezingpolish': 11321289836,
  'frosblaz7046': 11408678228,
  'g2sify': 10613132164,
  'gl6bxz': 1034490234,
  'goroetoreal': 3846872778,
  'gorvtzka': 10985013056,
  'guicasmiguel': 886224606,
  'gumball3k122': 6070352011,
  'gxrczz': 373399432,
  'hazvrdd': 2596844526,
  'headbooy': 10450970813,
  'heyyimpuppyyy': 2219934152,
  'hinkalya1488': 8626312530,
  'hqjjajakwkjw': 8447730475,
  'ihatefrancia': 2209804270,
  'iikadxen': 1677123709,
  'iloveblueblade': 3755137953,
  'imbestatzombie': 2755943815,
  'imnothing_367': 8744189498,
  'imranbakour': 1468917175,
  'iraqiklng': 1373368776,
  'irsyadkorthebestman': 8092161529,
  'ivvzr': 495387708,
  'jakv1z': 4493109766,
  'jaqz_s': 3751271500,
  'jbara2216': 3067580088,
  'josuethemaster15': 3729750194,
  'k4cmmk': 8373641109,
  'kaenetaa': 1244524666,
  'kaiserking194': 8268567008,
  'kargezxv': 11012692793,
  'kdgfyt': 1418146208,
  'kimmvch': 11708065779,
  'kin9yo': 4957112949,
  'kj60': 14088370,
  'kjeok': 739867873,
  'korollooo': 3125143891,
  'kristijan_vi': 2873545175,
  'krovosis99': 4809745270,
  'krxzy': 4680830398,
  'kv4ntal': 8073484173,
  'kyzenskvri': 11779035458,
  'lavnchh': 11091153609,
  'legenda322_zz': 11533244925,
  'legendluckynova': 9366123436,
  'lehancik2012': 3029275611,
  'leoand99915': 1438463573,
  'leonardolagarto1990': 1436788344,
  'levqpok': 5710680194,
  'limpylols': 4278886351,
  'lionoel2012': 984785508,
  'lite_mogs': 11250757687,
  'lizoksoset228': 3924306201,
  'localdoge': 1031548064,
  'lolhisks': 1622227231,
  'lucasbuca4': 8620922478,
  'lukyszzn': 3131536170,
  'luvforv2': 11320519592,
  'luxar1nee': 10346346158,
  'lxnivii': 11853499292,
  'lxwdiveluvr': 7205252434,
  'lysech': 5253756787,
  'm6_ge': 10713771697,
  'm6lonee': 5817231711,
  'm7asik': 11395827076,
  'messiisthegoat67774': 10189651233,
  'mez67ki': 10576827516,
  'mike_197833': 3434734807,
  'milanomag': 1305799913,
  'miuelall': 8561141312,
  'mkhitary4n': 11827686496,
  'momo973020': 7270572125,
  'mps_lover12': 3996402704,
  'msa1em': 5155345642,
  'mxldlni': 10452555641,
  'nex2naker': 4032245137,
  'neyvmarrjr': 4374255516,
  'neyxmar_jr': 11792468194,
  'nikita7let': 181860185,
  'nitzzzregen': 8319075216,
  'nohamjr7': 8005758991,
  'not_asnn': 8414670498,
  'nurivapro9999': 11797334700,
  'nyxoat': 1835669871,
  'ofully': 721131497,
  'ohhhhhtheone44s': 5845173945,
  'oliverpooppooppop': 2012038942,
  'on9boy76': 3399985327,
  'oplinklo2': 4960421538,
  'oqniu_l': 7009117375,
  'outrageeeee': 376094351,
  'p4cifica': 2457529575,
  'palenjos': 11705583976,
  'pebaboss67': 10423137416,
  'pedrigonzalez8x': 10948882535,
  'perliespd': 5641392426,
  'petrarunicholas': 1174029220,
  'piopjseh': 4620359964,
  'pixxi18': 4998769489,
  'prince95150': 2585370138,
  'pvrlooooooooooooo': 1118056460,
  'qaswara77': 1408853533,
  'qetzvu': 3417755762,
  'r1hardinho': 9440421695,
  'r3tro_funky': 5067477515,
  'r4nnyx': 7215263644,
  'rapid': 5645717197,
  'rayen1542': 528169826,
  'reazufx': 2372090858,
  'redn00b11': 1900384614,
  'relaxurv': 5661836718,
  'rentarlob8': 6233073401,
  'rentarlub': 680273782,
  'rezaxac123456': 6077099111,
  'rezwisz': 3928565245,
  'rf24_allrounder2': 10193236453,
  'roblox_user_50': 5033002941,
  'roblox_user_9898985265': 9898985265,
  'robloxianh6h5y4g9f': 11846869382,
  'ronvzzzzz': 11859493064,
  'rrroonnchik': 1225102972,
  'rrtrtettrt': 3121673716,
  'rugenyi': 904473,
  'rvddrii': 11579519624,
  'ryzlqn': 2562897700,
  'samjan666': 1847115819,
  'santiago_rp43': 9186457893,
  'saq1boy': 3453182579,
  'satovxo': 4018342426,
  'savertzq': 4414765791,
  'scwanzee': 5785828033,
  'sekerwz': 10928898374,
  'self1solation': 11860347193,
  'si_parszn': 38574300,
  'siientfalth': 10508507281,
  'silenga0236': 11583908116,
  'silent_alt99': 11245823981,
  'skyrizzline': 4600940968,
  'slfhfwsuifl': 3782761454,
  'slingshotboyio': 11268074198,
  'slowy_emre2': 1353398895,
  'soakrf24': 6223573261,
  'sousa_hp20': 4292043851,
  'stortc5140': 11330484072,
  'superlukamodric': 5558200687,
  'sv2os': 11246952525,
  'sxqzen': 10137529114,
  'tastyobama': 3203640712,
  'tayisahuman': 2476838232,
  'tempestxwx': 1059875121,
  'thedemonofsenju': 11232647203,
  'thiezf': 11819210346,
  'thisber7458': 11332097599,
  'toni_kross817': 11195341845,
  'toor1um': 1092795280,
  'trevvick': 11121894791,
  'tr7dz': 2903849282,
  'tsainttuffgng6': 10664608166,
  'tuprimavegetarian': 4736073106,
  'tvwi': 10321654,
  'txmoes': 2203039,
  'ugihjn3': 2294133360,
  'uprushx': 7039924545,
  'velouraz': 5616613095,
  'viperr22224': 8004192112,
  'vlquyvqtxz': 7864003910,
  'vyulvet': 10781808554,
  'w0ksyaash': 11797765650,
  'walkingyoulikeadogs': 9968889939,
  'wkomaruw': 7593303599,
  'wolf_pix3l72': 8671053234,
  'x3_6r': 3095419715,
  'x5_sy': 11741499280,
  'xantreeeeeeeeeee': 932884133,
  'xielesss': 5608809187,
  'xw_ei': 5251230173,
  'yamalvz': 10822173073,
  'yerrar1': 1216612278,
  'yes_imbacon06': 5705672126,
  'yesyesyes123hi5': 7258670555,
  'yikeskaka445': 4747090983,
  'yuuichi_bluelock': 4201226297,
  'yvlkri': 7816407771,
  'zapcog4666': 9852560888,
  'zeujia_0': 5666619810,
  'zidz1231': 7501593436,
  'zirq1tw': 10628658840,
  'zoara_ishim': 5796229773,
  'ztf_300iq': 3513717256,
};

export const VERIFIED_DISPLAY_ALIASES: Record<string, string> = {
  '1tz_rudiger': 'Itz_Rudiger22',
  'emmanuelangrom': 'emmanuelangrommop',
  'f475fr': 'F47SFR',
  'iraqiklng': 'iraqik1ng',
  'levqpok': 'LEVQQPOK',
  'ohhhhhtheone44s': 'OhhhhhhTheOne44s',
  'pvrlooooooooooooo': 'pvrloooooooooooooooo',
  'rezaxac123456': 'rezaxac12345678M',
  'roblox_user_50': 'roblox_user_5033002941',
  'tuprimavegetarian': 'tuprimavegetariana',
};



export function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function sanitizeRobloxLookupHandle(username: string): string {
  return username.replace(/^!\s*/, '').trim();
}

export function buildInitialPlayers(): PlayerRecord[] {
  const players: PlayerRecord[] = [];
  let idCounter = 1;

  const founderLowerSet = new Set(
    FOUNDERS_CONFIG.map((f) => f.username.toLowerCase())
  );

  // 1. All 5 Founders: Rank 99 & S Rank
  for (const f of FOUNDERS_CONFIG) {
    players.push({
      id: idCounter++,
      username: f.username,
      displayName: f.displayName,
      robloxId: f.robloxId,
      avatarUrl: '',
      isFounder: true,
      tier: 'S',
      securityRank: 'S',
      position: 'Unknown',
      club: 'Unknown',
      rating: 99,
      pace: 98,
      shooting: 97,
      passing: 97,
      dribbling: 96,
      defending: 89,
      physical: 94,
      appearances: 0,
      goals: 0,
      assists: 0,
      foot: 'Unknown',
      wage: 500000,
      releaseClause: 150000000,
      suspended: false,
      banned: false,
      scoutingReport: f.report,
    });
  }

  // 2. All Regular Athletes: Rank 60 & D Class, Position & Preferred Foot set to Unknown
  const seenNames = new Set<string>(founderLowerSet);

  for (const rawName of REGULAR_ATHLETE_NAMES) {
    const cleanName = sanitizeRobloxLookupHandle(rawName);
    const lower = cleanName.toLowerCase();
    if (!cleanName || seenNames.has(lower)) continue;
    seenNames.add(lower);

    const h = hashString(cleanName);

    // Calibrated around Rank 60 D-Class technical profile
    const pace = Math.min(72, Math.max(52, 57 + (h % 10)));
    const shooting = Math.min(70, Math.max(48, 54 + ((h >> 2) % 10)));
    const passing = Math.min(70, Math.max(52, 56 + ((h >> 4) % 10)));
    const dribbling = Math.min(71, Math.max(52, 56 + ((h >> 6) % 11)));
    const defending = Math.min(72, Math.max(44, 52 + ((h >> 8) % 10)));
    const physical = Math.min(72, Math.max(52, 56 + ((h >> 10) % 11)));

    // Pre-season initialization: 0 appearances, 0 goals, 0 assists across the roster
    const appearances = 0;
    const goals = 0;
    const assists = 0;
    const verifiedRobloxId = VERIFIED_ROBLOX_IDS[lower] ?? null;
    const initialDisplayName = VERIFIED_DISPLAY_ALIASES[lower] ?? cleanName;
    const isPalmontStar = lower === 'x5_sy';

    players.push({
      id: idCounter++,
      username: cleanName,
      displayName: initialDisplayName,
      robloxId: verifiedRobloxId,
      avatarUrl: '',
      isFounder: false,
      tier: 'D',
      securityRank: 'D',
      position: 'Unknown',
      club: isPalmontStar ? 'R.C. Palmont' : 'Unknown',
      rating: 60,
      pace,
      shooting,
      passing,
      dribbling,
      defending,
      physical,
      appearances,
      goals,
      assists,
      foot: 'Unknown',
      wage: 25000,
      releaseClause: 2500000,
      suspended: false,
      banned: false,
      scoutingReport: isPalmontStar
        ? 'Team of the Week Spotlight (R.C. Palmont) — Poised to be R.C. Palmont’s main offensive spark entering Pre-Season, bringing clinical finishing to dismantle any defense in the league.'
        : 'Official RFF² Pre-Season Evaluation — D Rank (Okay · OVR 60) registered prospect ready to prove their skill and climb the ranks.',
    });
  }

  return players;
}

export function buildInitialHierarchyAccounts(players: PlayerRecord[]): HierarchyAccount[] {
  const founders = players.filter((p) => p.isFounder);
  const accounts: HierarchyAccount[] = founders.map((f, idx) => ({
    id: 100 + idx,
    username: f.username,
    robloxId: f.robloxId,
    avatarUrl: f.avatarUrl,
    securityRank: 'S',
    roleTitle: 'S Rank · Very Good Player (Founder · OVR 99)',
    isFounder: true,
    suspended: false,
    banned: false,
    kicked: false,
    lastActive: 'Active Roster',
  }));

  accounts.push(
    {
      id: 201,
      username: 'FederationAdmin',
      robloxId: null,
      avatarUrl: '',
      securityRank: 'A',
      roleTitle: 'A Rank · Good Player Tier',
      isFounder: false,
      suspended: false,
      banned: false,
      kicked: false,
      lastActive: 'Pre-Season Ready',
    },
    {
      id: 202,
      username: 'FederationMod',
      robloxId: null,
      avatarUrl: '',
      securityRank: 'B',
      roleTitle: 'B Rank · Decent Player Tier',
      isFounder: false,
      suspended: false,
      banned: false,
      kicked: false,
      lastActive: 'Pre-Season Ready',
    },
    {
      id: 301,
      username: '04xReaper',
      robloxId: 10751040636,
      avatarUrl: '',
      securityRank: 'D',
      roleTitle: 'D Rank · Okay Player Tier (OVR 60)',
      isFounder: false,
      suspended: false,
      banned: false,
      kicked: false,
      lastActive: 'Roster Verified',
    }
  );

  return accounts;
}

export interface PlayerFilterOptions {
  search?: string;
  position?: string;
  foot?: string;
  tier?: PlayerClass | 'Founder' | '';
  status?: 'all' | 'active' | 'suspended' | 'banned';
  sort?: 'rank-desc' | 'rank-asc' | 'goals-desc' | 'assists-desc' | 'wage-desc' | 'name-asc';
}

export function filterAndSortPlayers(
  players: PlayerRecord[],
  opts: PlayerFilterOptions
): PlayerRecord[] {
  const q = (opts.search ?? '').trim().toLowerCase();
  const pos = opts.position ?? '';
  const foot = opts.foot ?? '';
  const tier = opts.tier ?? '';
  const status = opts.status ?? 'all';
  const sort = opts.sort ?? 'rank-desc';

  return players
    .filter((p) => {
      if (q) {
        const matchesUsername = p.username.toLowerCase().includes(q);
        const matchesDisplay = p.displayName.toLowerCase().includes(q);
        const matchesClub = p.club.toLowerCase().includes(q);
        const matchesId = p.robloxId !== null && String(p.robloxId).includes(q);
        if (!matchesUsername && !matchesDisplay && !matchesClub && !matchesId) {
          return false;
        }
      }
      if (pos && p.position !== pos) return false;
      if (foot && p.foot !== foot) return false;
      if (tier === 'Founder') {
        if (!p.isFounder) return false;
      } else if (tier && p.tier !== tier) {
        return false;
      }
      if (status === 'active' && (p.banned || p.suspended)) return false;
      if (status === 'suspended' && !p.suspended) return false;
      if (status === 'banned' && !p.banned) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'rank-desc') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        if (a.isFounder !== b.isFounder) return a.isFounder ? -1 : 1;
        return a.username.localeCompare(b.username);
      }
      if (sort === 'rank-asc') {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return a.username.localeCompare(b.username);
      }
      if (sort === 'goals-desc') return b.goals - a.goals || b.rating - a.rating;
      if (sort === 'assists-desc') return b.assists - a.assists || b.rating - a.rating;
      if (sort === 'wage-desc') return b.wage - a.wage || b.rating - a.rating;
      if (sort === 'name-asc') return a.username.localeCompare(b.username);
      return 0;
    });
}

export const AVATAR_REFRESH_INTERVAL_MS = 10_000;

export interface PlayerAvatarSnapshot {
  id: number;
  robloxId: number | null;
  avatarUrl: string;
  displayName?: string;
}

export interface HierarchyAvatarSnapshot {
  id: number;
  robloxId: number | null;
  avatarUrl: string;
}

export function mergePlayerAvatarUpdates(
  current: PlayerRecord[],
  updates: PlayerAvatarSnapshot[]
): { players: PlayerRecord[]; updatedCount: number } {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { players: current, updatedCount: 0 };
  }
  const byId = new Map<number, PlayerAvatarSnapshot>();
  for (const item of updates) {
    byId.set(item.id, item);
  }
  let updatedCount = 0;
  const next = current.map((player) => {
    const patch = byId.get(player.id);
    if (!patch) return player;
    const nextAvatar =
      patch.avatarUrl && patch.avatarUrl.trim().length > 0
        ? patch.avatarUrl
        : player.avatarUrl;
    const nextRobloxId = patch.robloxId ?? player.robloxId;
    const nextDisplayName =
      patch.displayName && player.displayName === player.username
        ? patch.displayName
        : player.displayName;

    if (
      nextAvatar !== player.avatarUrl ||
      nextRobloxId !== player.robloxId ||
      nextDisplayName !== player.displayName
    ) {
      updatedCount += 1;
      return {
        ...player,
        avatarUrl: nextAvatar,
        robloxId: nextRobloxId,
        displayName: nextDisplayName,
      };
    }
    return player;
  });

  return updatedCount > 0
    ? { players: next, updatedCount }
    : { players: current, updatedCount: 0 };
}

export function mergeHierarchyAvatarUpdates(
  current: HierarchyAccount[],
  updates: HierarchyAvatarSnapshot[]
): { hierarchy: HierarchyAccount[]; updatedCount: number } {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { hierarchy: current, updatedCount: 0 };
  }
  const byId = new Map<number, HierarchyAvatarSnapshot>();
  for (const item of updates) {
    byId.set(item.id, item);
  }
  let updatedCount = 0;
  const next = current.map((acc) => {
    const patch = byId.get(acc.id);
    if (!patch) return acc;
    const nextAvatar =
      patch.avatarUrl && patch.avatarUrl.trim().length > 0
        ? patch.avatarUrl
        : acc.avatarUrl;
    const nextRobloxId = patch.robloxId ?? acc.robloxId;

    if (nextAvatar !== acc.avatarUrl || nextRobloxId !== acc.robloxId) {
      updatedCount += 1;
      return {
        ...acc,
        avatarUrl: nextAvatar,
        robloxId: nextRobloxId,
      };
    }
    return acc;
  });

  return updatedCount > 0
    ? { hierarchy: next, updatedCount }
    : { hierarchy: current, updatedCount: 0 };
}

