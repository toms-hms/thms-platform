/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '@/graphql/types.generated';

import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type ContractorJobHistoryQueryVariables = Exact<{
  contractorIds: Array<string> | string;
}>;


export type ContractorJobHistoryQuery = { contractorJobHistory: Array<{ __typename: 'ContractorJobHistoryType', jobId: string, jobTitle: string, jobStatus: string, homeId: string, homeName: string, contractorStatus: string }> };


export const ContractorJobHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContractorJobHistory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contractorIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractorJobHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"contractorIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contractorIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"jobTitle"}},{"kind":"Field","name":{"kind":"Name","value":"jobStatus"}},{"kind":"Field","name":{"kind":"Name","value":"homeId"}},{"kind":"Field","name":{"kind":"Name","value":"homeName"}},{"kind":"Field","name":{"kind":"Name","value":"contractorStatus"}}]}}]}}]} as unknown as DocumentNode<ContractorJobHistoryQuery, ContractorJobHistoryQueryVariables>;