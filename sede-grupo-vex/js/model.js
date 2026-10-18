/*
 * SEDE GRUPO VEX — modelo único do estudo preliminar.
 * Planta (SVG) e perspectivas (3D) são geradas a partir destes mesmos dados.
 *
 * Sistema de coordenadas, em metros:
 *   x cresce para LESTE  (0 = empena oeste, 20 = fachada leste envidraçada)
 *   y cresce para SUL    (0 = fachada norte envidraçada, 13 = parede do núcleo do edifício)
 *   z é a altura a partir do piso acabado.
 * Área interna da unidade: 20,00 x 13,00 = 260,0 m² (eixo das vedações de fechamento).
 */
(function (root) {
  const H = 3.10;      // piso acabado -> laje (pé-direito livre, laje aparente)
  const DOOR_H = 2.10; // altura das portas
  const FORRO = 2.70;  // forro acústico das salas fechadas

  const plate = { w: 20, d: 13 };

  // Eixos estruturais (pilares 40x40 cm). Vãos de 10,0 m x 6,5 m.
  const axesX = [{ id: 'A', v: 0 }, { id: 'B', v: 10 }, { id: 'C', v: 20 }];
  const axesY = [{ id: '1', v: 0 }, { id: '2', v: 6.5 }, { id: '3', v: 13 }];
  const columns = [];
  axesX.forEach(a => axesY.forEach(b => columns.push({ x: a.v, y: b.v, s: 0.4 })));

  const rooms = [
    { id: 'ceo', n: '01', name: 'Sala do CEO', sub: 'Thiago Siqueira', x0: 0, y0: 0, x1: 5.6, y1: 4.2, floor: 'oak', ceil: 'forro', occ: 1, cap: '1 posto + 5 lugares' },
    { id: 'juridico', n: '02', name: 'Jurídico', x0: 0, y0: 4.2, x1: 2.8, y1: 7.4, floor: 'oak', ceil: 'forro', occ: 1, cap: '1 posto + 2 lugares' },
    { id: 'planejamento', n: '03', name: 'Planejamento', sub: 'Eng. de planejamento', x0: 2.8, y0: 4.2, x1: 5.6, y1: 7.4, floor: 'concrete', ceil: 'forro', occ: 1, cap: '1 posto' },
    { id: 'recepcao', n: '04', name: 'Recepção', x0: 0, y0: 7.4, x1: 5.6, y1: 13, floor: 'concrete', ceil: 'exposed', occ: 1, cap: '1 posto + 2 espera' },
    { id: 'operacoes', n: '05', name: 'Operações e Controle de Obras', short: 'Operações', x0: 5.6, y0: 0, x1: 15.8, y1: 7.4, floor: 'concrete', ceil: 'exposed', occ: 16, cap: '16 postos + daily' },
    { id: 'financeiro', n: '06', name: 'Financeiro', x0: 15.8, y0: 0, x1: 20, y1: 4.0, floor: 'concrete', ceil: 'forro', occ: 3, cap: '3 postos + mesa' },
    { id: 'copa', n: '07', name: 'Copa', x0: 15.8, y0: 4.0, x1: 20, y1: 7.4, floor: 'porcelain', ceil: 'exposed', occ: 0, cap: '5 lugares' },
    { id: 'galeria', n: '08', name: 'Galeria', sub: 'circulação', x0: 5.6, y0: 7.4, x1: 20, y1: 8.9, floor: 'concrete', ceil: 'exposed', occ: 0 },
    { id: 'reuniao', n: '09', name: 'Reunião', x0: 5.6, y0: 8.9, x1: 11.0, y1: 13, floor: 'carpet', ceil: 'forro', occ: 0, cap: '11 lugares' },
    { id: 'apoio', n: '10', name: 'Apoio / TI', x0: 11.0, y0: 8.9, x1: 12.4, y1: 13, floor: 'concrete', ceil: 'forro', occ: 0 },
    { id: 'wcf', n: '11', name: 'WC Fem.', sub: 'acessível', x0: 12.4, y0: 8.9, x1: 14.1, y1: 13, floor: 'porcelain', ceil: 'forro', occ: 0 },
    { id: 'wcm', n: '12', name: 'WC Masc.', sub: 'acessível', x0: 14.1, y0: 8.9, x1: 15.8, y1: 13, floor: 'porcelain', ceil: 'forro', occ: 0 },
    { id: 'jogos', n: '13', name: 'Jogos', sub: 'descompressão', x0: 15.8, y0: 8.9, x1: 20, y1: 13, floor: 'concrete', ceil: 'exposed', occ: 0, cap: '6 pessoas' },
  ];
  rooms.forEach(r => { r.area = +((r.x1 - r.x0) * (r.y1 - r.y0)).toFixed(2); });

  // Zoneamento acústico usado na planta (camada "Ruído").
  const noise = { ceo: 'quiet', juridico: 'quiet', planejamento: 'quiet', reuniao: 'quiet', financeiro: 'medium', recepcao: 'medium', operacoes: 'medium', galeria: 'medium', apoio: 'medium', wcf: 'buffer', wcm: 'buffer', copa: 'loud', jogos: 'loud' };

  /*
   * Vedações. Todas ortogonais.
   *   axis 'h': parede horizontal na coordenada y=c, de a até b (em x)
   *   axis 'v': parede vertical   na coordenada x=c, de a até b (em y)
   * Tipos: ext (alvenaria/concreto 20 cm), facade (pele de vidro), acoustic (drywall duplo com lã, 15 cm),
   *        drywall (10 cm), glass (vidro laminado incolor em caixilho preto), fluted (vidro canelado).
   * Aberturas: kind door | double | glassdoor | hidden | slide | open ; hinge start|end ; into +1 (para +x/+y) ou -1.
   */
  const T = { ext: 0.20, facade: 0.10, acoustic: 0.15, drywall: 0.10, glass: 0.06, fluted: 0.06 };
  const walls = [
    // envoltória
    { id: 'fach-n', axis: 'h', c: -0.05, a: -0.2, b: 20.1, type: 'facade' },
    { id: 'fach-l', axis: 'v', c: 20.05, a: 0, b: 13.2, type: 'facade' },
    { id: 'emp-o', axis: 'v', c: -0.1, a: -0.1, b: 13.2, type: 'ext' },
    { id: 'nucleo-s', axis: 'h', c: 13.1, a: -0.2, b: 20.1, type: 'ext', open: [{ a: 2.2, b: 3.8, kind: 'double', into: 1, label: 'ENTRADA' }] },
    // bloco oeste: CEO, jurídico, planejamento, recepção
    { id: 'ceo-l', axis: 'v', c: 5.6, a: 0, b: 4.2, type: 'acoustic', open: [{ a: 3.1, b: 4.0, kind: 'door', hinge: 'end', into: -1 }] },
    { id: 'ceo-s', axis: 'h', c: 4.2, a: 0, b: 5.6, type: 'acoustic' },
    { id: 'jur-l', axis: 'v', c: 2.8, a: 4.2, b: 7.4, type: 'acoustic' },
    { id: 'plan-l', axis: 'v', c: 5.6, a: 4.2, b: 7.4, type: 'glass', open: [{ a: 6.35, b: 7.25, kind: 'glassdoor', hinge: 'end', into: -1 }] },
    { id: 'heroi', axis: 'h', c: 7.4, a: 0, b: 5.6, type: 'acoustic', open: [{ a: 0.2, b: 1.1, kind: 'hidden', hinge: 'start', into: -1 }] },
    { id: 'rec-acesso', axis: 'v', c: 5.6, a: 7.4, b: 8.9, type: 'glass', open: [{ a: 7.65, b: 8.65, kind: 'glassdoor', hinge: 'start', into: 1, label: 'acesso controlado' }] },
    { id: 'reu-o', axis: 'v', c: 5.6, a: 8.9, b: 13.0, type: 'acoustic', open: [{ a: 9.1, b: 10.0, kind: 'door', hinge: 'start', into: 1 }] },
    // operações x galeria
    { id: 'ops-s', axis: 'h', c: 7.4, a: 5.6, b: 15.8, type: 'glass', open: [{ a: 5.65, b: 6.95, kind: 'open' }, { a: 10.2, b: 11.1, kind: 'open' }, { a: 13.3, b: 14.4, kind: 'open' }] },
    { id: 'ops-l', axis: 'v', c: 15.8, a: 0, b: 7.4, type: 'acoustic', open: [{ a: 0.25, b: 1.15, kind: 'door', hinge: 'start', into: 1, label: 'acesso controlado' }] },
    { id: 'fin-s', axis: 'h', c: 4.0, a: 15.8, b: 20, type: 'acoustic' },
    { id: 'copa-s', axis: 'h', c: 7.4, a: 15.8, b: 20, type: 'drywall', open: [{ a: 16.0, b: 16.9, kind: 'door', hinge: 'start', into: -1 }] },
    // faixa sul
    { id: 'reu-n', axis: 'h', c: 8.9, a: 5.6, b: 11.0, type: 'acoustic', open: [{ a: 10.0, b: 10.9, kind: 'door', hinge: 'end', into: 1 }] },
    { id: 'apo-n', axis: 'h', c: 8.9, a: 11.0, b: 12.4, type: 'drywall', open: [{ a: 11.25, b: 12.05, kind: 'door', hinge: 'start', into: 1 }] },
    { id: 'wcf-n', axis: 'h', c: 8.9, a: 12.4, b: 14.1, type: 'drywall', open: [{ a: 12.55, b: 13.45, kind: 'slide', into: -1 }] },
    { id: 'wcm-n', axis: 'h', c: 8.9, a: 14.1, b: 15.8, type: 'drywall', open: [{ a: 14.25, b: 15.15, kind: 'slide', into: -1 }] },
    { id: 'jog-n', axis: 'h', c: 8.9, a: 15.8, b: 20, type: 'acoustic', open: [{ a: 16.0, b: 16.9, kind: 'door', hinge: 'start', into: 1 }] },
    { id: 'reu-l', axis: 'v', c: 11.0, a: 8.9, b: 13.0, type: 'acoustic' },
    { id: 'apo-l', axis: 'v', c: 12.4, a: 8.9, b: 13.0, type: 'drywall' },
    { id: 'wc-div', axis: 'v', c: 14.1, a: 8.9, b: 13.0, type: 'drywall' },
    { id: 'jog-o', axis: 'v', c: 15.8, a: 8.9, b: 13.0, type: 'acoustic' },
  ];
  walls.forEach(w => { w.t = T[w.type]; w.open = w.open || []; });

  /*
   * Mobiliário. Itens retangulares: x,y = canto noroeste; w = largura em x; d = profundidade em y.
   * Itens pontuais (cadeiras, poltronas, plantas, mesas redondas): x,y = centro; r = para onde a pessoa olha
   * (0 norte, 90 leste, 180 sul, 270 oeste).
   */
  const F = [];
  const add = (o) => { F.push(o); return o; };

  // 04 RECEPÇÃO
  add({ t: 'balcao', x: 1.8, y: 8.55, w: 2.4, d: 0.7, room: 'recepcao' });
  add({ t: 'chair', x: 3.0, y: 8.0, r: 180 });
  add({ t: 'monitor', x: 2.75, y: 8.62, w: 0.5, r: 180, h0: 1.06 });
  add({ t: 'armchair', x: 4.85, y: 10.75, r: 270 });
  add({ t: 'armchair', x: 4.85, y: 12.15, r: 270 });
  add({ t: 'sidetable', x: 4.85, y: 11.45, s: 0.5 });
  add({ t: 'planter', x: 0.0, y: 8.15, w: 0.42, d: 4.5, h: 0.45 });
  add({ t: 'plant', x: 1.25, y: 12.55, s: 0.6, h: 1.6 });
  add({ t: 'plant', x: 5.2, y: 12.65, s: 0.5, h: 1.3 });

  // 03 PLANEJAMENTO
  add({ t: 'desk', x: 3.15, y: 4.3, w: 1.6, d: 0.75, r: 0, mon: 2 });
  add({ t: 'chair', x: 3.95, y: 5.45, r: 0 });
  add({ t: 'cabinet', x: 2.9, y: 6.92, w: 1.3, d: 0.45, h: 2.1, mat: 'oak' });
  add({ t: 'chair', x: 4.95, y: 5.9, r: 270, kind: 'guest' });

  // 02 JURÍDICO
  add({ t: 'desk', x: 0.45, y: 5.0, w: 1.4, d: 0.7, r: 180, mon: 1, mat: 'oakDark' });
  add({ t: 'chair', x: 1.15, y: 4.6, r: 180 });
  add({ t: 'chair', x: 0.8, y: 6.15, r: 0, kind: 'guest' });
  add({ t: 'chair', x: 1.5, y: 6.15, r: 0, kind: 'guest' });
  add({ t: 'cabinet', x: 2.3, y: 4.32, w: 0.45, d: 2.55, h: 2.1, mat: 'oakDark' });

  // 01 CEO
  add({ t: 'credenza', x: 0.05, y: 0.95, w: 0.5, d: 2.3, h: 0.72, mat: 'oakDark' });
  add({ t: 'desk', x: 1.3, y: 1.0, w: 0.9, d: 2.2, r: 90, mon: 1, mat: 'oak', exec: true });
  add({ t: 'chair', x: 0.92, y: 2.1, r: 90, kind: 'exec' });
  add({ t: 'chair', x: 2.75, y: 1.6, r: 270, kind: 'guest' });
  add({ t: 'chair', x: 2.75, y: 2.6, r: 270, kind: 'guest' });
  add({ t: 'rug', x: 3.55, y: 0.35, w: 1.95, d: 2.5 });
  add({ t: 'armchair', x: 4.5, y: 0.78, r: 180 });
  add({ t: 'armchair', x: 4.5, y: 2.32, r: 0 });
  add({ t: 'armchair', x: 5.12, y: 1.55, r: 270 });
  add({ t: 'coffeetable', x: 4.1, y: 1.3, w: 0.8, d: 0.5 });
  add({ t: 'credenza', x: 0.9, y: 3.73, w: 2.6, d: 0.45, h: 0.6, mat: 'oakDark' });
  add({ t: 'plant', x: 0.45, y: 0.45, s: 0.55, h: 1.5 });

  // 05 OPERAÇÕES — duas bancadas de 8 postos (4 por lado), sentido norte-sul (perpendicular à fachada).
  add({ t: 'lockers', x: 5.68, y: 0.4, w: 0.45, d: 1.6, h: 2.0 });
  add({ t: 'cabinet', x: 5.68, y: 2.0, w: 0.45, d: 0.8, h: 2.0, mat: 'white' });
  add({ t: 'bench', x: 7.9, y: 1.0, w: 1.4, d: 5.6, n: 4, label: ['CONTROLE DE OBRAS', 'PLANEJAMENTO · APOIO'] });
  add({ t: 'bench', x: 11.1, y: 1.0, w: 1.4, d: 5.6, n: 4, label: ['SUPRIMENTOS', 'ADM · MKT · ESTÁGIO'] });
  add({ t: 'hightable', x: 13.8, y: 2.6, w: 0.7, d: 1.8 });
  add({ t: 'stool', x: 13.55, y: 4.75 });
  add({ t: 'stool', x: 14.2, y: 4.75 });
  add({ t: 'booth', x: 14.6, y: 6.12, w: 1.1, d: 1.1 });
  add({ t: 'plant', x: 6.35, y: 0.45, s: 0.55, h: 1.5 });
  add({ t: 'plant', x: 13.6, y: 0.45, s: 0.55, h: 1.5 });
  add({ t: 'whiteboard', x: 13.55, y: 5.55, w: 0.9, d: 0.06, h: 1.8 });

  // 06 FINANCEIRO
  [15.82, 17.21, 18.6].forEach((x, i) => {
    add({ t: 'desk', x, y: 3.3, w: 1.39, d: 0.68, r: 180, mon: 2 });
    add({ t: 'chair', x: x + 0.7, y: 2.85, r: 180 });
  });
  add({ t: 'cabinet', x: 15.9, y: 1.35, w: 0.5, d: 1.1, h: 2.1, mat: 'white', label: 'arquivo deslizante' });
  add({ t: 'roundtable', x: 18.55, y: 1.25, s: 0.9 });
  add({ t: 'chair', x: 17.85, y: 1.25, r: 90, kind: 'guest' });
  add({ t: 'chair', x: 19.25, y: 1.25, r: 270, kind: 'guest' });
  add({ t: 'chair', x: 18.55, y: 0.55, r: 180, kind: 'guest' });

  // 07 COPA
  add({ t: 'fridge', x: 15.88, y: 4.08, w: 0.7, d: 0.68 });
  add({ t: 'tower', x: 16.58, y: 4.08, w: 0.6, d: 0.6 });
  add({ t: 'counter', x: 17.18, y: 4.08, w: 2.77, d: 0.6, sink: 18.3, coffee: 19.45, upper: true });
  add({ t: 'barcounter', x: 19.5, y: 4.85, w: 0.45, d: 1.4 });
  add({ t: 'stool', x: 19.1, y: 5.2, r: 90 });
  add({ t: 'stool', x: 19.1, y: 5.9, r: 90 });
  add({ t: 'roundtable', x: 17.85, y: 6.3, s: 0.8 });
  add({ t: 'chair', x: 17.2, y: 6.3, r: 90, kind: 'cafe' });
  add({ t: 'chair', x: 18.5, y: 6.3, r: 270, kind: 'cafe' });
  add({ t: 'chair', x: 17.85, y: 6.95, r: 0, kind: 'cafe' });

  // 09 REUNIÃO — mesa 3,20 x 1,20 m, 11 lugares
  add({ t: 'table', x: 6.5, y: 10.35, w: 3.2, d: 1.2, mat: 'oak' });
  [6.82, 7.46, 8.1, 8.74, 9.38].forEach(x => {
    add({ t: 'chair', x, y: 9.93, r: 180, kind: 'meeting' });
    add({ t: 'chair', x, y: 11.97, r: 0, kind: 'meeting' });
  });
  add({ t: 'chair', x: 6.12, y: 10.95, r: 90, kind: 'meeting' });
  add({ t: 'credenza', x: 10.5, y: 10.2, w: 0.42, d: 1.5, h: 0.6, mat: 'oakDark' });

  // 10 APOIO / TI
  add({ t: 'printer', x: 11.08, y: 9.35, w: 0.6, d: 0.55 });
  add({ t: 'shelf', x: 11.08, y: 10.1, w: 0.4, d: 1.9, h: 2.0 });
  add({ t: 'rack', x: 11.6, y: 12.3, w: 0.6, d: 0.6, h: 1.25 });

  // 11/12 BANHEIROS (acessíveis, com ducha para equipe que volta de obra)
  [[12.4, 'wcf'], [14.1, 'wcm']].forEach(([x0, id]) => {
    add({ t: 'basin', x: x0 + 0.3, y: 9.75, r: 90, room: id });
    add({ t: 'toilet', x: x0 + 1.35, y: 11.15, r: 270, room: id });
    add({ t: 'shower', x: x0 + 0.08, y: 12.05, w: 1.55, d: 0.9, room: id });
    if (id === 'wcm') add({ t: 'urinal', x: x0 + 0.22, y: 10.85, r: 90, room: id });
  });

  // 13 JOGOS
  add({ t: 'shelf', x: 17.2, y: 8.98, w: 2.6, d: 0.32, h: 2.0, games: true });
  add({ t: 'counter', x: 15.88, y: 10.0, w: 0.5, d: 1.4, h: 0.9, frigobar: true, along: 'y' });
  add({ t: 'pebolim', x: 17.5, y: 9.6, w: 0.75, d: 1.45 });
  add({ t: 'sofa', x: 19.08, y: 11.25, w: 0.88, d: 1.75, r: 270 });
  add({ t: 'armchair', x: 17.1, y: 12.25, r: 90 });
  add({ t: 'coffeetable', x: 17.8, y: 11.85, w: 0.9, d: 0.55 });
  add({ t: 'rug', x: 16.75, y: 11.3, w: 3.1, d: 1.6 });

  /*
   * Itens de parede (só 3D; a planta marca telas e logos com uma linha).
   * face: para onde o item "olha" (N, S, L, O). p: coordenada da face da parede. a0/a1: extensão ao longo da parede.
   * z0/z1: alturas. kind: logo | screen | finish | frame | board | text | sign
   */
  const WI = [];
  const wi = (o) => { WI.push(o); return o; };
  // Recepção — parede heroica (face sul da parede y=7,4): ripado de madeira com caixa de luz e logo Grupo VEX
  wi({ kind: 'finish', mat: 'ripado', face: 'S', p: 7.475, a0: 0, a1: 5.6, z0: 0, z1: H });
  wi({ kind: 'logo', logo: 'grupo-vex', face: 'S', p: 7.52, a0: 2.35, a1: 3.65, z0: 1.35, z1: 2.65, plate: 'lightbox' });
  wi({ kind: 'screen', content: 'totem', face: 'S', p: 7.53, a0: 4.55, a1: 5.27, z0: 0.55, z1: 1.83 });
  // Recepção — parede do ecossistema (face leste da empena x=0)
  wi({ kind: 'finish', mat: 'concretePanel', face: 'L', p: 0.005, a0: 7.48, a1: 12.95, z0: 0, z1: H });
  const ecoY = [12.05, 10.9, 9.75, 8.6];
  const eco = ['sistema-vex', 'eap-goiania', 'vexor-engenharia', 'vex-view'];
  const ecoLbl = ['MÉTODO', 'GESTÃO', 'EXECUÇÃO', 'INTELIGÊNCIA VISUAL'];
  eco.forEach((k, i) => wi({ kind: 'logo', logo: k, face: 'L', p: 0.05, a0: ecoY[i] - 0.45, a1: ecoY[i] + 0.45, z0: 1.05, z1: 1.95, plate: 'white' }));
  wi({ kind: 'text', content: 'eco-band', face: 'L', p: 0.03, a0: 8.0, a1: 12.65, z0: 2.05, z1: 2.85 });
  // CEO
  wi({ kind: 'finish', mat: 'oakPanel', face: 'L', p: 0.005, a0: 0, a1: 4.2, z0: 0, z1: FORRO });
  wi({ kind: 'logo', logo: 'grupo-vex', face: 'L', p: 0.04, a0: 1.75, a1: 2.45, z0: 1.3, z1: 2.0, plate: 'white' });
  wi({ kind: 'screen', content: 'ceo', face: 'N', p: 4.12, a0: 1.3, a1: 2.75, z0: 1.0, z1: 1.82 });
  wi({ kind: 'frame', content: 'planta', face: 'O', p: 5.52, a0: 0.45, a1: 2.85, z0: 1.05, z1: 2.25 });
  // Planejamento
  wi({ kind: 'board', content: 'lastplanner', face: 'L', p: 2.88, a0: 4.45, a1: 6.85, z0: 0.85, z1: 2.15 });
  wi({ kind: 'logo', logo: 'sistema-vex', face: 'S', p: 4.28, a0: 4.95, a1: 5.4, z0: 1.75, z1: 2.2, plate: 'white' });
  // Jurídico
  wi({ kind: 'finish', mat: 'felt', face: 'S', p: 4.28, a0: 0.05, a1: 2.22, z0: 0.9, z1: 2.4 });
  // Operações — painel central de controle (3 x 2 telas 55") na parede leste
  wi({ kind: 'finish', mat: 'concretePanel', face: 'O', p: 15.72, a0: 1.62, a1: 7.3, z0: 0, z1: H });
  ['obras', 'cronograma', 'rdo', 'restricoes', 'suprimentos', 'produtividade'].forEach((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const a0 = 1.62 + col * 1.235; const z1 = 2.4 - row * 0.705;
    wi({ kind: 'screen', content: c, face: 'O', p: 15.66, a0, a1: a0 + 1.225, z0: z1 - 0.695, z1 });
  });
  wi({ kind: 'logo', logo: 'sistema-vex', face: 'O', p: 15.66, a0: 3.22, a1: 3.72, z0: 2.47, z1: 2.97, plate: 'white' });
  // Reunião
  wi({ kind: 'finish', mat: 'felt', face: 'N', p: 12.98, a0: 5.7, a1: 10.9, z0: 0.0, z1: FORRO });
  wi({ kind: 'finish', mat: 'oakPanel', face: 'L', p: 5.68, a0: 10.15, a1: 12.95, z0: 0, z1: FORRO });
  wi({ kind: 'logo', logo: 'grupo-vex', face: 'L', p: 5.72, a0: 11.15, a1: 11.65, z0: 1.45, z1: 1.95, plate: 'white' });
  wi({ kind: 'screen', content: 'reuniao', face: 'O', p: 10.92, a0: 10.0, a1: 11.9, z0: 0.95, z1: 2.02 });
  wi({ kind: 'text', content: 'camera', face: 'O', p: 10.9, a0: 10.7, a1: 11.2, z0: 2.08, z1: 2.16 });
  // Galeria de obras (face norte da parede da sala de reunião, voltada para a circulação)
  ['PLANEJAMENTO', 'EXECUÇÃO', 'CONTROLE', 'ENTREGA'].forEach((s, i) => {
    const c = 6.2 + i * 1.0;
    wi({ kind: 'frame', content: 'obra', stage: s, face: 'N', p: 8.82, a0: c - 0.42, a1: c + 0.42, z0: 1.15, z1: 1.75 });
  });
  wi({ kind: 'frame', content: 'obra', stage: 'VEX VIEW · AÉREA', face: 'S', p: 7.48, a0: 17.65, a1: 19.75, z0: 1.05, z1: 2.15 });
  // Sanitários: porcelanato cimentício nas paredes até 2,10 m
  [[12.4, 14.1], [14.1, 15.8]].forEach(([x0, x1]) => {
    wi({ kind: 'finish', mat: 'porcelainWall', face: 'L', p: x0 + 0.055, a0: 9.0, a1: 12.98, z0: 0, z1: 2.1 });
    wi({ kind: 'finish', mat: 'porcelainWall', face: 'O', p: x1 - 0.055, a0: 9.0, a1: 12.98, z0: 0, z1: 2.1 });
    wi({ kind: 'finish', mat: 'porcelainWall', face: 'N', p: 12.995, a0: x0 + 0.06, a1: x1 - 0.06, z0: 0, z1: 2.1 });
  });
  // Jogos — supergráfico de eixos e cotas em laranja queimado sobre grafite
  wi({ kind: 'finish', mat: 'supergrafico', face: 'N', p: 12.995, a0: 15.9, a1: 19.95, z0: 0, z1: H });
  wi({ kind: 'screen', content: 'tv', face: 'L', p: 15.9, a0: 11.55, a1: 12.8, z0: 1.0, z1: 1.72 });
  // Copa
  wi({ kind: 'finish', mat: 'tile', face: 'S', p: 4.08, a0: 17.18, a1: 19.95, z0: 0.9, z1: 1.5 });
  // Placas de porta (sinalização)
  [['01 CEO', 'L', 5.68, 2.82], ['05 OPERAÇÕES', 'S', 7.44, 7.6], ['06 FINANCEIRO', 'O', 15.72, 1.2],
   ['07 COPA', 'S', 7.46, 17.0], ['09 REUNIÃO', 'N', 8.83, 9.62], ['10 APOIO', 'N', 8.84, 12.06], ['11 WC FEM.', 'N', 8.84, 13.5],
   ['12 WC MASC.', 'N', 8.84, 15.2], ['13 JOGOS', 'N', 8.83, 16.95]].forEach(([s, face, p, c]) =>
    wi({ kind: 'sign', text: s, face, p, a0: c, a1: c + 0.34, z0: 1.5, z1: 1.62 }));

  // Iluminação: linhas suspensas/embutidas (x0,y0)-(x1,y1) na altura z
  const lights = [
    // recepção: três linhas paralelas à parede heroica + sanca na base do ripado
    { x0: 0.7, y0: 9.7, x1: 4.9, y1: 9.7, z: 2.8 }, { x0: 0.7, y0: 10.9, x1: 4.9, y1: 10.9, z: 2.8 }, { x0: 0.7, y0: 12.1, x1: 4.9, y1: 12.1, z: 2.8 },
    // operações: pendentes sobre as bancadas
    { x0: 8.6, y0: 1.2, x1: 8.6, y1: 6.4, z: 2.55 }, { x0: 11.8, y0: 1.2, x1: 11.8, y1: 6.4, z: 2.55 },
    { x0: 14.2, y0: 1.6, x1: 14.2, y1: 5.4, z: 2.75 }, { x0: 6.55, y0: 0.8, x1: 6.55, y1: 6.6, z: 2.8 },
    // galeria: linha contínua sobre a régua do piso
    { x0: 6.0, y0: 8.15, x1: 19.6, y1: 8.15, z: 2.9 },
    // copa e jogos
    { x0: 16.4, y0: 5.4, x1: 19.4, y1: 5.4, z: 2.7 }, { x0: 17.2, y0: 10.3, x1: 18.6, y1: 10.3, z: 2.2 }, { x0: 16.6, y0: 12.0, x1: 19.4, y1: 12.0, z: 2.8 },
    // salas com forro (embutidas)
    { x0: 0.8, y0: 1.4, x1: 3.2, y1: 1.4, z: FORRO - 0.01 }, { x0: 0.8, y0: 2.9, x1: 3.2, y1: 2.9, z: FORRO - 0.01 }, { x0: 3.9, y0: 0.6, x1: 3.9, y1: 3.3, z: FORRO - 0.01 },
    { x0: 0.5, y0: 5.6, x1: 2.3, y1: 5.6, z: FORRO - 0.01 }, { x0: 3.3, y0: 5.6, x1: 5.2, y1: 5.6, z: FORRO - 0.01 },
    { x0: 6.4, y0: 10.95, x1: 9.8, y1: 10.95, z: FORRO - 0.01 }, { x0: 6.2, y0: 9.5, x1: 10.4, y1: 9.5, z: FORRO - 0.01 }, { x0: 6.2, y0: 12.4, x1: 10.4, y1: 12.4, z: FORRO - 0.01 },
    { x0: 16.3, y0: 1.2, x1: 19.6, y1: 1.2, z: FORRO - 0.01 }, { x0: 16.3, y0: 2.6, x1: 19.6, y1: 2.6, z: FORRO - 0.01 },
    { x0: 11.7, y0: 9.4, x1: 11.7, y1: 12.6, z: FORRO - 0.01 }, { x0: 13.25, y0: 9.4, x1: 13.25, y1: 12.6, z: FORRO - 0.01 }, { x0: 14.95, y0: 9.4, x1: 14.95, y1: 12.6, z: FORRO - 0.01 },
  ];

  // Câmeras das perspectivas (pos/alvo em metros: x, y em planta, z altura)
  const views = [
    { id: 'aerea', title: 'Maquete — vista geral sudoeste', pos: [-6.5, 15.5, 21.5], at: [10.2, 6.2, -0.4], fov: 38, ceiling: false },
    { id: 'aerea-ne', title: 'Maquete — vista nordeste', pos: [27.5, -8.5, 16], at: [9.5, 6.8, -0.5], fov: 38, ceiling: false },
    { id: 'galeria', title: 'Galeria — eixo de circulação', pos: [5.95, 8.15, 1.6], at: [20, 8.15, 1.45], fov: 60, ceiling: true },
    { id: 'recepcao', title: 'Recepção — parede institucional', pos: [3.0, 12.85, 1.55], at: [3.0, 7.4, 1.75], fov: 56, ceiling: true },
    { id: 'ecossistema', title: 'Recepção — parede do ecossistema', pos: [4.25, 10.35, 1.5], at: [0, 10.35, 1.62], fov: 50, ceiling: true },
    { id: 'ceo', title: 'Sala do CEO', pos: [5.4, 3.95, 1.6], at: [0.6, 1.5, 1.1], fov: 66, ceiling: true },
    { id: 'operacoes', title: 'Operações — vista geral', pos: [6.35, 7.05, 1.75], at: [15.8, 2.4, 1.3], fov: 62, ceiling: true },
    { id: 'painel', title: 'Operações — painel central de controle', pos: [10.3, 6.4, 1.65], at: [15.8, 3.5, 1.65], fov: 52, ceiling: true },
    { id: 'reuniao', title: 'Sala de reunião', pos: [5.8, 10.45, 1.7], at: [11, 11.05, 1.25], fov: 64, ceiling: true },
    { id: 'planejamento', title: 'Sala do engenheiro de planejamento', pos: [5.45, 6.7, 1.6], at: [2.85, 4.7, 1.3], fov: 70, ceiling: true },
    { id: 'financeiro', title: 'Financeiro', pos: [16.1, 0.5, 1.6], at: [19.6, 3.6, 1.0], fov: 68, ceiling: true },
    { id: 'juridico', title: 'Jurídico', pos: [0.35, 7.12, 1.62], at: [2.3, 4.55, 1.05], fov: 74, ceiling: true },
    { id: 'copa', title: 'Copa', pos: [16.15, 7.15, 1.6], at: [19.8, 4.5, 1.15], fov: 68, ceiling: true },
    { id: 'jogos', title: 'Sala de jogos e descompressão', pos: [19.65, 9.45, 1.65], at: [16.0, 12.7, 0.95], fov: 70, ceiling: true },
    { id: 'wc', title: 'WC feminino acessível', pos: [13.0, 9.05, 1.6], at: [13.2, 12.9, 1.0], fov: 74, ceiling: true },
  ];

  root.VEX_MODEL = { H, DOOR_H, FORRO, plate, axesX, axesY, columns, rooms, noise, walls, furniture: F, wallItems: WI, lights, views, eco: { logos: eco, labels: ecoLbl, y: ecoY } };
})(typeof window !== 'undefined' ? window : globalThis);
