/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '@/graphql/types.generated';

import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type UpdateCommunicationMutationVariables = Exact<{
  communicationId: string;
  needsReview?: boolean | null | undefined;
  parsedSummary?: string | null | undefined;
}>;


export type UpdateCommunicationMutation = { updateCommunication: { __typename: 'UpdateCommunication', communication: { __typename: 'CommunicationType', id: string, needsReview: boolean } | null } | null };


export const UpdateCommunicationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCommunication"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"communicationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"needsReview"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parsedSummary"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCommunication"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"communicationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"communicationId"}}},{"kind":"Argument","name":{"kind":"Name","value":"needsReview"},"value":{"kind":"Variable","name":{"kind":"Name","value":"needsReview"}}},{"kind":"Argument","name":{"kind":"Name","value":"parsedSummary"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parsedSummary"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"communication"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"needsReview"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateCommunicationMutation, UpdateCommunicationMutationVariables>;