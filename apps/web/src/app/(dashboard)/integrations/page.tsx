'use client';
import { useState, FormEvent } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { IntegrationsDocument } from './queries/__generated__/Integrations.generated';
import { GoogleAuthUrlDocument } from './queries/__generated__/GoogleAuthUrl.generated';
import { MicrosoftAuthUrlDocument } from './queries/__generated__/MicrosoftAuthUrl.generated';
import { CreateAiIntegrationDocument } from './mutations/__generated__/CreateAiIntegration.generated';
import { DeleteIntegrationDocument } from './mutations/__generated__/DeleteIntegration.generated';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import PageHeader from '@/components/ui/PageHeader';

export default function IntegrationsPage() {
  const client = useApolloClient();
  const { data, loading: fetching, refetch } = useQuery(IntegrationsDocument);
  const list = data?.integrations ?? [];
  const loading = fetching && !data;
  const [createAiIntegration] = useMutation(CreateAiIntegrationDocument);
  const [deleteIntegration] = useMutation(DeleteIntegrationDocument);
  const [aiKey, setAiKey] = useState('');
  const [savingAI, setSavingAI] = useState(false);
  const [aiMsg, setAiMsg] = useState('');

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

  async function handleSaveAI(e: FormEvent) {
    e.preventDefault();
    setSavingAI(true);
    setAiMsg('');
    try {
      await createAiIntegration({ variables: { provider: 'openai', apiKey: aiKey } });
      setAiMsg('API key saved successfully');
      setAiKey('');
      await refetch();
    } catch (err: any) {
      setAiMsg(err.message || 'Failed to save');
    }
    setSavingAI(false);
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

          <form onSubmit={handleSaveAI} className="flex gap-3">
            <Input
              type="password"
              className="flex-1"
              placeholder="sk-..."
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              required
            />
            <Button variant="primary" type="submit" disabled={savingAI} className="text-sm">
              {savingAI ? 'Saving...' : openaiConnected ? 'Update Key' : 'Save Key'}
            </Button>
          </form>
          {aiMsg && (
            <p className={`text-sm mt-2 ${aiMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {aiMsg}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Your API key is encrypted at rest. DALL-E 3 is used for image generation, GPT-4o-mini for email drafts.
          </p>
        </Card>
      </section>
    </div>
  );
}
