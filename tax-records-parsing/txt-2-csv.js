const fs = require('fs');
const _ = require('lodash');

const TXT_FILE =
  '/Users/ccogell13/projects/kingston/open-kingston/tax-records-parsing/source-data/Rochester-2017-Final-Assessment.txt';

// regex helpers
const platNumberRegex = /[0-9]+\.(-?[0-9]+-?)+(\.[0-9]+)?/; // ex1 76.4-2-30 ex2 52.20-1-5.100 ex3 52.-3-2
const starLine = /^\*+/gm; // ex **************
const starLineWithPlat = new RegExp(
  `${starLine.source}\\s*${platNumberRegex.source}\\s*\\*+`,
  'gm'
); // note double escapes needed in string interp
// ex ******************************************************************************************************* 76.4-3-16 ******************

console.log('starLineWithPlat', starLineWithPlat);

const buffer = fs.readFileSync(TXT_FILE);
const taxData = buffer.toString();

const starLineSplit = taxData.split(starLineWithPlat);

// filter out
// - undefined entries `undefined`
// - entries that are just a numbers "14"
// - entries that are just numbers that start with decimals ".120"

const blacklist = [
  /^\.?[0-9]+/,
  /2 0 1 7   F I N A L   A S S E S S M E N T   R O L L/,
];

const taxAssesmentBlocks = _.filter(starLineSplit, obj => {
  if (obj) {
    return !_.some(blacklist, regex => obj.match(regex));
  }
});

/**
 * take text like:
 *
 *                            994 Samsonville Rd                                                                            106458.000
 * 60.1-3-29                      210 1 Family Res                        COUNTY  TAXABLE VALUE            133,000
 * McKelvey Joyce C               RONDOUT VALLEY  513401         47,500   TOWN    TAXABLE VALUE            133,000
 * Joyce Rawitscher               ACRES    1.00                 133,000   SCHOOL  TAXABLE VALUE            133,000
 * 343 Codfish Falls Rd           EAST-0545406 NRTH-1105526               FD131 Accord fire                 133,000 TO
 * Storrs, CT 06268               DEED BOOK 4042   PG-269
 * FULL MARKET VALUE             137,113
 *
 * and return
 *
 * {
 *  first: [
 *    '60.1-3-29',
 *    'McKelvey Joyce C',
 *    'Joyce Rawitscher',
 *    ...
 *  ],
 *  second: [
 *    '994 Samsonville Rd',
 *    '210 1 Family Res',
 *    ...
 *  ],
 *  third: [
 *    '106458.000',
 *    'COUNTY  TAXABLE VALUE            133,000'
 *    ...
 *  ]
 * }
 *
 */
function parseColumns(block) {
  const columnRanges = {
    0: [0, 31],
    1: [31, 71],
    2: [71, 111],
  };

  // handle special case of second line plat address breaking the columnRanges convention
  function getRange(lineIndex, columnIndex) {
    // on the second line, first column
    if (lineIndex == 1 && columnIndex == 0) {
      return [0, 1];
    }

    // on the second line, second column
    if (lineIndex == 1 && columnIndex == 1) {
      return [26, 71];
    }

    if (!columnRanges[columnIndex]) {
      throw `no column range for column index of ${columnIndex}`;
    }

    return columnRanges[columnIndex];
  }

  const blockLines = block.split('\n');
  const lineArrays = _.map(blockLines, (line, lineIndex) =>
    _.map(columnRanges, (range, columnIndex) =>
      line.slice(...getRange(lineIndex, columnIndex)).trim()
    )
  );

  // from grouped by line [ [ 0,0 0,1 0,2 ], [...], [...] ] => to grouped by column [ [0,0 1,0 2,0 ...], [...], [...]]
  const columnArrays = _.unzip(lineArrays);

  // filter out empty strings
  const columnArraysFiltered = _.map(columnArrays, lines =>
    _.filter(lines, Boolean)
  );

  // take column groups and make them into an object
  return _.zipObject(['first', 'second', 'third'], columnArraysFiltered);
}

// function parseAddress(firstColumnArray) {
//
// }

for (var i = 0; i < 9; i++) {
  console.log('--------------------');
  console.log(parseColumns(taxAssesmentBlocks[i]));
}

// final interface goal ...
const currentObject = {
  first: [
    '52.20-1-3',
    'Kostka Guy',
    'Kostka Jane M',
    '546 Franklin Tpke',
    'Ridgewood, NJ 07450',
  ],
  second: [
    'Tilly Rd',
    '311 Res vac land',
    'RONDOUT VALLEY  513401          6,100',
    'ACRES    1.52                   6,100',
    'EAST-0540492 NRTH-1115447',
    'DEED BOOK 3048   PG-343',
    'FULL MARKET VALUE               6,289',
  ],
  third: [
    'COUNTY  TAXABLE VALUE              6,100',
    'TOWN    TAXABLE VALUE              6,100',
    'SCHOOL  TAXABLE VALUE              6,100',
    'FD131 Accord fire                   6,10',
  ],
};

const mapObjectToInterface = {
  'first': {
    0: 'platId'
  },
  'second': {
    3: {
      key: 'acres',
      filter: string => {
        const removedAcres = string.replace('ACRES', '').trim();
        const selectAcres = removedAcres.match(/[0-9]+(\.)?[0-9]*/)
        return selectAcres;
      }
    },
    4: 'gridCoord',
    5: 'deedBook',
    6: {
      key: 'fullMarketValue',
      filter: string => {
        return string.replace('FULL MARKET VALUE', '').trim();
      }
    },
  }
};

const finalInterface = {
  platId: '52.20-1-3',
  owners: ['Kostka Guy', 'Kostka Jane M'],
  ownerAddress: {
    street: '546 Franklin Tpke',
    city: 'Ridgewood',
    state: 'NJ',
    zip: '07450',
  },
  address: {
    street: 'Tilly Rd',
    county: 'Ulster',
    town: 'ROCHESTER',
    state: 'NY',
  },
  taxableValue: {
    county: '6,100',
    town: '6,100',
    school: '6,100',
  },
  deedBook: 'DEED BOOK 3048   PG-343',
  class: '311 Res vac land',
  gridCoord:'EAST-0540492 NRTH-1115447',
  fullMarketValue: '6,289',
  acres: '1.52',
  specialDistricts: 'FD131 Accord fire',
  schoolDistrict: 'RONDOUT VALLEY  513401',
};
