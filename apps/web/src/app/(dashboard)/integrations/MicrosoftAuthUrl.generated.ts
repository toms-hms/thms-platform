/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '@/graphql/types.generated';

import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type MicrosoftAuthUrlQueryVariables = Exact<{ [key: string]: never; }>;


export type MicrosoftAuthUrlQuery = { microsoftAuthUrl: string };


export const MicrosoftAuthUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MicrosoftAuthUrl"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"microsoftAuthUrl"}}]}}]} as unknown as DocumentNode<MicrosoftAuthUrlQuery, MicrosoftAuthUrlQueryVariables>;