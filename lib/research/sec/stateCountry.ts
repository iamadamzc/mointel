/**
 * EDGAR's `stateOrCountry` code, decoded to the COUNTRY a reader recognises.
 *
 * The desk stores the code EDGAR returns (`issuer_registry.country`,
 * `dossier.country`): SANG is "A6", which is Ontario. A reader of a report
 * needs "Canada". Country only, never a state or province: the city was
 * dropped by his ruling (2026-09-30T10:42:25Z) and a province is the same
 * class of detail (proposed in design.md §8, question 3).
 *
 * THE TRAP THIS EXISTS FOR: "CA" is CALIFORNIA, not Canada. Canada's codes
 * are A0..B0 and Z4. A guess from the two letters reads 134 Californian
 * issuers on the 2026-09-29 prod copy as Canadian.
 *
 * SOURCE, verbatim: sec.gov "EDGAR State and Country Codes", last reviewed
 * 2024-06-05 per the page, read 2026-09-30. The table is kept as EDGAR writes
 * it; display names are derived below, with overrides only where EDGAR's form
 * is inverted or official ("KOREA, REPUBLIC OF").
 */

const EDGAR_CODES =
  "AL|ALABAMA;AK|ALASKA;AZ|ARIZONA;AR|ARKANSAS;CA|CALIFORNIA;CO|COLORADO;CT|CONNECTICUT;DE|DELAWARE;DC|DISTRICT OF COLUMBIA;FL|FLORIDA;GA|GEORGIA;HI|HAWAII;ID|IDAHO;IL|ILLINOIS;IN|INDIANA;IA|IOWA;KS|KANSAS;KY|KENTUCKY;LA|LOUISIANA;ME|MAINE;MD|MARYLAND;MA|MASSACHUSETTS;MI|MICHIGAN;MN|MINNESOTA;MS|MISSISSIPPI;MO|MISSOURI;MT|MONTANA;NE|NEBRASKA;NV|NEVADA;NH|NEW HAMPSHIRE;NJ|NEW JERSEY;NM|NEW MEXICO;NY|NEW YORK;NC|NORTH CAROLINA;ND|NORTH DAKOTA;OH|OHIO;OK|OKLAHOMA;OR|OREGON;PA|PENNSYLVANIA;RI|RHODE ISLAND;SC|SOUTH CAROLINA;SD|SOUTH DAKOTA;TN|TENNESSEE;TX|TEXAS;X1|UNITED STATES;UT|UTAH;VT|VERMONT;VA|VIRGINIA;WA|WASHINGTON;WV|WEST VIRGINIA;WI|WISCONSIN;WY|WYOMING;" +
  "A0|ALBERTA, CANADA;A1|BRITISH COLUMBIA, CANADA;A2|MANITOBA, CANADA;A3|NEW BRUNSWICK, CANADA;A4|NEWFOUNDLAND, CANADA;A5|NOVA SCOTIA, CANADA;A6|ONTARIO, CANADA;A7|PRINCE EDWARD ISLAND, CANADA;A8|QUEBEC, CANADA;A9|SASKATCHEWAN, CANADA;B0|YUKON, CANADA;Z4|CANADA (Federal Level);" +
  "B2|AFGHANISTAN;Y6|ALAND ISLANDS;B3|ALBANIA;B4|ALGERIA;B5|AMERICAN SAMOA;B6|ANDORRA;B7|ANGOLA;1A|ANGUILLA;B8|ANTARCTICA;B9|ANTIGUA AND BARBUDA;C1|ARGENTINA;1B|ARMENIA;1C|ARUBA;C3|AUSTRALIA;C4|AUSTRIA;1D|AZERBAIJAN;C5|BAHAMAS;C6|BAHRAIN;C7|BANGLADESH;C8|BARBADOS;1F|BELARUS;C9|BELGIUM;D1|BELIZE;G6|BENIN;D0|BERMUDA;D2|BHUTAN;D3|BOLIVIA;1E|BOSNIA AND HERZEGOVINA;B1|BOTSWANA;D4|BOUVET ISLAND;D5|BRAZIL;D6|BRITISH INDIAN OCEAN TERRITORY;D9|BRUNEI DARUSSALAM;E0|BULGARIA;X2|BURKINA FASO;E2|BURUNDI;E3|CAMBODIA;E4|CAMEROON;E8|CAPE VERDE;E9|CAYMAN ISLANDS;F0|CENTRAL AFRICAN REPUBLIC;F2|CHAD;F3|CHILE;F4|CHINA;F6|CHRISTMAS ISLAND;F7|COCOS (KEELING) ISLANDS;F8|COLOMBIA;F9|COMOROS;G0|CONGO;Y3|CONGO, THE DEMOCRATIC REPUBLIC OF THE;G1|COOK ISLANDS;G2|COSTA RICA;L7|COTE D'IVOIRE;1M|CROATIA;G3|CUBA;G4|CYPRUS;2N|CZECH REPUBLIC;G7|DENMARK;1G|DJIBOUTI;G9|DOMINICA;G8|DOMINICAN REPUBLIC;H1|ECUADOR;H2|EGYPT;H3|EL SALVADOR;H4|EQUATORIAL GUINEA;1J|ERITREA;1H|ESTONIA;H5|ETHIOPIA;H7|FALKLAND ISLANDS (MALVINAS);H6|FAROE ISLANDS;H8|FIJI;H9|FINLAND;I0|FRANCE;I3|FRENCH GUIANA;I4|FRENCH POLYNESIA;2C|FRENCH SOUTHERN TERRITORIES;I5|GABON;I6|GAMBIA;2Q|GEORGIA;2M|GERMANY;J0|GHANA;J1|GIBRALTAR;J3|GREECE;J4|GREENLAND;J5|GRENADA;J6|GUADELOUPE;GU|GUAM;J8|GUATEMALA;Y7|GUERNSEY;J9|GUINEA;S0|GUINEA-BISSAU;K0|GUYANA;K1|HAITI;K4|HEARD ISLAND AND MCDONALD ISLANDS;X4|HOLY SEE (VATICAN CITY STATE);K2|HONDURAS;K3|HONG KONG;K5|HUNGARY;K6|ICELAND;K7|INDIA;K8|INDONESIA;K9|IRAN, ISLAMIC REPUBLIC OF;L0|IRAQ;L2|IRELAND;Y8|ISLE OF MAN;L3|ISRAEL;L6|ITALY;L8|JAMAICA;M0|JAPAN;Y9|JERSEY;M2|JORDAN;1P|KAZAKSTAN;M3|KENYA;J2|KIRIBATI;M4|KOREA, DEMOCRATIC PEOPLE'S REPUBLIC OF;M5|KOREA, REPUBLIC OF;M6|KUWAIT;1N|KYRGYZSTAN;M7|LAO PEOPLE'S DEMOCRATIC REPUBLIC;1R|LATVIA;M8|LEBANON;M9|LESOTHO;N0|LIBERIA;N1|LIBYAN ARAB JAMAHIRIYA;N2|LIECHTENSTEIN;1Q|LITHUANIA;N4|LUXEMBOURG;N5|MACAU;1U|MACEDONIA, THE FORMER YUGOSLAV REPUBLIC OF;N6|MADAGASCAR;N7|MALAWI;N8|MALAYSIA;N9|MALDIVES;O0|MALI;O1|MALTA;1T|MARSHALL ISLANDS;O2|MARTINIQUE;O3|MAURITANIA;O4|MAURITIUS;2P|MAYOTTE;O5|MEXICO;1K|MICRONESIA, FEDERATED STATES OF;1S|MOLDOVA, REPUBLIC OF;O9|MONACO;P0|MONGOLIA;Z5|MONTENEGRO;P1|MONTSERRAT;P2|MOROCCO;P3|MOZAMBIQUE;E1|MYANMAR;T6|NAMIBIA;P5|NAURU;P6|NEPAL;P7|NETHERLANDS;P8|NETHERLANDS ANTILLES;1W|NEW CALEDONIA;Q2|NEW ZEALAND;Q3|NICARAGUA;Q4|NIGER;Q5|NIGERIA;Q6|NIUE;Q7|NORFOLK ISLAND;1V|NORTHERN MARIANA ISLANDS;Q8|NORWAY;P4|OMAN;R0|PAKISTAN;1Y|PALAU;1X|PALESTINIAN TERRITORY, OCCUPIED;R1|PANAMA;R2|PAPUA NEW GUINEA;R4|PARAGUAY;R5|PERU;R6|PHILIPPINES;R8|PITCAIRN;R9|POLAND;S1|PORTUGAL;PR|PUERTO RICO;S3|QATAR;S4|REUNION;S5|ROMANIA;1Z|RUSSIAN FEDERATION;S6|RWANDA;Z0|SAINT BARTHELEMY;U8|SAINT HELENA;U7|SAINT KITTS AND NEVIS;U9|SAINT LUCIA;Z1|SAINT MARTIN;V0|SAINT PIERRE AND MIQUELON;V1|SAINT VINCENT AND THE GRENADINES;Y0|SAMOA;S8|SAN MARINO;S9|SAO TOME AND PRINCIPE;T0|SAUDI ARABIA;T1|SENEGAL;Z2|SERBIA;T2|SEYCHELLES;T8|SIERRA LEONE;U0|SINGAPORE;2B|SLOVAKIA;2A|SLOVENIA;D7|SOLOMON ISLANDS;U1|SOMALIA;T3|SOUTH AFRICA;1L|SOUTH GEORGIA AND THE SOUTH SANDWICH ISLANDS;U3|SPAIN;F1|SRI LANKA;V2|SUDAN;V3|SURINAME;L9|SVALBARD AND JAN MAYEN;V6|SWAZILAND;V7|SWEDEN;V8|SWITZERLAND;V9|SYRIAN ARAB REPUBLIC;F5|TAIWAN;2D|TAJIKISTAN;W0|TANZANIA, UNITED REPUBLIC OF;W1|THAILAND;Z3|TIMOR-LESTE;W2|TOGO;W3|TOKELAU;W4|TONGA;W5|TRINIDAD AND TOBAGO;W6|TUNISIA;W8|TURKEY;2E|TURKMENISTAN;W7|TURKS AND CAICOS ISLANDS;2G|TUVALU;W9|UGANDA;2H|UKRAINE;C0|UNITED ARAB EMIRATES;X0|UNITED KINGDOM;2J|UNITED STATES MINOR OUTLYING ISLANDS;X3|URUGUAY;2K|UZBEKISTAN;2L|VANUATU;X5|VENEZUELA;Q1|VIET NAM;D8|VIRGIN ISLANDS, BRITISH;VI|VIRGIN ISLANDS, U.S.;X8|WALLIS AND FUTUNA;U5|WESTERN SAHARA;T7|YEMEN;Y4|ZAMBIA;Y5|ZIMBABWE;XX|UNKNOWN";

