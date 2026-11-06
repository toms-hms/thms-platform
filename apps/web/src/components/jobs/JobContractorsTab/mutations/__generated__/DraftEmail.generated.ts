/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '@/graphql/types.generated';

import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type DraftEmailMutationVariables = Exact<{
  jobId: string;
  contractorIds: Array<string> | string;
  tone?: string | null | undefined;
  includeImages?: boolean | null | undefined;
  customInstructions?: string | null | undefined;
}>;


export type DraftEmailMutation = { draftEmail: { __typename: 'DraftEmail', drafts: Array<{ __typename: 'EmailDraftType', contractorId: string, subject: string, bodyText: string, bodyHtml: string }> } | null };


export const DraftEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DraftEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"jobId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contractorIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tone"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeImages"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"customInstructions"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draftEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"jobId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"jobId"}}},{"kind":"Argument","name":{"kind":"Name","value":"contractorIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contractorIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"tone"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tone"}}},{"kind":"Argument","name":{"kind":"Name","value":"includeImages"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeImages"}}},{"kind":"Argument","name":{"kind":"Name","value":"customInstructions"},"value":{"kind":"Variable","name":{"kind":"Name","value":"customInstructions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"drafts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contractorId"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"bodyText"}},{"kind":"Field","name":{"kind":"Name","value":"bodyHtml"}}]}}]}}]}}]} as unknown as DocumentNode<DraftEmailMutation, DraftEmailMutationVariables>;