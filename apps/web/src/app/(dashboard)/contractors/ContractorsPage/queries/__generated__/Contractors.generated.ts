/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '@/graphql/types.generated';

import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
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

export type ContractorsQueryVariables = Exact<{
  search?: string | null | undefined;
  tradeCategories?: Array<Types.TradeCategory> | Types.TradeCategory | null | undefined;
  zipCodes?: Array<string> | string | null | undefined;
}>;


export type ContractorsQuery = { contractors: Array<{ __typename: 'ContractorType', id: string, name: string, companyName: string | null, email: string | null, phone: string | null, categories: Array<string>, zipCodes: Array<string>, notes: string | null }> };


export const ContractorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Contractors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tradeCategories"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TradeCategory"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"zipCodes"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}},{"kind":"Argument","name":{"kind":"Name","value":"tradeCategories"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tradeCategories"}}},{"kind":"Argument","name":{"kind":"Name","value":"zipCodes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"zipCodes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"companyName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"phone"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}},{"kind":"Field","name":{"kind":"Name","value":"zipCodes"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}}]}}]}}]} as unknown as DocumentNode<ContractorsQuery, ContractorsQueryVariables>;