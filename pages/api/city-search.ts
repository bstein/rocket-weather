import { NextApiRequest, NextApiResponse } from 'next';
import { CITY_SEARCH_RESULTS_MAX_AGE } from 'constants/server';
import { API_COORDINATES_KEY, API_GEONAMEID_KEY, API_SEARCH_QUERY_KEY } from 'constants/shared';
import dayjs from 'dayjs';
import { CitiesReqQueryHelper } from 'helpers/api/cities-req-query-helper';
import { LoggerHelper } from 'helpers/api/logger-helper';
import { APIRoute, getPath } from 'models/api/api-route.model';
import { Response } from 'models/api/response.model';
import { City } from 'models/cities/cities.model';

const LOGGER_LABEL = getPath(APIRoute.CITY_SEARCH);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const getPartialResponse = async (): Promise<Pick<Response<City[] | null>, 'data' | 'warnings' | 'errors'>> => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const keys = [API_GEONAMEID_KEY, API_COORDINATES_KEY, API_SEARCH_QUERY_KEY];

    const cityFromId = await CitiesReqQueryHelper.getCityFromId(req.query, keys.slice(1), warnings);
    if (cityFromId != null) return { data: [cityFromId], warnings, errors };

    const closestCityFromCoordinates = await CitiesReqQueryHelper.getClosestCityFromCoordinates(
      req.query,
      keys.slice(2),
      warnings
    );
    if (closestCityFromCoordinates != null) return { data: [closestCityFromCoordinates], warnings, errors };

    const citiesFromSearchQuery = await CitiesReqQueryHelper.getCitiesFromSearchQuery(req.query, [], warnings);
    if (citiesFromSearchQuery != null) return { data: citiesFromSearchQuery, warnings, errors };

    errors.push(`No valid query param was provided; valid keys are: '${keys.join(`', '`)}'`);
    return { data: null, warnings, errors };
  };

  try {
    const partialResponse = await getPartialResponse();

    const response: Response<City[] | null> = {
      ...partialResponse,
      validUntil: dayjs().unix() + CITY_SEARCH_RESULTS_MAX_AGE,
      latestReadTime: dayjs().unix()
    };
    if (process.env.NODE_ENV !== 'development') {
      res.setHeader(
        'Cache-Control',
        `public, immutable, stale-while-revalidate, max-age=${CITY_SEARCH_RESULTS_MAX_AGE}`
      );
    }
    res.status(response.errors.length ? 400 : 200).json(response);
  } catch (err) {
    LoggerHelper.getLogger(LOGGER_LABEL).error('Failed');
    console.error(err);
    const errorResponse: Response<null> = {
      data: null,
      warnings: [],
      errors: ['An unknown error occurred'],
      validUntil: 0,
      latestReadTime: 0
    };
    res.status(500).json(errorResponse);
  }
}
