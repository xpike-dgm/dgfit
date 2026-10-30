import { useState } from 'react';
import { CheckCircle2, Loader2, PlugZap, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getModelOptions } from '@/utils/aiServiceUtils';
import {
  PT_AI_DEFAULT_MODEL,
  findPtAiService,
  useSavePtAiKey,
} from '@/hooks/AI/usePtAiSetup';
import { useTestAIServiceConnection } from '@/hooks/AI/useTestAIServiceConnection';
import type { AiServiceSettingsResponse } from '@workspace/shared';

/** "claude-haiku-5-5" -> "Claude Haiku 5.5". Unknown ids are shown as-is. */
export const claudeModelLabel = (model: string): string => {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?$/.exec(model);
  const [, name = '', major = '', minor] = m ?? [];
  if (!m) return model;
  const family = name.charAt(0).toUpperCase() + name.slice(1);
  return `Claude ${family} ${minor ? `${major}.${minor}` : major}`;
};

/**
 * DG FIT admin: the one thing PT AI needs, a Claude API key. Saving creates
 * (or updates) a global Anthropic service and switches it on.
 */
export const PtAiKeySetup = ({
  services,
  onSaved,
}: {
  services: AiServiceSettingsResponse[];
  onSaved?: () => void;
}) => {
  const existing = findPtAiService(services);
  const otherActive = services.find(
    (s) => s.is_active && s.id !== existing?.id
  );
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<string | null>(null);
  const currentModel = model ?? existing?.model_name ?? PT_AI_DEFAULT_MODEL;
  const modelOptions = getModelOptions('anthropic');
  const options = modelOptions.includes(currentModel)
    ? modelOptions
    : [currentModel, ...modelOptions];

  const { mutate: save, isPending: saving } = useSavePtAiKey();
  const {
    testConnection,
    isPending: testing,
    status: testStatus,
    reset: resetTest,
  } = useTestAIServiceConnection();

  const hasKey = apiKey.trim().length > 0;
  const isOn = !!existing?.is_active;
  const changed =
    hasKey || !isOn || currentModel !== (existing?.model_name ?? '');
  const canSave = (hasKey || !!existing) && changed && !saving;
  const canTest = (hasKey || !!existing) && !testing;

  const handleSave = () => {
    save(
      { existing, apiKey, model: currentModel },
      {
        onSuccess: () => {
          setApiKey('');
          setModel(null);
          onSaved?.();
        },
      }
    );
  };

  const handleTest = () => {
    testConnection({
      ...(hasKey ? {} : { id: existing?.id }),
      service_type: 'anthropic',
      api_key: hasKey ? apiKey.trim() : undefined,
      model_name: currentModel,
    });
  };

  return (
    <div className="space-y-4">
      <div
        role="status"
        className={`flex items-start gap-3 rounded-xl p-3 text-sm ${
          isOn || otherActive
            ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
            : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
        }`}
      >
        {isOn || otherActive ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <div className="min-w-0">
          <p className="font-semibold">
            {isOn || otherActive ? 'PT AI açık' : 'PT AI kapalı'}
          </p>
          <p className="break-words">
            {isOn && existing
              ? `${claudeModelLabel(existing.model_name ?? PT_AI_DEFAULT_MODEL)} kullanılıyor. Herkes bu anahtarla sohbet eder.`
              : otherActive
                ? `"${otherActive.service_name}" hizmetiyle çalışıyor. Claude kullanmak için anahtarı aşağıya gir.`
                : existing
                  ? 'Anahtar kayıtlı ama kapalı. Açmak için Kaydet’e dokun.'
                  : 'Claude API anahtarını gir ve kaydet; PT AI herkes için açılır.'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pt-ai-key">Claude API anahtarı</Label>
        <Input
          id="pt-ai-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          className="h-11"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            resetTest();
          }}
          placeholder={
            existing
              ? 'Kayıtlı (değiştirmek için yenisini yapıştır)'
              : 'sk-ant-…'
          }
        />
        <p className="text-sm text-muted-foreground">
          Anahtarı console.anthropic.com adresinde “API Keys” bölümünden
          alırsın. Arkadaşların ayrıca anahtar girmez.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pt-ai-model">Model</Label>
        <Select
          value={currentModel}
          onValueChange={(v) => {
            setModel(v);
            resetTest();
          }}
        >
          <SelectTrigger id="pt-ai-model" className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((m) => (
              <SelectItem key={m} value={m}>
                {claudeModelLabel(m)}
                {m === PT_AI_DEFAULT_MODEL ? ' (önerilen)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="h-11 sm:flex-1"
          onClick={handleSave}
          disabled={!canSave}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Kaydet ve aç
        </Button>
        <Button
          variant="outline"
          className="h-11 sm:flex-1"
          onClick={handleTest}
          disabled={!canTest}
        >
          {testing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlugZap className="mr-2 h-4 w-4" />
          )}
          Bağlantıyı test et
        </Button>
      </div>

      {testStatus && (
        <p
          role="status"
          className={`flex items-start gap-2 text-sm ${
            testStatus.state === 'success'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-destructive'
          }`}
        >
          {testStatus.state === 'success' ? (
            <>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Bağlantı çalışıyor.
            </>
          ) : (
            <>
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {testStatus.message}
            </>
          )}
        </p>
      )}
    </div>
  );
};
