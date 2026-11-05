/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '@/graphql/types.generated';

import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** Whether the platform sent the message or received it. */
export type CommunicationDirection =
  | 'RECEIVED'
  | 'SENT';

export type CommunicationsQueryVariables = Exact<{
  jobIds: Array<string> | string;
  contractorIds?: Array<string> | string | null | undefined;
  needsReview?: boolean | null | undefined;
  directions?: Array<Types.CommunicationDirection> | Types.CommunicationDirection | null | undefined;
}>;


export type CommunicationsQuery = { communications: Array<{ __typename: 'CommunicationType', id: string, direction: string, subject: string | null, bodyText: string | null, bodyHtml: string | null, sentAt: string | null, receivedAt: string | null, parsedSummary: string | null, needsReview: boolean, createdAt: string, contractor: { __typename: 'ContractorType', id: string, name: string } | null }> };


export const CommunicationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Communications"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"jobIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contractorIds"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"needsReview"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"directions"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CommunicationDirection"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"communications"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"jobIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"jobIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"contractorIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contractorIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"needsReview"},"value":{"kind":"Variable","name":{"kind":"Name","value":"needsReview"}}},{"kind":"Argument","name":{"kind":"Name","value":"directions"},"value":{"kind":"Variable","name":{"kind":"Name","value":"directions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"direction"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"bodyText"}},{"kind":"Field","name":{"kind":"Name","value":"bodyHtml"}},{"kind":"Field","name":{"kind":"Name","value":"sentAt"}},{"kind":"Field","name":{"kind":"Name","value":"receivedAt"}},{"kind":"Field","name":{"kind":"Name","value":"parsedSummary"}},{"kind":"Field","name":{"kind":"Name","value":"needsReview"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"contractor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<CommunicationsQuery, CommunicationsQueryVariables>;