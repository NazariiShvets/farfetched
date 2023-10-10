import {
  attach,
  createEffect,
  createStore,
  Event,
  sample,
  Store,
} from 'effector';

import { parseTime, type Time } from '../libs/date-nfs';
import { type Query } from '../query/type';
import { inMemoryCache } from './adapters/in_memory';
import { type CacheAdapter, type CacheAdapterInstance } from './adapters/type';
import { createKey, queryUniqId } from './key/key';
import {
  createSourcedReader,
  normalizeStaticOrReactive,
  StaticOrReactive,
} from '../libs/patronus';
import { DataSource } from '../remote_operation/type';

interface CacheParameters {
  adapter?: CacheAdapter;
  staleAfter?: Time;
  purge?: Event<void>;
  enabled?: StaticOrReactive<boolean>;
}

interface CacheParametersDefaulted {
  adapter: CacheAdapter;
  staleAfter?: Time;
  purge?: Event<void>;
  $enabled?: Store<boolean>;
}

export function cache<Q extends Query<any, any, any, any>>(
  query: Q,
  rawParams?: CacheParameters
): void {
  const { adapter, staleAfter, purge, $enabled }: CacheParametersDefaulted = {
    adapter: rawParams?.adapter ?? inMemoryCache(),
    $enabled: normalizeStaticOrReactive(rawParams?.enabled ?? true).map(
      Boolean
    ),
    ...rawParams,
  };

  const id = queryUniqId(query);

  const sourcedReaders = query.__.lowLevelAPI.sourced.map(createSourcedReader);
  const readAllSourcedFx = createEffect(async (params: unknown) => {
    return Promise.all(sourcedReaders.map((readerFx) => readerFx(params)));
  });

  const unsetFx = createEffect<
    {
      params: unknown;
      instance: CacheAdapterInstance;
    },
    void,
    any
  >(async ({ instance, params }) => {
    const sources = await readAllSourcedFx(params);

    const key = createKey({
      sid: id,
      params: query.__.lowLevelAPI.paramsAreMeaningless ? null : params,
      sources,
    });

    if (!key) {
      return;
    }

    await instance.unset({ key });
  });

  const setFx = createEffect<
    {
      params: unknown;
      result: unknown;
      instance: CacheAdapterInstance;
    },
    void,
    any
  >(async ({ instance, params, result }) => {
    const sources = await readAllSourcedFx(params);

    const key = createKey({
      sid: id,
      params: query.__.lowLevelAPI.paramsAreMeaningless ? null : params,
      sources,
    });

    if (!key) {
      return;
    }

    await instance.set({ key, value: result });
  });

  const getFx = createEffect<
    { params: unknown; instance: CacheAdapterInstance },
    { result: unknown; stale: boolean } | null,
    any
  >(async ({ params, instance }) => {
    const sources = await readAllSourcedFx(params);

    const key = createKey({
      sid: id,
      params: query.__.lowLevelAPI.paramsAreMeaningless ? null : params,
      sources,
    });

    if (!key) {
      return null;
    }

    const result = await instance.get({ key });

    if (!result) {
      return null;
    }

    const stale = staleAfter
      ? result.cachedAt + parseTime(staleAfter!) <= Date.now()
      : true;

    return { result: result.value, stale };
  });

  const cacheDataSource: DataSource<unknown> = {
    name: 'cache',
    $enabled: $enabled,
    get: attach({
      source: {
        instance: adapter.__.$instance,
      },
      mapParams: ({ params }: { params: unknown }, { instance }) => ({
        params,
        instance,
      }),
      effect: getFx,
    }),
    set: attach({
      source: {
        instance: adapter.__.$instance,
      },
      mapParams: (
        { params, result }: { params: unknown; result: unknown },
        { instance }
      ) => ({
        params,
        result,
        instance,
      }),
      effect: setFx,
    }),
    unset: attach({
      source: {
        instance: adapter.__.$instance,
      },
      mapParams: ({ params }: { params: unknown }, { instance }) => ({
        instance,
        params,
      }),
      effect: unsetFx,
    }),
  };

  query.__.lowLevelAPI.dataSources.unshift(cacheDataSource);

  if (purge) {
    sample({
      clock: purge,
      source: { instance: adapter.__.$instance },
      /**
       * We shouldn't restrict purge by $enabled
       * because purging should have more priority than disabling cache
       *
       */
      // filter: $enabled,
      target: createEffect(({ instance }: { instance: CacheAdapterInstance }) =>
        instance.purge()
      ),
    });
  }
}
