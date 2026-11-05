/**
 * GraphQL codegen. Every `*.graphql` file under src/ holds one operation or
 * fragment and gets a `*.generated.ts` beside it exporting a typed document
 * (`QuotesDocument`) and its result and variable types. Shared enums and input
 * types go to src/graphql/types.generated.ts.
 *
 * The schema is the API's checked-in export (`make schema`). Run `npm run codegen`
 * after editing a .graphql file; generated files are committed.
 */
import type { CodegenConfig } from '@graphql-codegen/cli';

const scalars = {
  ID: 'string',
  DateTime: 'string',
  JSONString: 'string',
};

const config: CodegenConfig = {
  overwrite: true,
  schema: '../api/schema.graphql',
  documents: ['src/**/*.graphql'],
  generates: {
    'src/graphql/types.generated.ts': {
      plugins: ['typescript'],
      config: { onlyOperationTypes: true, scalars, namingConvention: { enumValues: 'keep' } },
    },
    'src/': {
      preset: 'near-operation-file',
      presetConfig: { extension: '.generated.ts', baseTypesPath: '~@/graphql/types.generated' },
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        scalars,
        nonOptionalTypename: true,
        skipTypeNameForRoot: true,
        namingConvention: { enumValues: 'keep' },
      },
    },
  },
};

export default config;
