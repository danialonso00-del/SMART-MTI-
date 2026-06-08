/**
 * scripts/import-v05.js
 * Importa / actualiza todas las oportunidades del fichero ¡¡INDICE 2026!! MTI_v.05.csv
 * Las entradas INT y EXT se marcan como serviceType='internal'/'external' y se excluyen del pipeline comercial.
 *
 * Run: node scripts/import-v05.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Probabilidad fija por estado
const STATUS_PROB = { 1: 100, 2: 5, 3: 20, 4: 40, 5: 60, 6: 100, 7: 100, 8: 100, 9: 0, 10: 0 };

function fixEncoding(s) {
  return (s || '')
    .replace(/â¬/g, '€').replace(/Ã³/g, 'ó').replace(/Ã /g, 'à').replace(/Ã©/g, 'é')
    .replace(/Ã¡/g, 'á').replace(/Ã±/g, 'ñ').replace(/Ã¨/g, 'è').replace(/Ã­/g, 'í')
    .replace(/Ã²/g, 'ò').replace(/Ãº/g, 'ú').replace(/Ã¢/g, 'â').replace(/Ã‰/g, 'É')
    .replace(/CÃ meres/g, 'Càmeres').replace(/TÃºnel/g, 'Túnel').replace(/tÃºnel/g, 'túnel');
}

function parseAmount(raw) {
  if (!raw || !raw.trim()) return 0;
  let s = raw.trim().replace(/[€â¬$£\s]/g, '');
  if (!s) return 0;
  // European format: 1.234,56 → 1234.56
  s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

function parseDate(raw) {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  if (/^Q[1-4]$/.test(s) || /^\d{4}$/.test(s)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);
  if (/^\d{2}-\d{2}-\d{2}$/.test(s)) {
    const [d, m, y] = s.split('-');
    return new Date(`20${y}-${m}-${d}`);
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [d, m, y] = s.split('-');
    return new Date(`${y}-${m}-${d}`);
  }
  return null;
}

function parseStatus(raw) {
  const m = (raw || '').trim().match(/^(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function parseCurrency(raw) {
  return (raw || '').trim().startsWith('$') ? 'USD' : 'EUR';
}

function getServiceType(description) {
  const d = fixEncoding(description).trim();
  if (d.startsWith('INT ')) return 'internal';
  if (d.startsWith('EXT ')) return 'external';
  return null;
}

function normalizeCompany(raw) {
  const s = fixEncoding(raw).trim();
  const map = { 'MTi': 'MTI', 'Dipro': 'DIPRO', 'dipro': 'DIPRO', 'DIPRO': 'DIPRO' };
  return map[s] || s;
}

// ──────────────────────────────────────────────────────────────────────────────
// CSV data (columnas: ID;REF;CLIENT;DATE;DESCRIPTION;AMOUNT;STATUS;COMPANY;PROB;WPIPE;OWNER;COUNTRY;EXPCLOS;HW;IA;BIM;TTIO;EVENTS;PROSERVICES;ACCDATE;...)
// ──────────────────────────────────────────────────────────────────────────────
const CSV = `24-998;;INETUM;01-01-24;RAPPEL OBRAS INETUM 2024;0,00;7 Delivering;INGECO;100%;0,00;JML;Spain;;;;;;; 2025-01-01
24-999;;INETUM;01-01-25;RAPPEL OBRAS INETUM 2025;0,00;7 Delivering;INGECO;100%;0,00;JML;Spain;;;;;;;;2025-01-01
25-002;;Worldsensing;;Worldsensing thread x3;19.388,00;7 Delivering;DIPRO;100%;19.388,00;XAVI CARNER;Spain;;; ;8.388,00;;11.000,00;2025-01-01
25-007;;ECONOCOM;;USBC altabox;1.443,78;8 Finished;DIPRO;100%;1.443,78;OSCAR;Spain;;;;;;;1.443,78;2025-01-01
25-008;;Worldsensing;;Worldsensing outsourcing HR ADI;65.880,00;7 Delivering;MTI;100%;65.880,00;ADI;Spain;;;;;;;65.880,00;2025-01-01
25-009;;ETRA;;ETRA pielh;22.000,00;7 Delivering;MTI;100%;22.000,00;JORDI;Spain;;;;;;;22.000,00;2025-01-01
25-010;;BCN SmartTech;;GTI smart city proof of concept;62.580,00;7 Delivering;MTI;100%;62.580,00;DANI;Spain;;;;;;;62.580,00;2025-01-01
25-012;;Incapto;;Incapto placas orange 300u;9.964,00;8 Finished;DIPRO;100%;9.964,00;;Spain;;;;;;;9.964,00;2025-01-01
25-016;;Various;;TTiO SaaS;87.000,00;7 Delivering;DIPRO;100%;87.000,00;JAVIER;Spain;;;;;87.000,00;;;2025-01-01
25-017;;P. Freire;;MTi construcciones navales p. freire;120.962,52;7 Delivering;MTI;100%;120.962,52;SERGIO;Spain;;;;;;;120.962,52;2025-01-01
25-041;;Unisystems;;SMART SOLAR WATERS HEATERS;53.660,00;7 Delivering;MTI;100%;53.660,00;JORDI;Spain;Q4;;;;26.830,00;;26.830,00;2025-11-07
25-068;;Worldsensing;;WORLDSENSING WHITE LABEL;50.000,00;6 Won;MTI;100%;50.000,00;XAVI CARNER;Spain;Q3;;;;45.000,00;;5.000,00;2025-01-01
25-088;;TEKIA;17-12-25;Instalacion Equipos TMB/ALSA;7.596,00;7 Delivering;INGECO;100%;7.596,00;JML;Spain;Q4;;;;;;7.596,00;2025-12-17
25-089;;GEOACTIO;13-05-24;Reparacion de 10 Validadoras en Flota TUS Sabadell;1.350,00;7 Delivering;INGECO;100%;1.350,00;JML;Spain;;;;;;;1.350,00;2025-01-01
25-093;;GMV;20-09-24;Ampliaciones SAEATMBCN;60.000,00;7 Delivering;INGECO;100%;60.000,00;JML;Spain;;;;;;;60.000,00;2025-06-11
25-095;;GMV;03-10-24;Ampliaciones CCTVATMBCN;60.000,00;7 Delivering;INGECO;100%;60.000,00;JML;Spain;Q3;;;;;;60.000,00;2025-06-11
25-108;;GMV;15-01-25;Instalacion de SAE en Autobuses de Castilla y Leon;150.000,00;7 Delivering;INGECO;100%;150.000,00;JML;Spain;Q3;;;;;;150.000,00;2025-06-11
25-121;;DIPUTACIO TARRAGONA;16-03-25;Contadores Agua Municipios-Plataforma Diputacion;1.680.000,00;5 Contract Negotiation;MTI;60%;1.008.000,00;DANI;Spain;Q2;;;;1.680.000,00;;;;;
25-122;;H2LATAM;13-03-25;Pulseras Personas Mayores;14.500,00;2 Opportunity;MTI;5%;725,00;DANI;Spain;Q2;;;;;;14.500,00;;;
25-129;;ZOUH INFORMATION;28-03-25;Asesoramiento Smart City Turquia;27.734,00;7 Delivering;MTI;100%;27.734,00;FDB;Spain;;;;;;;27.734,00;2025-01-01
25-134;;TECNICAS DEL MAR-IGAPE;09-04-25;Prediccion de la demanda;0,00;8 Finished;MTI;100%;0,00;SERGIO;Spain;Q4;;;;;;0,00;2025-08-01
25-135;;GALICIA PINTURAS-IGAPE;09-04-25;Prediccion de la demanda;0,00;8 Finished;MTI;100%;0,00;SERGIO;Spain;Q4;;;;;;0,00;2025-08-01
25-137;;GALMETEC-IGAPE;09-04-25;Plataforma Integracion ERP;0,00;8 Finished;MTI;100%;0,00;SERGIO;Spain;Q4;;;;;;0,00;2025-12-31
25-138;;UCALSA;09-04-25;Plataforma Integracion ERP UCALSA;32.600,00;4 Solution Definition;MTI;40%;13.040,00;SERGIO;Spain;Q4;;32.600,00;;;;;;;
25-139;;TECNICAS DEL MAR-IGAPE;09-04-25;Plataforma Integracion ERP;0,00;8 Finished;MTI;100%;0,00;SERGIO;Spain;Q4;;;;;;0,00;2025-12-31
25-143;;INETUM;09-04-25;Renovacion de 90 maquinas autoventa Red Metro TMB;152.100,00;5 Contract Negotiation;INGECO;60%;91.260,00;JML;Spain;Q4;;;;;;152.100,00;;;
25-151;;SAGALES;23-04-25;Instalar T Mobilitat + SAE en Autobuses Nuevos;24.160,00;7 Delivering;INGECO;100%;24.160,00;JML;Spain;;;;;;;24.160,00;2025-04-23
25-155;;SAGALES;08-05-25;Desplazar Monitor Conductor en 190 Autobuses;18.260,00;7 Delivering;INGECO;100%;18.260,00;JML;Spain;Q2;;;;;;18.260,00;2025-07-10
25-156;;KINGSWAY DYNAMIC PTE LTD;08-05-25;Fusion Center Singapore;245.762,71;8 Finished;MTI;100%;245.762,71;FDB;Singapore;Q3;;;;;;245.762,71;2025-06-02
25-157;;FC Barcelona;16-05-25;Servicios Profesionales Implantacion Digital Twin;720.000,00;5 Contract Negotiation;MTI;60%;432.000,00;SERGIO;Spain;Q3;;;720.000,00;;;;;;
25-162;;AJUNTAMENT CALAFELL;26-05-25;Licitacion Calafell Xarxa de Cameras CCTV;14.900,00;5 Contract Negotiation;MTI;60%;8.940,00;DANI;Spain;Q4;;;;14.900,00;;;;;
25-165;;INETUM;26-05-25;Instalacion Datafono Autobuses Castilla y Leon;181.820,00;5 Contract Negotiation;INGECO;60%;109.092,00;JML;Spain;Q3;;;;;;181.820,00;;;
25-170;;BPMS;12-06-25;Desarrollo Sistema Mantenimiento para Proyectos;22.020,00;7 Delivering;MTI;100%;22.020,00;SERGIO;Angola;Q4;;22.020,00;;;;;2025-06-13
25-171;;RETECH;12-06-25;Desarrollo IA Agentiva para MICE;187.661,25;7 Delivering;MTI;100%;187.661,25;SERGIO;Spain;2026;;187.661,25;;;;;2025-11-13
25-173;;CETAQUA;19-06-25;Geofono y Soundwater;16.640,00;5 Contract Negotiation;MTI;60%;9.984,00;DANI;Spain;;;;;;;16.640,00;;;
25-175;;OBS;19-06-25;KAFD Change Request Contract CR2;630.000,00;9 Lost;MTI;0%;0,00;THIERY;Saudia;Q2;;;;630.000,00;;;;;
25-176;;INETUM;10-06-25;Instalacion WIFI en Bus Turistic TMB;16.733,78;5 Contract Negotiation;INGECO;60%;10.040,27;JML;Spain;Q3;;;;;;16.733,78;;;
25-181;;INNOVIA;07-07-25;Reparacion Placas Paneles Autopistas;12.000,00;5 Contract Negotiation;INGECO;60%;7.200,00;JML;Spain;Q3;;;;;;12.000,00;;;
25-183;;ITURRI;10-07-25;Piloto SmartBus;30.000,00;3 Requirements Gathering;MTI;20%;6.000,00;JML;Spain;Q4;;;;;;30.000,00;;;
25-184;;H2LATAM;10-07-25;Instalar 2 Cargadores Electricos Semirapidos;30.000,00;3 Requirements Gathering;MTI;20%;6.000,00;JML;Spain;Q4;;;;;;30.000,00;;;
25-185;;H2LATAM;10-07-25;Instalacion Cable Guiado en Parking Castellon;8.700,00;3 Requirements Gathering;MTI;20%;1.740,00;JML;Spain;Q4;;;;;;8.700,00;;;
25-188;;CIVIS;28-05-25;Configurador de Ofertas;15.000,00;5 Contract Negotiation;MTI;60%;9.000,00;SERGIO;Spain;Q4;;;;;;15.000,00;;;
25-192;;HOSPITAL CUNQUEIRO;14-07-25;LLM SIGI Hospital Cunqueiro;10.500,00;7 Delivering;MTI;100%;10.500,00;SERGIO;Spain;Q4;;10.500,00;;;;;2025-08-10
25-195;;GALICIA PINTURAS-IGAPE;09-04-25;Plataforma Integracion ERP GALPI;0,00;8 Finished;MTI;100%;0,00;SERGIO;Spain;Q4;;;;;;0,00;2025-08-20
25-196;;INETUM;08-08-25;Pintado Validadoras EMV TMB BUS;11.340,00;7 Delivering;INGECO;100%;11.340,00;JML;Spain;Q3;;;;;;11.340,00;2025-08-13
25-199;;RCFIL - IGAPE;01-08-25;Prediccion de la demanda;0,00;8 Finished;MTI;100%;0,00;SERGIO;Spain;2026;;;;;;0,00;2025-08-25
25-205;;INNOVIA;06-10-25;Suministro EOTEC 2000 2A06 Tunel 0 Sur;648,00;7 Delivering;INGECO;100%;648,00;JML;Spain;Q4;;;;;;648,00;2026-02-17
25-206;;INNOVIA;07-10-25;Suministro Recambios Panel PV32S89;979,38;4 Solution Definition;INGECO;40%;391,75;JML;Spain;Q4;;;;;;979,38;;;
25-208;;FC Barcelona;09-10-25;BIM 2 GMAO (Fase II);99.900,00;7 Delivering;MTI;100%;99.900,00;SERGIO;Spain;Q4;;;;;;99.900,00;2025-10-09
25-209;;INNOVIA;10-10-25;Reparar Cargador Circutor;264,00;7 Delivering;INGECO;100%;264,00;JML;Spain;Q4;;;;;;264,00;2026-01-13
25-210;;TUSGSAL;14-10-25;Instalacion T Mobilitat + Azimut Autobuses Nueva Flota;11.704,00;7 Delivering;INGECO;100%;11.704,00;JML;Spain;Q4;;;;;;11.704,00;2025-10-14
25-211;;COPLEGAL-IGAPE;22-10-25;Plataforma IGAPE Arquitectura Integracion Coplegal;0,00;8 Finished;MTI;100%;0,00;SERGIO;Spain;Q4;;;;;;0,00;2025-10-22
25-213;;SMA;09-10-25;MWC26 booth design + management;415.125,00;7 Delivering;MTI;100%;415.125,00;MARIA;Malaysia;2026;;;;;415.125,00;;2025-11-19
25-214;;NAVANTIA;22-10-25;NAVANTIA GRUAS FASE 2;66.780,00;7 Delivering;DIPRO;100%;66.780,00;JML;Spain;2026;;;;;;66.780,00;2025-12-05
25-215;;UOC;22-10-25;UOC Oct25 Multimetre i Components 85 uds;6.800,00;8 Finished;DIPRO;100%;6.800,00;OSCAR;Spain;2026;;;;;;6.800,00;2025-12-31
25-216;;UOC;22-10-25;UOC Oct25 KitArduino 30 uds;2.925,00;8 Finished;DIPRO;100%;2.925,00;OSCAR;Spain;2026;;;;;;2.925,00;2025-12-31
25-217;;UOC;22-10-25;UOC Oct25 LabHome 95 uds;12.302,50;8 Finished;DIPRO;100%;12.302,50;OSCAR;Spain;2026;;;;;;12.302,50;2025-12-31
25-219;;INETUM;22-10-25;Instalar y Mantener Sistema Ticketing Terrassa;99.852,00;5 Contract Negotiation;INGECO;60%;59.911,20;JML;Spain;;;;;;;99.852,00;;;
25-220;;INETUM;23-10-25;Instalacion Bag Drop en Aeropuerto AENA BARAJAS;7.920,00;5 Contract Negotiation;INGECO;60%;4.752,00;JML;Spain;;;;;;;7.920,00;;;
25-221;;UOC;24-10-25;UOC IRIDIUM Bolsa de horas (Marc);5.380,00;7 Delivering;DIPRO;100%;5.380,00;OSCAR;Spain;2026;;;;;;5.380,00;2025-12-31
25-222;;VITRADOC;26-10-25;VITRADOC Fase 2;22.280,00;7 Delivering;MTI;100%;22.280,00;JAVIER;Spain;2026;;;;;;22.280,00;2025-12-31
25-223;;INDUSTRIAS FERRI;07-11-25;LLMs Ferri Configurador Ofertas;14.550,00;7 Delivering;MTI;100%;14.550,00;SERGIO;Spain;2026;;14.550,00;;;;;2026-01-01
25-224;;FINSA;10-05-25;Piloto IA-BIM FINSA;15.000,00;5 Contract Negotiation;MTI;60%;9.000,00;SERGIO;Spain;2026;;;;;;;;;
25-225;;ECONOCOM;13-11-25;USBC Altabox Nov25;3.202,79;8 Finished;DIPRO;100%;3.202,79;OSCAR;Spain;2026;3.202,79;;;;;;2025-12-31
25-226;;PHI CARGO;10-10-25;Tailers Mexico Phi Cargo;15.000,00;4 Solution Definition;MTI;40%;6.000,00;JAVIER;Mexico;2026;;;;;;15.000,00;;;
25-227;;INNOVIA;31-10-25;Suministro Material Tunel 4 Sur;5.050,30;7 Delivering;INGECO;100%;5.050,30;JML;Spain;;;;;;;5.050,30;2026-02-17
25-229;;INETUM;19-11-25;Instalacion Pupitre Validadora y Sistema Central Bilbobus;770.154,00;5 Contract Negotiation;INGECO;60%;462.092,40;JML;Spain;;;;;;;770.154,00;;;
25-230;;FRANASI;19-11-25;Prosica Motiba Digital Delivery Proposal;22.340,00;7 Delivering;MTI;100%;22.340,00;CHLOE;Spain;2026;;;;;;22.340,00;2025-12-31
25-231;;Worldsensing;04-12-25;World Sensing - Nueva Era;0,00;7 Delivering;MTI;100%;0,00;JESUS;Spain;;;;;;;;2025-12-31
25-232;;SEDAL;05-12-25;SEDAL-Nuevo acuerdo Plataforma TTIO;8.300,00;7 Delivering;MTI;100%;8.300,00;JAVIER;Spain;2026;;;;8.300,00;;;2025-12-31
25-233;;AZIMUT;23-12-25;Instalacion ADAS Flota 36 Vehiculos;16.200,00;7 Delivering;INGECO;100%;16.200,00;JML;Spain;2026;;;;;;16.200,00;2026-01-30
25-234;;MERCHANT UNION;31-03-25;CPM MaruXIA;3.000.000,00;3 Requirements Gathering;MTI;20%;600.000,00;SERGIO;Spain;;;3.000.000,00;;;;;;;
25-235;;ORECO;31-07-25;Generador de Ofertas Oreco;33.900,00;4 Solution Definition;MTI;40%;13.560,00;SERGIO;Spain;;;33.900,00;;;;;;;
25-236;;ASTILLERO NODOSA;30-09-25;Configurador de Ofertas IA Agentiva;15.000,00;3 Requirements Gathering;MTI;20%;3.000,00;SERGIO;Spain;;;15.000,00;;;;;;;
25-237;;SARAWAK STATE;30-09-25;Estudio Viabilidad Fondos FIEM Sarawak;565.000,00;5 Contract Negotiation;MTI;60%;339.000,00;SERGIO;Malaysia;;;565.000,00;;;;;;;
25-238;;RC CELTA DE VIGO;30-09-25;Negocio: Mary en RC Celta de Vigo;65.000,00;3 Requirements Gathering;MTI;20%;13.000,00;SERGIO;Spain;;;65.000,00;;;;;;;
25-239;;IBERPOMPE;31-10-25;IA Agentiva Control de Stocks TR Iberpompe;23.000,00;3 Requirements Gathering;MTI;20%;4.600,00;SERGIO;Spain;;;23.000,00;;;;;;;
25-240;;DARLIM;30-11-25;Automatizacion pedidos por rutas logisticas Darlim;28.500,00;4 Solution Definition;MTI;40%;11.400,00;SERGIO;Spain;;;28.500,00;;;;;;;
25-241;;INDUSTRIAS FERRI;31-12-25;Herramienta Auditoria IA Ferri;14.700,00;5 Contract Negotiation;MTI;60%;8.820,00;SERGIO;Spain;;;14.700,00;;;;;;;
26-000;;FERROCARRILS METROPOLITANS BCN;01-01-26;Manteniment Preventiu/Correctiu Tram Nord L9/L10;69.303,00;7 Delivering;MARINA EYE-CAM;100%;69.303,00;CARLES;Spain;;;;;;;69.303,00;2026-01-01
26-001;;FERROCARRILS METROPOLITANS BCN;01-01-26;Manteniment Preventiu/Correctiu Tram Sud L9/L10;91.866,61;7 Delivering;MARINA EYE-CAM;100%;91.866,61;CARLES;Spain;;;;;;;91.866,61;2026-01-01
26-002;;FERROCARRILS METROPOLITANS BCN;01-01-26;Manteniment cameras sistema Tram IV L9/L10 Nord;24.276,00;7 Delivering;MARINA EYE-CAM;100%;24.276,00;CARLES;Spain;;;;;;;24.276,00;2026-01-01
26-003;;FERROCARRILS METROPOLITANS BCN;01-01-26;Manteniment cameras sistema Tram IV L9/L10 Sud;36.414,00;7 Delivering;MARINA EYE-CAM;100%;36.414,00;CARLES;Spain;;;;;;;36.414,00;2026-01-01
26-004;;TRANSPORTS METROPOLITANS BCN;01-01-26;Manteniment Sistema Video IP Cons Horta;17.537,98;7 Delivering;MARINA EYE-CAM;100%;17.537,98;CARLES;Spain;;;;;;;17.537,98;2026-01-01
26-005;;TRANSPORTS METROPOLITANS BCN;01-01-26;Manteniment Sistema Video IP Cons ZFI;16.827,78;7 Delivering;MARINA EYE-CAM;100%;16.827,78;CARLES;Spain;;;;;;;16.827,78;2026-01-01
26-006;;TRANSPORTS METROPOLITANS BCN;01-01-26;Manteniment Sistema Video IP Cons Triangle;15.032,55;7 Delivering;MARINA EYE-CAM;100%;15.032,55;CARLES;Spain;;;;;;;15.032,55;2026-01-01
26-007;;TRANSPORTS METROPOLITANS BCN;01-01-26;Manteniment Sistema Video IP Cons Ponent;10.376,80;7 Delivering;MARINA EYE-CAM;100%;10.376,80;CARLES;Spain;;;;;;;10.376,80;2026-01-01
26-008;;TRANSPORTS METROPOLITANS BCN;01-01-26;Mant. Sistema Seguretat Deteccio Intrusio FMB;30.166,47;7 Delivering;MARINA EYE-CAM;100%;30.166,47;CARLES;Spain;;;;;;;30.166,47;2026-01-01
26-009;;FERROCARRILS METROPOLITANS BCN;01-01-26;Manteniment Control d'Accesos L9;98.310,00;7 Delivering;MARINA EYE-CAM;100%;98.310,00;CARLES;Spain;;;;;;;98.310,00;2026-01-01
26-010;;FCC INDUSTRIAL;01-01-26;Ampliacion CON Zona Franca BUS;25.875,66;7 Delivering;MARINA EYE-CAM;100%;25.875,66;CARLES;Spain;;25.875,66;;;;;;2026-01-01
26-011;;FCC INDUSTRIAL;01-01-26;Nuevas estaciones de L9 TRAMO III / mano de obra;185.964,72;7 Delivering;MARINA EYE-CAM;100%;185.964,72;CARLES;Spain;;185.964,72;;;;;;2026-01-01
26-012;;EET EUROPARTS;01-01-26;Nuevas estaciones de L9 TRAMO III / materiales;429.132,60;7 Delivering;MARINA EYE-CAM;100%;429.132,60;CARLES;Spain;;429.132,60;;;;;;2026-01-01
26-013;;WAVECOM;01-01-26;Renovacion Obsolescencia L9 Fase 2 / mano de obra;121.500,00;7 Delivering;MARINA EYE-CAM;100%;121.500,00;CARLES;Spain;;121.500,00;;;;;;2026-01-01
26-014;;EET EUROPARTS;01-01-26;Renovacion Obsolescencia L9 Fase 2 / Materiales;436.780,50;7 Delivering;MARINA EYE-CAM;100%;436.780,50;CARLES;Spain;;436.780,50;;;;;;2026-01-01
26-015;;TRANSPORTS METROPOLITANS BCN;22-01-26;Implantacio d'un Sistema de commutacio i control en temps real CSPC;398.000,00;7 Delivering;MARINA EYE-CAM;100%;398.000,00;CARLES;Spain;;318.400,00;;;;;79.600,00;2026-01-23
26-016;;FERROCARRILS METROPOLITANS BCN;22-01-26;Desplegament de video IP Fase 7 a Metro;175.000,00;5 Contract Negotiation;MARINA EYE-CAM;60%;105.000,00;CARLES;Spain;;175.000,00;;;;;;;;
26-017;;FERROCARRILS METROPOLITANS BCN;22-01-26;Suministrament Material (Cameras);1.301,80;8 Finished;MARINA EYE-CAM;100%;1.301,80;CARLES;Spain;;1.301,80;;;;;;2026-01-23
26-100;;Telbina;22-01-26;Smart Villages platform & Use Cases;800.000,00;4 Solution Definition;BCN;40%;320.000,00;JORDI POL;Malaysia;;;;;600.000,00;;200.000,00;;;
26-101;;DBKU;22-01-26;Smart City Platform Kuching;50.000,00;4 Solution Definition;BCN;40%;20.000,00;JORDI POL;Malaysia;;;;;50.000,00;;;;;
26-101b;;Telbina;25-04-26;Smart City Bintulu;1.000.000,00;4 Solution Definition;BCN;40%;400.000,00;JORDI POL;Malaysia;;;;;500.000,00;;500.000,00;;;
26-201;;KSA;01-01-26;KSA - Madina Development Authority - Smart Lighting;200.000,00;5 Contract Negotiation;MTI ARABIA;60%;120.000,00;CHADI;Saudi Arabia;;;;;;;200.000,00;;;
26-202;;KSA;01-01-26;KSA - Various Projects;300.000,00;5 Contract Negotiation;MTI ARABIA;60%;180.000,00;CHADI;Saudi Arabia;;;;;;;300.000,00;;;
26-203;;QATAR;01-01-26;Qatar - Lavajet Smart Waste Management;412.000,00;7 Delivering;MTI ARABIA;100%;412.000,00;CHADI;Saudi Arabia;;;;;;;412.000,00;2026-01-01
26-204;;QATAR;01-01-26;Qatar - Lavajet Smart Waste Management - VO;328.767,00;5 Contract Negotiation;MTI ARABIA;60%;197.260,20;CHADI;Saudi Arabia;;;;;;;328.767,00;;;
26-205;;QATAR;01-01-26;Qatar - STEE;150.000,00;5 Contract Negotiation;MTI ARABIA;60%;90.000,00;CHADI;Saudi Arabia;;;;;;;150.000,00;;;
26-206;;LAVAJET;01-01-26;Lavajet - Saudi/Lebanon/UAE;200.000,00;5 Contract Negotiation;MTI ARABIA;60%;120.000,00;CHADI;Saudi Arabia;;;;;;;200.000,00;;;
26-207;;ETISALAT;01-01-26;Egypt - Etisalat;100.000,00;5 Contract Negotiation;MTI ARABIA;60%;60.000,00;CHADI;Saudi Arabia;;;;;;;100.000,00;;;
26-208;;CRCC;02-11-25;Jeddah - Smart Digital Twin;870.000,00;4 Solution Definition;MTI ARABIA;40%;348.000,00;CHADI;Saudi Arabia;;;;270.000,00;;;600.000,00;;;
26-209;;CRCC;02-11-25;Corporate Academy Dhahran Digital Twin;750.000,00;4 Solution Definition;MTI ARABIA;40%;300.000,00;CHADI;Saudi Arabia;;;;250.000,00;;;500.000,00;;;
26-300;;MTI;01-01-26;INT MTI VENTAS;0,00;7 Delivering;MTI;100%;0,00;DA/ SM;;;;;;;;;2026-01-01
26-301;;MTI;01-01-26;INT MTI TTIO;0,00;7 Delivering;MTI;100%;0,00;JORDI PIQUERO;;;;;;;;;2026-01-01
26-302;;MTI;01-01-26;INT MTI AI;0,00;7 Delivering;MTI;100%;0,00;JESUS;;;;;;;;;2026-01-01
26-303;;MTI;01-01-26;INT MTI SOFTWARE;0,00;7 Delivering;MTI;100%;0,00;ELOI;;;;;;;;;2026-01-01
26-304;;MTI;01-01-26;INT MTI RRHH;0,00;7 Delivering;MTI;100%;0,00;CANDELA;;;;;;;;;2026-01-01
26-305;;MTI;01-01-26;INT MTI MARKETING;0,00;7 Delivering;MTI;100%;0,00;MARIA D;;;;;;;;;2026-01-01
26-306;;MTI;01-01-26;INT MTI HARDWARE;0,00;7 Delivering;MTI;100%;0,00;CARLES;;;;;;;;;2026-01-01
26-307;;MTI;01-01-26;INT MTI COMPLIANCE;0,00;7 Delivering;MTI;100%;0,00;CANDELA;;;;;;;;;2026-01-01
26-308;;MTI;01-01-26;INT MTI ADMINISTRACION;0,00;7 Delivering;MTI;100%;0,00;JOSE MARIA;;;;;;;;;2026-01-01
26-309;;MTI;01-01-26;INT MTI;0,00;7 Delivering;MTI;100%;0,00;JML;;;;;;;;;2026-01-01
26-350;;ZONA TRUST;01-01-26;EXT ZONA TRUST;0,00;7 Delivering;MTI;100%;0,00;CHLOE;;;;;;;;;2026-01-01
26-351;;ONEMINDTECH;01-01-26;EXT ONEMINDTECH;0,00;7 Delivering;MTI;100%;0,00;JML;;;;;;;;;2026-01-01
26-352;;MTi SMARTTHINGS;01-01-26;EXT SMARTTHINGS;0,00;7 Delivering;MTI;100%;0,00;DANI A;;;;;;;;;2026-01-01
26-353;;MARCONA;01-01-26;EXT MARCONA;0,00;7 Delivering;MTI;100%;0,00;CHLOE;;;;;;;;;2026-01-01
26-354;;MAONLOF INVESTMENTS;01-01-26;EXT MAONLOF INVESTMENTS;0,00;7 Delivering;MTI;100%;0,00;CHLOE;;;;;;;;;2026-01-01
26-355;;MAONLOF GROUP;01-01-26;EXT MAONLOF GROUP;0,00;7 Delivering;MTI;100%;0,00;CHLOE;;;;;;;;;2026-01-01
26-356;;MAONLOF API;01-01-26;EXT MAONLOF API;0,00;7 Delivering;MTI;100%;0,00;CHLOE;;;;;;;;;2026-01-01
26-357;;EDUTECHNIK;01-01-26;EXT EDUTECHNIK;0,00;7 Delivering;MTI;100%;0,00;MARIA D;;;;;;;;;2026-01-01
26-358;;BCN SMARTTECH;01-01-26;EXT BCN SMARTTECH;0,00;7 Delivering;MTI;100%;0,00;DANI A;;;;;;;;;2026-01-01
26-359;;QUELL ONE;01-01-26;EXT QUELL ONE;0,00;7 Delivering;MTI;100%;0,00;MARIA D;;;;;;;;;2026-01-01
26-360;;MTi ARABIA;01-01-26;EXT MTi ARABIA;0,00;7 Delivering;MTI;100%;0,00;CHADI;;;;;;;;;2026-01-01
26-361;;MTi GmbH;01-01-26;EXT MTi GmbH;0,00;7 Delivering;MTI;100%;0,00;CHLOE;;;;;;;;;2026-01-01
26-400;;FUJITSU;01-01-26;Reparar Equipos Proveedor Externo;15.000,00;7 Delivering;INGECO;100%;15.000,00;JML;Spain;;;;;;;15.000,00;2026-01-01
26-401;;FUJITSU;01-01-26;Reparar Equipos Personal Interno;20.000,00;7 Delivering;INGECO;100%;20.000,00;JML;Spain;;;;;;;20.000,00;2026-01-01
26-402;;KINGSWAY DYNAMIC PTE LTD;23-12-25;Suministro Licencia y Soporte de Software Insight Data Analysis;2.852.194,92;7 Delivering;MTI;100%;2.852.194,92;FDB;Singapore;;;;;;;2.852.194,92;2026-01-01
26-403;;INNOVIA;07-01-26;Reparar Armarios PV32N104;6.636,82;4 Solution Definition;INGECO;40%;2.654,73;JML;Spain;;;;;;;6.636,82;;;
26-404;;ATM;07-01-26;Mantenimiento Primer Nivel CCTV;12.351,00;5 Contract Negotiation;INGECO;60%;7.410,60;JML;Spain;;;;;;;12.351,00;;;
26-405;;SAGALES;12-01-26;Diseno y Fabricacion Totem Marquesinas (200 Ud);960.000,00;4 Solution Definition;INGECO;40%;384.000,00;JML;Spain;;960.000,00;;;;;;;;
26-406;;INNOVIA;12-01-26;Suministro Material Panel PV32N104;594,00;8 Finished;INGECO;100%;594,00;JML;Spain;;594,00;;;;;;2026-01-13
26-407;;INNOVIA;12-01-26;Suministro Catalyst 2930 Plus POE + Configuracion;1.650,00;8 Finished;INGECO;100%;1.650,00;JML;Spain;;1.650,00;;;;;;2026-01-13
26-408;;HILLSA;12-01-26;Instalacion Tmobilitat + SAE Autobuses Nueva Flota;4.832,00;7 Delivering;INGECO;100%;4.832,00;JML;Spain;;;;;;;4.832,00;2026-01-12
26-409;;BTravel;22-12-25;Formacion reducida IA BTravel;700,00;7 Delivering;MTI;100%;700,00;SERGIO;Spain;;;;;;;700,00;2026-01-16
26-410;;TUS;20-01-26;Instalacion Sistema GEOACTIO en 1 Bus;580,00;7 Delivering;INGECO;100%;580,00;JML;Spain;;;;;;;580,00;2026-01-20
26-411;;GEOACTIO;22-01-26;Instalacion de 160 Validadoras en Flota TUS Sabadell;45.760,00;5 Contract Negotiation;INGECO;60%;27.456,00;JML;Spain;;9.760,00;;;;;36.000,00;;;
26-412;;EASTLINK INVESTMENTS;22-01-26;Validacion Testeo y Certificacion ComBox70;10.000,00;7 Delivering;MTI;100%;10.000,00;JML;Spain;;;;;;;10.000,00;2026-01-23
26-413;;GMV;22-01-26;Cambiar SIMs Moventia;1.540,00;5 Contract Negotiation;INGECO;60%;924,00;JML;Spain;;;;;;;1.540,00;;;
26-414;;AVANZA;09-01-26;Instalacion T Mobilitat en Autobuses Nueva Flota;7.534,80;7 Delivering;INGECO;100%;7.534,80;JML;Spain;;;;;;;7.534,80;2026-01-09
26-415;;INETUM;28-01-26;Mantenimiento N3 Validadoras TMB;42.000,00;7 Delivering;INGECO;100%;42.000,00;JML;Spain;;;;;;;42.000,00;2026-02-03
26-416;;INNOVIA;26-01-26;Reparar Incidencias Informe Baja Tension;0,00;5 Contract Negotiation;INGECO;60%;0,00;JML;Spain;;;;;;;;;;
26-417;;CITISEND;30-01-26;Sustituir Dispositivos Basuras;6.000,00;7 Delivering;INGECO;100%;6.000,00;JML;Spain;;;;;;;6.000,00;2026-01-30
26-418;;UOC;30-01-26;Sistemes Encastats 2026;0,00;9 Lost;DIPRO;0%;0,00;OSCAR;Spain;;0,00;;;;;;2026-02-03
26-419;;Ecoforest;06-02-26;MVP Fase 2 Asistente Postventa Ecoforest;34.500,00;3 Requirements Gathering;MTI;20%;6.900,00;SERGIO;Spain;;;34.500,00;;;;;;;
26-420;;Ecoforest;06-02-26;MVP Fase 1 Asistente Postventa Ecoforest;35.500,00;3 Requirements Gathering;MTI;20%;7.100,00;SERGIO;Spain;;;35.500,00;;;;;;;
26-421;;New Balance;06-02-26;Motor Recomendador New Balance;62.500,00;3 Requirements Gathering;MTI;20%;12.500,00;SERGIO;Spain;;;62.500,00;;;;;;;
26-422;;Sisubvenciones;06-02-26;Plataforma Subvenciones Sisubvenciones;74.750,00;3 Requirements Gathering;MTI;20%;14.950,00;SERGIO;Spain;;;74.750,00;;;;;;;
26-423;;Montajes Cancelas;06-02-26;Configurador de Ofertas Montajes Cancelas;34.750,00;3 Requirements Gathering;MTI;20%;6.950,00;SERGIO;Spain;;;34.750,00;;;;;;;
26-424;;Regensasa;06-02-26;Configurador de Ofertas Regenasa;45.045,00;3 Requirements Gathering;MTI;20%;9.009,00;SERGIO;Spain;;;45.045,00;;;;;;;
26-425;;Construyelo;06-02-26;Agente Logistica Construyelo;37.000,00;3 Requirements Gathering;MTI;20%;7.400,00;SERGIO;Spain;;;37.000,00;;;;;;;
26-426;;Construyelo;06-02-26;Recomendador Construyelo;35.250,00;3 Requirements Gathering;MTI;20%;7.050,00;SERGIO;Spain;;;35.250,00;;;;;;;
26-427;;Pazo de los Escudos;06-02-26;Agente Hoteles Pazo de los Escudos;54.500,00;3 Requirements Gathering;MTI;20%;10.900,00;SERGIO;Spain;;;54.500,00;;;;;;;
26-428;;Como Darwin;06-02-26;Configurador Ofertas 2 clientes metal Como Darwin;36.750,00;3 Requirements Gathering;MTI;20%;7.350,00;SERGIO;Spain;;;36.750,00;;;;;;;
26-429;;Porlan;06-02-26;Configurador Ofertas Porlan;55.000,00;3 Requirements Gathering;MTI;20%;11.000,00;SERGIO;Spain;;;55.000,00;;;;;;;
26-430;;XAC Constructora;06-02-26;Configurador Ofertas XAC;59.600,00;3 Requirements Gathering;MTI;20%;11.920,00;SERGIO;Spain;;;59.600,00;;;;;;;
26-431;;Ardora;06-02-26;Configurador de ofertas Ardora;34.000,00;3 Requirements Gathering;MTI;20%;6.800,00;SERGIO;Spain;;;34.000,00;;;;;;;
26-432;;UCALSA;06-02-26;Agente Planificador Ucalsa;42.350,00;3 Requirements Gathering;MTI;20%;8.470,00;SERGIO;Spain;;;42.350,00;;;;;;;
26-433;;CITIC-Censa;06-02-26;Automatizacion LLM CITIC-Censa;0,00;3 Requirements Gathering;MTI;20%;0,00;SERGIO;Spain;;;;;;;;;;
26-434;;INNOVIA;06-02-26;Sustituir 2 Camaras;6.825,00;7 Delivering;INGECO;100%;6.825,00;JML;Spain;;;;;;;6.825,00;;;
26-435;;INETUM;09-02-26;Mantenimiento N3 Validadoras ATM;83.667,26;7 Delivering;INGECO;100%;83.667,26;JML;Spain;;;;;;;83.667,26;2026-02-11
26-436;;INETUM;09-02-26;Mantenimiento N3 Validadoras TMOBCAT;24.500,00;7 Delivering;INGECO;100%;24.500,00;JML;Spain;;;;;;;24.500,00;2026-02-11
26-437;;FUJITSU;10-02-26;Actualizar Camaras FLIR;929,50;8 Finished;INGECO;100%;929,50;JML;Spain;;;;;;;929,50;2026-02-10
26-438;;CONDUENT;16-02-26;Mantenimiento Preventivo Balizas Cocheras TMB;9.509,42;7 Delivering;INGECO;100%;9.509,42;JML;Spain;;;;;;;9.509,42;2026-02-16
26-439;;National Security Intelligence Service;16-02-26;NIS - Servers Quote;10.112,00;7 Delivering;MTI;100%;10.112,00;DANI A;Kenya;;10.112,00;;;;;;2026-04-30
26-440;;National Security Intelligence Service;16-02-26;NIS - Assorted Items;167.429,00;5 Contract Negotiation;MTI;60%;100.457,40;DANI A;Kenya;;167.429,00;;;;;;;;
26-441;;Khazna;18-02-26;Gemelo Digital CPD Khazna;0,00;5 Contract Negotiation;MTI;60%;0,00;SERGIO;UAE;;;;;;;;;;
26-442;;ELLU;26-02-26;Smart Band Ellu;0,00;5 Contract Negotiation;MTI;60%;0,00;JAVIER;Spain;;;;;0,00;;;;;
26-443;;ENGIDI;26-02-26;Engidi TTiO;24.000,00;5 Contract Negotiation;MTI;60%;14.400,00;JAVIER;Spain;;;;;24.000,00;;;;;
26-444;;TMB;02-03-26;Reubicacion Validadoras TMOB en S61XX;11.340,00;7 Delivering;INGECO;100%;11.340,00;JML;Spain;;;;;;;11.340,00;2026-03-11
26-445;;INNOVIA;02-03-26;Reparar Material Vario;5.000,00;7 Delivering;INGECO;100%;5.000,00;JML;Spain;;;;;;;5.000,00;2026-03-02
26-446;;FCC INDUSTRIAL;03-03-26;Suministro Material e Instalacion Camaras Talleres Zona Franca;31.570,00;5 Contract Negotiation;INGECO;60%;18.942,00;JML;Spain;;;;;;;31.570,00;;;
26-447;;Worldsensing;03-03-26;Servicios de Apoyo para Desarrollo de Negocio en 2026;164.300,00;8 Finished;MTI;100%;164.300,00;JML;Spain;;;;;;;164.300,00;2026-03-03
26-448;;MONBUS;03-03-26;Instalacion T Mobilitat en Autobuses Nueva Flota;2.832,00;7 Delivering;INGECO;100%;2.832,00;JML;Spain;;;;;;;2.832,00;2026-03-03
26-449;;AUTOCORB;03-03-26;Instalacion Sistema Ayuda Conduccion Nueva Flota;498,00;7 Delivering;INGECO;100%;498,00;JML;Spain;;;;;;;498,00;2026-03-03
26-450;;UOC;13-03-26;UOC marzo 2026 - SISTEMES ENCASTATS;9.200,00;7 Delivering;DIPRO;100%;9.200,00;OSCAR;Spain;;9.200,00;;;;;;2026-01-13
26-451;;UOC;13-03-26;UOC marzo 2026 - MULTIMETRE I COMPONENTS;6.640,00;7 Delivering;DIPRO;100%;6.640,00;OSCAR;Spain;;6.640,00;;;;;;2026-01-13
26-452;;UOC;13-03-26;UOC marzo 2026 - PLACA;12.561,00;7 Delivering;DIPRO;100%;12.561,00;OSCAR;Spain;;12.561,00;;;;;;2026-01-13
26-453;;UOC;13-03-26;UOC marzo 2026 - ARDUINO;3.000,00;5 Contract Negotiation;DIPRO;60%;1.800,00;OSCAR;Spain;;3.000,00;;;;;;;;
26-454;;GMV;19-03-26;Instalaciones en Rubi;8.000,00;5 Contract Negotiation;INGECO;60%;4.800,00;JML;Spain;;;;;;;8.000,00;;;
26-455;;ASPOL;24-03-26;Aspol Igape 2026;26.590,00;5 Contract Negotiation;MTI;60%;15.954,00;SERGIO;Spain;;;26.590,00;;;;;;;
26-456;;FRIOTEIS;24-03-26;Frioteis Igape 2026;97.961,00;5 Contract Negotiation;MTI;60%;58.776,60;SERGIO;Spain;;;97.961,00;;;;;;;
26-457;;GRUAS DONIZ;24-03-26;Gruas Doniz Igape 2026;35.286,00;5 Contract Negotiation;MTI;60%;21.171,60;SERGIO;Spain;;;35.286,00;;;;;;;
26-458;;MERCHANT UNION;24-03-26;MU Igape 2026;102.100,00;5 Contract Negotiation;MTI;60%;61.260,00;SERGIO;Spain;;;102.100,00;;;;;;;
26-459;;PROMEGA GALICIA;24-03-26;Promega Igape 2026;29.750,00;5 Contract Negotiation;MTI;60%;17.850,00;SERGIO;Spain;;;29.750,00;;;;;;;
26-460;;FUNDACIO MONTILIVI;09-04-26;Digitalizacion Residencias;34.354,32;5 Contract Negotiation;MTI;60%;20.612,59;DANI;SPAIN;;20.669,22;;;;;13.685,10;;;
26-461;;CARDIOLOGY CENTER - QARSHI;16-04-26;Cambio de Tubo Rayos X;225.000,00;5 Contract Negotiation;MTI;60%;135.000,00;DANI;Uzbequistan;;;;;;;225.000,00;;;
26-462;;AEI;17-04-26;AEI 2026 CPD;0,00;3 Requirements Gathering;MTI;20%;0,00;SERGIO;Spain;;;;;;;;;;
26-463;;AEI;18-04-26;AEI 2026 - Next Stage Digital Twin;0,00;3 Requirements Gathering;MTI;20%;0,00;SERGIO;Spain;;;;;;;;;;
26-464;;RODMAN;18-04-26;ILS Rodman Patrulleras;103.360,00;7 Delivering;MTI;100%;103.360,00;SERGIO;Spain;;;;;;;103.360,00;2026-04-18
26-465;;GMV;28-04-26;Instalacion Proyecto Telebus en Flota Autobuses TMB Bus;37.595,00;7 Delivering;INGECO;100%;37.595,00;JML;Spain;;;;;;;37.595,00;2026-04-28
26-466;;INETUM;28-04-26;Instalacion 119 Pantallas Bilbao Bus;0,00;5 Contract Negotiation;INGECO;60%;0,00;JML;Spain;;;;;;;;;;
26-467;;INETUM;28-04-26;Instalacion Cable Microfono Vallado Puerto de Barcelona;0,00;5 Contract Negotiation;INGECO;60%;0,00;JML;Spain;;;;;;;;;;
26-468;;GARABITO;06-05-26;Smart City Garabito;1.000.000,00;3 Requirements Gathering;MTI;20%;200.000,00;DANI;Costa Rica;;;;;300.000,00;;700.000,00;;;
26-469;;MERCHANT UNION;22-05-26;Industria Innova 2026;210.000,00;5 Contract Negotiation;MTI;60%;126.000,00;SERGIO;Spain;;;210.000,00;;;;;;;
26-470;;FC Barcelona;25-05-26;RFQ 1090 Servicios Generales;610.000,00;4 Solution Definition;MTI;40%;244.000,00;DANI;Spain;;;;;;;610.000,00;;;
26-471;;GMV;25-05-26;Instalacion SAE en Vilanova + Costa Daurada;381.348,00;5 Contract Negotiation;INGECO;60%;228.808,80;JML;Spain;;;;;;;381.348,00;;;
26-472;;GMV;25-05-26;Instalacion Proyecto InstPan en Flota Autobuses TMB Bus;118.000,00;7 Delivering;INGECO;100%;118.000,00;JML;Spain;;;;;;;118.000,00;2026-05-25
26-473;;TUSGSAL;03-06-26;Sustituir TC por Validadora 2 en Toda la Flota;31.850,00;5 Contract Negotiation;INGECO;60%;19.110,00;JML;Spain;;;;;;;31.850,00;;;
26-474;;TUSGSAL;03-06-26;Instalacion de Tmobilitat en Nueva Flota 2026-2027;229.412,00;5 Contract Negotiation;INGECO;60%;137.647,20;JML;Spain;;;;;;;229.412,00;;;
26-475;;SAGALES;04-06-26;Suministro Conjunto Latiguillos Antena T-Mobilitat;7.580,00;7 Delivering;INGECO;100%;7.580,00;JML;Spain;;;;;;;7.580,00;2026-06-04`;

// ──────────────────────────────────────────────────────────────────────────────

function parseRow(line) {
  const cols = line.split(';');
  const get = (i) => fixEncoding((cols[i] || '').trim());

  const id = get(0);
  if (!id || id.startsWith(';')) return null;

  const description = get(4);
  const serviceType = getServiceType(description);
  const statusCode  = parseStatus(get(6));
  if (!statusCode) return null;

  const amount      = parseAmount(get(5));
  const currency    = parseCurrency(get(5));
  const probability = STATUS_PROB[statusCode] ?? 0;
  const weightedPipeline = amount * probability / 100;
  const pendingToInvoice = amount; // será ajustado con datos reales de contabilidad

  return {
    id,
    client:      get(2),
    date:        parseDate(get(3)) || new Date('2026-01-01'),
    opportunity: description,
    description: description,
    amount,
    currency,
    statusCode,
    company:     normalizeCompany(get(7)),
    probability,
    weightedPipeline,
    owner:       get(10),
    country:     get(11) || 'Spain',
    expectedClosingDate: parseDate(get(12)),
    blHardware:   parseAmount(get(13)),
    blIa:         parseAmount(get(14)),
    blBim:        parseAmount(get(15)),
    blTtioOm:     parseAmount(get(16)),
    blEvents:     parseAmount(get(17)),
    blProservices: parseAmount(get(18)),
    acceptanceDate: parseDate(get(19)),
    pendingToInvoice,
    serviceType,
    isInternal:  serviceType !== null,
  };
}

async function main() {
  const lines = CSV.split('\n').map(l => l.trim()).filter(Boolean);
  let created = 0, updated = 0, skipped = 0;

  for (const line of lines) {
    const row = parseRow(line);
    if (!row) { skipped++; continue; }

    const { id, pendingToInvoice, ...csvFields } = row;

    try {
      const existing = await prisma.opportunity.findUnique({ where: { id }, select: { id: true, totalInvoiced: true } });

      if (existing) {
        // Update only CSV-derived fields; preserve totalInvoiced, costs, margin etc.
        await prisma.opportunity.update({
          where: { id },
          data: {
            ...csvFields,
            // Recalculate pendingToInvoice based on existing totalInvoiced
            pendingToInvoice: Math.max(0, csvFields.amount - (existing.totalInvoiced || 0)),
          },
        });
        updated++;
      } else {
        await prisma.opportunity.create({
          data: { id, ...csvFields, pendingToInvoice, totalInvoiced: 0 },
        });
        created++;
      }
    } catch (err) {
      console.error(`Error en ${id}:`, err.message);
      skipped++;
    }
  }

  console.log(`\nImportacion completada:`);
  console.log(`  Creados:    ${created}`);
  console.log(`  Actualizados: ${updated}`);
  console.log(`  Omitidos:   ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
