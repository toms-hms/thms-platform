'use client';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { IntegrationsDocument } from './queries/__generated__/Integrations.generated';
import { GoogleAuthUrlDocument } from './queries/__generated__/GoogleAuthUrl.generated';
import { MicrosoftAuthUrlDocument } from './queries/__generated__/MicrosoftAuthUrl.generated';
import { CreateAiIntegrationDocument } from './mutations/__generated__/CreateAiIntegration.generated';
import { DeleteIntegrationDocument } from './mutations/__generated__/DeleteIntegration.generated';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Form from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import SubmitButton from '@/components/ui/SubmitButton';
import { requiredText } from '@/lib/formFields';
import PageHeader from '@/components/ui/PageHeader';

const aiKeySchema = z.object({ apiKey: requiredText('Paste your OpenAI API key') });

export default function IntegrationsPage() {
  const client = useApolloClient();
  const { data, refetch } = useQuery(IntegrationsDocument);
  const list = data?.integrations ?? [];
  const [createAiIntegration] = useMutation(CreateAiIntegrationDocument);
  const [deleteIntegration] = useMutation(DeleteIntegrationDocument);
  const aiKeyForm = useForm({ defaultValues: { apiKey: '' }, resolver: zodResolver(aiKeySchema) });
  const [aiKeySaved, setAiKeySaved] = useState(false);

  async function handleConnectGoogle() {
    try {
      const { data } = await client.query({ query: GoogleAuthUrlDocument, fetchPolicy: 'network-only' });
      if (data) window.location.href = data.googleAuthUrl;
    } catch (err: any) {
      alert(err.message || 'Failed to start Google auth');
    }
  }

  async function handleConnectMicrosoft() {
    try {
      const { data } = await client.query({ query: MicrosoftAuthUrlDocument, fetchPolicy: 'network-only' });
      if (data) window.location.href = data.microsoftAuthUrl;
    } catch (err: any) {
      alert(err.message || 'Failed to start Microsoft auth');
    }
  }

  async function handleDisconnect(id: string) {
    if (!confirm('Disconnect this integration?')) return;
    try {
      await deleteIntegration({ variables: { integrationId: id } });
      await refetch();
    } catch {}
  }

  async function handleSaveAI({ apiKey }: z.output<typeof aiKeySchema>) {
    setAiKeySaved(false);
    await createAiIntegration({ variables: { apiKey, provider: 'openai' } });
    aiKeyForm.reset({ apiKey: '' });
    setAiKeySaved(true);
    await refetch();
  }

  const emailIntegrations = list.filter((i) => i.type === 'EMAIL');
  const aiIntegrations = list.filter((i) => i.type === 'AI');

  const googleConnected = emailIntegrations.some((i) => i.provider === 'GOOGLE');
  const microsoftConnected = emailIntegrations.some((i) => i.provider === 'MICROSOFT');
  const openaiConnected = aiIntegrations.some((i) => i.provider === 'OPENAI');

  return (
    <div className="max-w-2xl">
      <PageHeader className="mb-8" title="Integrations" />

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Email Providers</h2>
        <div className="space-y-3">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Gmail (Google)</p>
              <p className="text-sm text-gray-500">Send and receive emails via Gmail</p>
              {googleConnected && (
                <p className="text-xs text-green-600 mt-1">
                  Connected as {emailIntegrations.find((i) => i.provider === 'GOOGLE')?.email}
                </p>
              )}
            </div>
            {googleConnected ? (
              <Button
                variant="danger"
                onClick={() => handleDisconnect(emailIntegrations.find((i) => i.provider === 'GOOGLE')!.id)}
                className="text-sm"
              >
                Disconnect
              </Button>
            ) : (
              <Button variant="primary" onClick={handleConnectGoogle} className="text-sm">
                Connect
              </Button>
            )}
          </Card>

          <Card className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Outlook (Microsoft)</p>
              <p className="text-sm text-gray-500">Send and receive emails via Microsoft 365</p>
              {microsoftConnected && (
                <p className="text-xs text-green-600 mt-1">
                  Connected as {emailIntegrations.find((i) => i.provider === 'MICROSOFT')?.email}
                </p>
              )}
            </div>
            {microsoftConnected ? (
              <Button
                variant="danger"
                onClick={() => handleDisconnect(emailIntegrations.find((i) => i.provider === 'MICROSOFT')!.id)}
                className="text-sm"
              >
                Disconnect
              </Button>
            ) : (
              <Button variant="secondary" onClick={handleConnectMicrosoft} className="text-sm">
                Connect
              </Button>
            )}
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Provider</h2>
        <Card className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-medium text-gray-900">OpenAI</p>
              <p className="text-sm text-gray-500">Used for AI concept generation and email drafting</p>
              {openaiConnected && <p className="text-xs text-green-600 mt-1">API key configured</p>}
            </div>
            {openaiConnected && (
              <Button
                variant="danger"
                onClick={() => handleDisconnect(aiIntegrations.find((i) => i.provider === 'OPENAI')!.id)}
                className="text-sm"
              >
                Remove
              </Button>
            )}
          </div>

          <Form className="space-y-2" form={aiKeyForm} onSubmit={handleSaveAI}>
            <div className="flex gap-3">
              <Input className="flex-1" placeholder="sk-..." type="password" {...aiKeyForm.register('apiKey')} />
              <SubmitButton className="text-sm" submittingText="Saving...">
                {openaiConnected ? 'Update Key' : 'Save Key'}
              </SubmitButton>
            </div>
            {aiKeyForm.formState.errors.apiKey && (
              <p className="text-xs text-red-600">{aiKeyForm.formState.errors.apiKey.message}</p>
            )}
          </Form>
          {aiKeySaved && <p className="text-sm mt-2 text-green-600">API key saved successfully</p>}
          <p className="text-xs text-gray-400 mt-2">
            Your API key is encrypted at rest. DALL-E 3 is used for image generation, GPT-4o-mini for email drafts.
          </p>
        </Card>
      </section>
    </div>
  );
}
