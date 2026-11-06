/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '@/graphql/types.generated';

import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** Where the job sits in its lifecycle. Only the user moves a job between states. */
export type JobStatus =
  | 'AWAITING_PAYMENT'
  | 'COMPARING_QUOTES'
  | 'COMPLETED'
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'PLANNING'
  | 'REACHING_OUT'
  | 'SCHEDULED';

/** The trade a contractor works in, and the category a job falls under. */
export type TradeCategory =
  | 'CARPENTRY'
  | 'DOORS_AND_WINDOWS'
  | 'ELECTRICAL'
  | 'FLOORING'
  | 'GENERAL_CONTRACTING'
  | 'HVAC'
  | 'LANDSCAPING'
  | 'PAINTING'
  | 'PEST_CONTROL'
  | 'PLUMBING'
  | 'POOL_AND_SPA'
  | 'ROOFING';

export type JobsQueryVariables = Exact<{
  homeIds?: Array<string> | string | null | undefined;
  statuses?: Array<Types.JobStatus> | Types.JobStatus | null | undefined;
  tradeCategories?: Array<Types.TradeCategory> | Types.TradeCategory | null | undefined;
}>;


export type JobsQuery = { jobs: Array<{ __typename: 'JobType', id: string, title: string, status: string, category: string, createdAt: string, home: { __typename: 'HomeType', id: string, name: string } }> };


export const JobsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Jobs"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"homeIds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"statuses"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JobStatus"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tradeCategories"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TradeCategory"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"homeIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"homeIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"statuses"},"value":{"kind":"Variable","name":{"kind":"Name","value":"statuses"}}},{"kind":"Argument","name":{"kind":"Name","value":"tradeCategories"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tradeCategories"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"home"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<JobsQuery, JobsQueryVariables>;