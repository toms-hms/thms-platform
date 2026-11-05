/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from '@/graphql/types.generated';

import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
/** What the homeowner is trying to achieve, which decides how the assistant scopes the work. */
export type JobIntent =
  | 'IMPROVEMENT'
  | 'ISSUE'
  | 'RECURRING_WORK';

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

export type CreateJobMutationVariables = Exact<{
  homeId: string;
  title: string;
  category: Types.TradeCategory;
  intent?: Types.JobIntent | null | undefined;
  categories?: Array<Types.TradeCategory> | Types.TradeCategory | null | undefined;
  description?: string | null | undefined;
  notes?: string | null | undefined;
  status?: Types.JobStatus | null | undefined;
  aiSession?: string | null | undefined;
}>;


export type CreateJobMutation = { createJob: { __typename: 'CreateJob', job: { __typename: 'JobType', id: string } | null } | null };


export const CreateJobDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateJob"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"homeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"category"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TradeCategory"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"intent"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JobIntent"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"categories"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TradeCategory"}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"notes"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JobStatus"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"aiSession"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSONString"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createJob"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"homeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"homeId"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"category"},"value":{"kind":"Variable","name":{"kind":"Name","value":"category"}}},{"kind":"Argument","name":{"kind":"Name","value":"intent"},"value":{"kind":"Variable","name":{"kind":"Name","value":"intent"}}},{"kind":"Argument","name":{"kind":"Name","value":"categories"},"value":{"kind":"Variable","name":{"kind":"Name","value":"categories"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"notes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"notes"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"Argument","name":{"kind":"Name","value":"aiSession"},"value":{"kind":"Variable","name":{"kind":"Name","value":"aiSession"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"job"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<CreateJobMutation, CreateJobMutationVariables>;