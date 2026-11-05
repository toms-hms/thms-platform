'use client';
import { useState, FormEvent } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { IntegrationsDocument } from './queries/__generated__/Integrations.generated';
import { GoogleAuthUrlDocument } from './queries/__generated__/GoogleAuthUrl.generated';
import { MicrosoftAuthUrlDocument } from './queries/__generated__/MicrosoftAuthUrl.generated';
import { CreateAiIntegrationDocument } from './mutations/__generated__/CreateAiIntegration.generated';
import { DeleteIntegrationDocument } from './mutations/__generated__/DeleteIntegration.generated';

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
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Integrations</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Email Providers</h2>
        <div className="space-y-3">
          <div className="card p-4 flex items-center justify-between">
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
              <button
                onClick={() => handleDisconnect(emailIntegrations.find((i) => i.provider === 'GOOGLE')!.id)}
                className="btn-danger text-sm"
              >
                Disconnect
              </button>
            ) : (
              <button onClick={handleConnectGoogle} className="btn-primary text-sm">
                Connect
              </button>
            )}
          </div>

          <div className="card p-4 flex items-center justify-between">
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
              <button
                onClick={() => handleDisconnect(emailIntegrations.find((i) => i.provider === 'MICROSOFT')!.id)}
                className="btn-danger text-sm"
              >
                Disconnect
              </button>
            ) : (
              <button onClick={handleConnectMicrosoft} className="btn-secondary text-sm">
                Connect
              </button>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Provider</h2>
        <div className="card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-medium text-gray-900">OpenAI</p>
              <p className="text-sm text-gray-500">Used for AI concept generation and email drafting</p>
              {openaiConnected && <p className="text-xs text-green-600 mt-1">API key configured</p>}
            </div>
            {openaiConnected && (
              <button
                onClick={() => handleDisconnect(aiIntegrations.find((i) => i.provider === 'OPENAI')!.id)}
                className="btn-danger text-sm"
              >
                Remove
              </button>
            )}
          </div>

          <form onSubmit={handleSaveAI} className="flex gap-3">
            <input
              type="password"
              className="input flex-1"
              placeholder="sk-..."
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
              required
            />
            <button type="submit" disabled={savingAI} className="btn-primary text-sm">
              {savingAI ? 'Saving...' : openaiConnected ? 'Update Key' : 'Save Key'}
            </button>
          </form>
          {aiMsg && (
            <p className={`text-sm mt-2 ${aiMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {aiMsg}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Your API key is encrypted at rest. DALL-E 3 is used for image generation, GPT-4o-mini for email drafts.
          </p>
        </div>
      </section>
    </div>
  );
}