/** Code to EDGAR's own name, exactly as published. */
export const EDGAR_STATE_COUNTRY: ReadonlyMap<string, string> = new Map(
  EDGAR_CODES.split(';').map((pair) => pair.split('|') as [string, string]),
);

/** The 50 states, DC and EDGAR's own "UNITED STATES" (X1): all one country. */
const US_STATE_CODES = new Set(
  'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX X1 UT VT VA WA WV WI WY'.split(' '),
);

/** Ten provinces and a territory (A0..B0), and the federal code Z4. */
const CANADA_CODES = new Set('A0 A1 A2 A3 A4 A5 A6 A7 A8 A9 B0 Z4'.split(' '));

/** Where EDGAR's name is inverted or official, the name a reader uses. */
const DISPLAY_OVERRIDES: Readonly<Record<string, string>> = {
  M5: 'South Korea',
  M4: 'North Korea',
  K9: 'Iran',
  W0: 'Tanzania',
  '1S': 'Moldova',
  '1K': 'Micronesia',
  '1U': 'Macedonia',
  Y3: 'Democratic Republic of the Congo',
  D8: 'British Virgin Islands',
  VI: 'U.S. Virgin Islands',
  '1X': 'Palestinian Territory',
  M7: 'Laos',
  V9: 'Syria',
  '1Z': 'Russia',
  Q1: 'Vietnam',
  D9: 'Brunei',
  N1: 'Libya',
  X4: 'Vatican City',
  L7: "Côte d'Ivoire",
  H7: 'Falkland Islands',
  '1P': 'Kazakhstan',
  K4: 'Heard Island and McDonald Islands',
};

