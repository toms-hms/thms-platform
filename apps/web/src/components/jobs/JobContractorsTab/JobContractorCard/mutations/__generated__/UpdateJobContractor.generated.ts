/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '@/graphql/types.generated';

import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** Where a single contractor stands on a job. */
export type JobContractorStatus =
  | 'ACCEPTED'
  | 'CONTACTED'
  | 'DECLINED'
  | 'NOT_CONTACTED'
  | 'PAID'
  | 'QUOTE_RECEIVED'
  | 'RESPONDED'
  | 'VISIT_COMPLETED'
  | 'VISIT_REQUESTED'
  | 'VISIT_SCHEDULED'
  | 'WORK_COMPLETED'
  | 'WORK_IN_PROGRESS';

export type UpdateJobContractorMutationVariables = Exact<{
  jobContractorId: string;
  status: Types.JobContractorStatus;
  notes?: string | null | undefined;
}>;


export type UpdateJobContractorMutation = { updateJobContractor: { __typename: 'UpdateJobContractor', jobContractor: { __typename: 'JobContractorType', id: string, status: string, notes: string | null, lastContactedAt: string | null, lastResponseAt: string | null } | null } | null };


export const UpdateJobContractorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateJobContractor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"jobContractorId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JobContractorStatus"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"notes"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateJobContractor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"jobContractorId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"jobContractorId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"notes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"notes"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobContractor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"lastContactedAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastResponseAt"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateJobContractorMutation, UpdateJobContractorMutationVariables>;