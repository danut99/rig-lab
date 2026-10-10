// Punctele anatomice ale celor 12 specii noi, citite din imaginea de referință (rig-lab/generated-dinosaurs/<specie>/
// adult/art.png), în pixeli ai acelei imagini. scripts/build-species.mjs pune oasele pe ele și potrivește piesele
// pictate (parts.png) peste ele, ca dinozaurul în repaus să arate ca în art.png.
//
//   ground        linia solului (y)
//   length        lungimea în scenă față de un dinozaur obișnuit (1 = ca T-Rex-ul)
//   body/head     dreptunghiurile trunchiului și ale capului [x0, y0, x1, y1]
//   neck/tail     linia de mijloc, de la bază spre vârf
//   hind/front    picioarele din față ale imaginii: șold (umăr), genunchi (cot), gleznă, vârful degetelor
//   farHind/...   picioarele din spate: puncte proprii sau [dx, dy] față de cele din față
//   arm/farArm    brațele bipedelor: umăr, cot, încheietură, vârful ghearelor
//   neckW         grosimea gâtului în imagine
//   bodyFade      cât se estompează capetele trunchiului [stânga, dreapta]; neckFade la baza gâtului
//   headJoint     unde se prinde gâtul pe piesa capului (0…1); implicit marginea din stânga, la mijloc-jos
//   cover         placa de peste șold [x, y, lățime]
//   style         atacul: horns, bite, leapKick, claws, club, spikes, stomp, peck, dive, neckStrike
//   element       habitatul

