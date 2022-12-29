import { createStore, Store } from 'effector';

import { Mutation } from '../mutation/type';
import { Query, QueryInitialData } from '../query/type';
import {
  RemoteOperation,
  RemoteOperationError,
  RemoteOperationResult,
} from '../remote_operation/type';

// -- Query overloads

export function attachOperation<
  NewParams,
  OriginalParams,
  Q extends Query<OriginalParams, any, any, any>,
  Source
>(
  operation: Q,
  config: {
    source: Store<Source>;
    mapParams: (params: NewParams, source: Source) => OriginalParams;
  }
): Query<
  NewParams,
  RemoteOperationResult<Q>,
  RemoteOperationError<Q>,
  QueryInitialData<Q>
>;

export function attachOperation<
  NewParams,
  OriginalParams,
  Q extends Query<OriginalParams, any, any, any>
>(
  operation: Q,
  config: { mapParams: (params: NewParams) => OriginalParams }
): Query<
  NewParams,
  RemoteOperationResult<Q>,
  RemoteOperationError<Q>,
  QueryInitialData<Q>
>;

export function attachOperation<Q extends Query<any, any, any, any>>(
  operation: Q
): Q;

// -- Mutation overloads

export function attachOperation<
  NewParams,
  OriginalParams,
  M extends Mutation<OriginalParams, any, any>,
  Source
>(
  operation: M,
  config: {
    source: Store<Source>;
    mapParams: (params: NewParams, source: Source) => OriginalParams;
  }
): Mutation<NewParams, RemoteOperationResult<M>, RemoteOperationError<M>>;

export function attachOperation<
  NewParams,
  OriginalParams,
  M extends Mutation<OriginalParams, any, any>
>(
  operation: M,
  config: { mapParams: (params: NewParams) => OriginalParams }
): Mutation<NewParams, RemoteOperationResult<M>, RemoteOperationError<M>>;

export function attachOperation<M extends Mutation<any, any, any>>(
  operation: M
): M;

// -- Implementation

export function attachOperation<
  NewParams,
  OriginalParams,
  O extends RemoteOperation<OriginalParams, any, any, any>
>(
  operation: O,
  config?: {
    source?: Store<any>;
    mapParams?: (params: NewParams, source?: any) => OriginalParams;
  }
) {
  const { source, mapParams } = config ?? {};

  return operation.__.experimentalAPI?.attach({
    source: source ?? createStore(null, { serialize: 'ignore' }),
    mapParams: mapParams ?? ((v: NewParams) => v as unknown as OriginalParams),
  });
}