const SMALL_WORDS = new Set(['and', 'of', 'the']);

/** "BOSNIA AND HERZEGOVINA" to "Bosnia and Herzegovina"; hyphens keep both halves capitalised. */
function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word)
        ? word
        : word.replace(/(^|[-(])([a-z])/g, (_match, lead: string, letter: string) => lead + letter.toUpperCase()),
    )
    .join(' ');
}

/** Every country name this module can print, lower-cased, for matching a name already written out. */
let displayNames: Map<string, string> | null = null;
function knownNames(): Map<string, string> {
  if (displayNames) return displayNames;
  displayNames = new Map();
  for (const code of EDGAR_STATE_COUNTRY.keys()) {
    const name = edgarCountry(code);
    if (name) displayNames.set(name.toLowerCase(), name);
  }
  for (const [alias, name] of [
    ['us', 'United States'],
    ['usa', 'United States'],
    ['u.s.', 'United States'],
    ['u.s.a.', 'United States'],
    ['united states of america', 'United States'],
    ['uk', 'United Kingdom'],
  ] as const) {
    displayNames.set(alias, name);
  }
  return displayNames;
}

/**
 * A country from a value that may be EDGAR's code OR a name already written
 * out. `dossier.country` is MODEL-WRITTEN and mixed: on 2,500 prod versions,
 * mostly EDGAR codes copied from the bundle ("CA" 310, "F4" 122), but also
 * names ("Cayman Islands" 67, "Israel" 27, "United States" 16, "US" 15), and
 * SANG's dossier says "Canada" where the registry says "A6". A two-character
 * value is read as EDGAR's code (so "CA" stays California); a longer one must
 * match a country this module prints, or it is null. Never a guess.
 */
export function countryName(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  // A code EDGAR lists wins ("CA" is California); "US" and "UK" are not codes.
  if (trimmed.length === 2 && EDGAR_STATE_COUNTRY.has(trimmed.toUpperCase())) return edgarCountry(trimmed);
  return knownNames().get(trimmed.toLowerCase()) ?? null;
}

/**
 * The country for an EDGAR `stateOrCountry` code, or null when the code is
 * absent, unknown to EDGAR's list, or EDGAR's own UNKNOWN (XX). Never a guess.
 */
export function edgarCountry(code: string | null | undefined): string | null {
  if (!code) return null;
  const key = code.trim().toUpperCase();
  if (US_STATE_CODES.has(key)) return 'United States';
  if (CANADA_CODES.has(key)) return 'Canada';
  const name = EDGAR_STATE_COUNTRY.get(key);
  if (!name || key === 'XX') return null;
  return DISPLAY_OVERRIDES[key] ?? titleCase(name);
}