export const SPECIES = {
  pyroceratops: {
    neckW: 220,
    form: 'quad', element: 'fire', style: 'horns', ground: 960, length: 1,
    body: [300, 290, 1010, 730], head: [920, 10, 1525, 600],
    neck: [[960, 540], [1020, 520], [1090, 500]],
    tail: [[340, 545], [200, 575], [25, 545]],
    hind: { hip: [540, 560], knee: [470, 760], ankle: [450, 880], toe: [545, 955] },
    farHind: [110, -8],
    front: { hip: [900, 620], knee: [880, 770], ankle: [935, 880], toe: [1040, 960] },
    farFront: [110, -20],
    cover: [560, 560, 250],
  },
  cineraptor: {
    neckW: 110,
    form: 'biped', element: 'fire', style: 'leapKick', ground: 985, length: 0.85,
    body: [640, 280, 1220, 620], head: [1140, 30, 1510, 260],
    neck: [[1180, 430], [1250, 310], [1270, 200]],
    tail: [[700, 420], [420, 420], [220, 300], [20, 90]],
    hind: { hip: [930, 540], knee: [970, 740], ankle: [1080, 860], toe: [1280, 980] },
    farHind: { hip: [770, 520], knee: [700, 700], ankle: [650, 790], toe: [780, 920] },
    arm: { shoulder: [1180, 500], elbow: [1260, 545], wrist: [1320, 565], tip: [1460, 760] },
    farArm: { shoulder: [1150, 480], elbow: [1235, 505], wrist: [1300, 535], tip: [1355, 700] },
    cover: [880, 470, 260],
  },
  pelagisaur: {
    neckW: 95,
    form: 'swimmer', element: 'water', style: 'neckStrike', ground: 860, length: 1.1,
    body: [330, 300, 1300, 590], head: [1520, 30, 1760, 160],
    neck: [[1130, 440], [1360, 345], [1460, 180], [1540, 110]],
    tail: [[440, 440], [220, 385], [30, 310]],
    flippers: {
      front: { root: [1020, 540], mid: [880, 650], tip: [570, 840] },
      rear: { root: [560, 520], mid: [420, 600], tip: [160, 730] },
      farFront: { root: [1120, 560], mid: [1180, 650], tip: [1300, 800] },
      farRear: { root: [560, 500], mid: [420, 545], tip: [120, 580] },
    },
  },
  fluviovenator: {
    neckW: 150,
    form: 'biped', element: 'water', style: 'bite', ground: 960, length: 1,
    body: [560, 95, 1100, 620], head: [1180, 50, 1520, 370],
    neck: [[1080, 350], [1130, 230], [1185, 150]],
    tail: [[620, 430], [350, 470], [150, 600], [70, 870]],
    hind: { hip: [700, 470], knee: [640, 690], ankle: [580, 820], toe: [700, 950] },
    farHind: { hip: [840, 520], knee: [880, 700], ankle: [950, 830], toe: [1160, 900] },
    arm: { shoulder: [960, 470], elbow: [1000, 590], wrist: [1030, 640], tip: [1070, 780] },
    farArm: { shoulder: [1060, 500], elbow: [1120, 570], wrist: [1180, 600], tip: [1230, 740] },
    cover: [720, 450, 250],
  },
  ferrankyl: {
    neckW: 170,
    form: 'quad', element: 'earth', style: 'club', ground: 800, length: 1,
    body: [430, 60, 1560, 620], head: [1500, 330, 1760, 560],
    neck: [[1420, 470], [1500, 460], [1570, 450]],
    tail: [[520, 400], [320, 380], [190, 270], [110, 140]],
    hind: { hip: [700, 530], knee: [650, 650], ankle: [640, 740], toe: [720, 795] },
    farHind: [140, -15],
    front: { hip: [1330, 560], knee: [1340, 660], ankle: [1360, 735], toe: [1450, 805] },
    farFront: [110, -25],
    cover: [700, 470, 300],
  },
  terratitan: {
    neckW: 115,
    form: 'quad', element: 'earth', style: 'stomp', ground: 1170, length: 1.25,
    body: [430, 480, 1150, 960], head: [1150, 0, 1300, 90],
    neck: [[1080, 560], [1100, 400], [1080, 200], [1150, 60]],
    tail: [[480, 700], [250, 850], [70, 950], [15, 1040]],
    hind: { hip: [600, 800], knee: [580, 950], ankle: [560, 1080], toe: [640, 1165] },
    farHind: [110, -15],
    front: { hip: [1000, 800], knee: [980, 960], ankle: [990, 1090], toe: [1070, 1175] },
    farFront: [110, -15],
    cover: [600, 760, 280],
  },
  silvosteg: {
    neckW: 120,
    form: 'quad', element: 'plant', style: 'spikes', ground: 960, length: 1,
    body: [380, 20, 1290, 760], head: [1300, 520, 1520, 650],
    neck: [[1180, 600], [1270, 595], [1330, 590]],
    tail: [[480, 540], [300, 580], [180, 600], [20, 520]],
    hind: { hip: [700, 580], knee: [640, 760], ankle: [610, 890], toe: [690, 960] },
    farHind: [130, -20],
    front: { hip: [1100, 650], knee: [1110, 790], ankle: [1150, 900], toe: [1250, 960] },
    farFront: [110, -20],
    cover: [700, 560, 300],
  },
  frondonychus: {
    neckW: 95,
    form: 'biped', element: 'plant', style: 'claws', ground: 1250, length: 0.85,
    body: [380, 380, 1050, 900], head: [780, 10, 1110, 200],
    neck: [[930, 480], [990, 330], [920, 180], [935, 120]],
    tail: [[480, 680], [250, 680], [30, 700]],
    hind: { hip: [500, 850], knee: [450, 1000], ankle: [420, 1150], toe: [540, 1250] },
    farHind: { hip: [650, 900], knee: [700, 1050], ankle: [770, 1160], toe: [890, 1220] },
    arm: { shoulder: [820, 640], elbow: [900, 720], wrist: [960, 760], tip: [1000, 1080] },
    farArm: { shoulder: [930, 630], elbow: [1020, 680], wrist: [1090, 720], tip: [1150, 1010] },
    cover: [520, 760, 300],
  },
  cryolophus: {
    neckW: 150,
    form: 'biped', element: 'ice', style: 'bite', ground: 990, length: 1,
    body: [520, 260, 1120, 640], head: [1180, 10, 1520, 400],
    neck: [[1100, 380], [1150, 250], [1210, 180]],
    tail: [[600, 440], [350, 370], [20, 420]],
    hind: { hip: [700, 560], knee: [640, 740], ankle: [590, 850], toe: [700, 985] },
    farHind: { hip: [850, 600], knee: [880, 750], ankle: [930, 860], toe: [1060, 940] },
    arm: { shoulder: [1000, 520], elbow: [1040, 600], wrist: [1060, 640], tip: [1110, 700] },
    farArm: { shoulder: [1070, 520], elbow: [1110, 585], wrist: [1135, 620], tip: [1165, 700] },
    cover: [720, 520, 260],
  },
  tundraceratops: {
    neckW: 200,
    form: 'quad', element: 'ice', style: 'horns', ground: 970, length: 1,
    body: [130, 230, 1120, 770], head: [700, 20, 1510, 640],
    neck: [[900, 560], [950, 540], [1000, 520]],
    tail: [[250, 560], [170, 570], [90, 580]],
    hind: { hip: [350, 650], knee: [300, 790], ankle: [280, 900], toe: [370, 965] },
    farHind: [130, -15],
    front: { hip: [880, 650], knee: [870, 800], ankle: [880, 910], toe: [990, 975] },
    farFront: [110, -20],
    cover: [330, 600, 260],
  },
  tempestopteryx: {
    neckW: 82, tailW: 20,
    headTip: { adult: [1520, 424] },
    // adultul: decupat direct din art.png. `body` = corp, gât, cap, coadă, picioare (deasupra); `nearWing` = aripa din
    // dreapta (în spatele gâtului); restul = aripa din stânga. `head` = zona rigidă a capului.
    artLayers: {
      body: [[760, 60], [1100, 60], [1536, 320], [1536, 445], [1100, 445], [1075, 480], [1050, 520], [1020, 560], [995, 592], [1010, 615], [1040, 632], [1000, 660], [940, 690], [880, 706], [840, 722], [800, 746], [760, 768], [730, 786], [740, 800], [720, 900], [280, 900], [280, 740], [560, 728], [610, 728], [660, 722], [700, 705], [720, 672], [750, 652], [780, 630], [800, 605], [830, 572], [870, 535], [900, 520], [940, 505], [1000, 480], [1040, 440], [760, 230]],
      nearWing: [[960, 445], [1536, 445], [1536, 1024], [700, 1024], [700, 790], [760, 760], [940, 690]],
      head: [[760, 60], [1536, 60], [1536, 450], [1105, 450], [1085, 425], [1050, 425], [760, 260]],
      under: 8,
    },
    form: 'flyer', element: 'storm', style: 'dive', ground: 900, length: 1, flapScale: 0.45,
    // din calibrarea automată doar capul (SIFT); gâtul și coada de mai jos sunt citite de mână din art.png
    fitOnly: ['head'],
    // capul pictat include un ciot de gât: îl tăiem (gâtul are piesa lui și intră adânc sub cap)
    // gâtul e desenat înaintea trunchiului și intră adânc sub cap: capetele abia se estompează, altfel se vede fundalul
    neckInto: 1.1, neckEndFade: 0.04, neckFade: 0.3, neckTuck: 0.2,
    // capul puilor: baza capului la capătul gâtului, ciocul pe direcția din artă, mai scurt decât la adult
    beak: [[1098, 428], [1510, 400]], headScale: { pui: 0.72, juvenil: 0.9 },
    bodyFade: { adult: [0.22, 0.1], juvenil: [0.16, 0.1], pui: [0.34, 0.1] }, neckOverBody: true,
    body: [720, 540, 1000, 720], head: [850, 160, 1520, 420],
    // trunchiul: priza cozii și priza gâtului din piesă (0…1 în piesă) → punctele din artă
    // trunchiul: priza cozii și priza gâtului din piesă (0…1 în piesă) → punctele din artă (rotație + scară uniformă);
    // priza cozii stă în spatele coapsei, unde e capătul trunchiului în artă
    bodyAxis: [[712, 682], [1008, 558]],
    bodyPins: { adult: [[0.06, 0.33], [0.97, 0.47]], juvenil: [[0.12, 0.46], [0.97, 0.37]], pui: [[0.07, 0.6], [0.92, 0.16]] },
    // gâtul urcă din piept și intră sub ciotul de gât al capului
    neck: [[972, 588], [1008, 540], [1042, 494], [1072, 456], [1098, 428]],
    tail: [[722, 716], [620, 738], [520, 756], [440, 770], [352, 824]],
    // coapsa e o masă mare, lipită de burtă, care acoperă și baza cozii
    hind: { hip: [800, 652], knee: [688, 772], ankle: [656, 776], toe: [578, 842] },
    // piciorul din spate e aproape ascuns în artă: coapsa lui stă în spatele trunchiului, se văd doar ghearele
    farHind: { hip: [790, 672], knee: [745, 737], ankle: [722, 776], toe: [668, 832] },
    // membrana: butonul brațului, încheietura cu gheara, vârful degetului (0…1 în piesă) → membrane/umăr, încheietură, vârf
    // + colțul de jos, unde marginea din spate a membranei se prinde de corp → `body`
    wingPins: {
      adult: [[0.04, 0.29], [0.74, 0.07], [0.99, 0.97], [0.22, 0.73]],
      juvenil: [[0.1, 0.27], [0.62, 0.07], [0.99, 0.99], [0.12, 0.68]],
      pui: [[0.06, 0.45], [0.72, 0.12], [0.99, 0.99], [0.1, 0.82]],
    },
    wingArmWidth: 0.6,
    thighWidth: { juvenil: 0.72, pui: 0.8 },
    nearWingBehind: true,
    // coapsele sunt desenate cu un ciot de gambă îndoit dedesubt; gamba are piesa ei
    cut: {
      'adult/thigh': [[0.36, 0.63, 0.82, 1.01]], 'juvenil/thigh': [[0.5, 0.67, 1.01, 1.01]], 'pui/thigh': [[0.62, 0.6, 1.01, 1.01]],
      // trunchiul juvenilului are pictat și un ciot de picior sub burtă
      // (și priza cozii, descoperită în spate)
      'juvenil/body': [[0.2, 0.68, 0.41, 1.01], [-0.01, 0.28, 0.11, 0.64]],
      // priza evazată de la baza cozii (coada e subțire în artă)
      'adult/tail': [[-0.01, -0.01, 0.09, 1.01]], 'juvenil/tail': [[-0.01, -0.01, 0.08, 1.01]], 'pui/tail': [[-0.01, -0.01, 0.09, 1.01]],
      'adult/head': [[-0.01, 0.66, 0.46, 1.01]], 'juvenil/head': [[-0.01, 0.7, 0.42, 1.01]], 'pui/head': [[0.2, 0.62, 0.5, 1.01]],
    },
    // umerii stau în interiorul trunchiului (capătul estompat al brațului rămâne ascuns); `membrane` = rădăcina membranei
    wing: { shoulder: [960, 620], elbow: [1100, 605], wrist: [1298, 495], tip: [1508, 888], membrane: [990, 614], body: [950, 700] },
    farWing: { shoulder: [905, 585], elbow: [712, 412], wrist: [607, 142], tip: [15, 15], body: [748, 690], mirror: true },
  },
  fulgurodrome: {
    neckW: 75,
    form: 'biped', element: 'storm', style: 'peck', ground: 990, length: 0.9,
    body: [600, 300, 1290, 560], head: [1180, 20, 1410, 140],
    neck: [[1220, 420], [1310, 290], [1280, 180], [1250, 110]],
    tail: [[650, 380], [400, 340], [200, 250], [30, 220]],
    hind: { hip: [1050, 460], knee: [1070, 640], ankle: [1090, 770], toe: [1400, 985] },
    farHind: { hip: [880, 480], knee: [820, 640], ankle: [720, 890], toe: [830, 1000] },
    arm: { shoulder: [1230, 480], elbow: [1270, 560], wrist: [1330, 600], tip: [1400, 690] },
    farArm: { shoulder: [1200, 500], elbow: [1220, 600], wrist: [1270, 640], tip: [1330, 720] },
    cover: [1000, 420, 240],
  },
};

