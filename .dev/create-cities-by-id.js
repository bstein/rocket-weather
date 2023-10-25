// Script to transform array of cities to an object with entries like { geonameid: city, ... } to enable faster lookup by geonameid
//  Inputs:
//    - "cities.json" file
//  Outputs:
//    - "cities-by-id.json" file
//    - "cities-by-id-formatted.json" file
//  How to use:
//    1. Run "NODE_OPTIONS=--max_old_space_size=8192 node .dev/create-cities-by-id.js" in the terminal from the root project directory

import { DOT_DATA_PATH } from './constants.js';
import { read, write } from './utils.js';

const citiesToCitiesById = cities => {
  const citiesById = {};
  const timeZones = {};
  for (const city of cities) {
    citiesById[city.geonameid] = [
      city.cityName,
      city.stateCode,
      city.population,
      city.latitude,
      city.longitude,
      city.timeZone
    ];
    timeZones[city.timeZone] = timeZones[city.timeZone] == null ? 1 : timeZones[city.timeZone] + 1;
  }
  console.log(timeZones);
  return citiesById;
};

const run = async () => {
  const cities = await read(`${DOT_DATA_PATH}cities.json`);
  const citiesById = citiesToCitiesById(cities);
  await write(`${DOT_DATA_PATH}cities-by-id-encoded.json`, citiesById);
  await write(`${DOT_DATA_PATH}cities-by-id-encoded-formatted.json`, citiesById, true);
};

run();
