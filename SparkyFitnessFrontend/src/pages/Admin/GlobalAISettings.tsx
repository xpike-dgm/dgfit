import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  SETTINGS_CARD,
  SettingsGroupToggle,
} from '@/pages/Settings/SettingsGroupToggle';
import { PtAiKeySetup, claudeModelLabel } from './PtAiKeySetup';
import { PT_AI_DEFAULT_MODEL, findPtAiService } from '@/hooks/AI/usePtAiSetup';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useSettings, useUpdateSettings } from '@/hooks/Admin/useSettings';
import { useTranslation } from 'react-i18next';
import { ServiceForm } from '@/components/ai/ServiceForm';
import { ServiceList } from '@/components/ai/ServiceList';
import { getModelOptions, requiresApiKey } from '@/utils/aiServiceUtils';
import {
  useGlobalAIServices,
  useCreateGlobalAIService,
  useUpdateGlobalAIService,
  useDeleteGlobalAIService,
} from '@/hooks/AI/useGlobalAIServiceSettings';
import { useTestAIServiceConnection } from '@/hooks/AI/useTestAIServiceConnection';
import { GlobalSettings } from '@/types/admin';
import { useAiConfigInvalidation } from '@/hooks/useInvalidateKeys';
import { AiServiceSettingsResponse } from '@workspace/shared';
import {
  CreateAiServiceSettingsFormInput,
  UpdateAiServiceSettingsFormInput,
  createAiServiceSettingsFormSchema,
  updateAiServiceSettingsFormSchema,
} from '@/schemas/form/AiServiceSettings.form.zod';

// Radix Select cannot bind null/'' (an empty SelectItem value throws), so the
// "None" choice maps to this sentinel and back to null on save.
const GLOBAL_VISION_NONE = '__none__';

const GlobalAISettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: globalSettings, isLoading: settingsLoading } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();

  // TanStack Query hooks
  const { data: services = [] } = useGlobalAIServices();

  // Mutations
  const { mutateAsync: createService, isPending: isCreating } =
    useCreateGlobalAIService();
  const { mutateAsync: updateService, isPending: isUpdating } =
    useUpdateGlobalAIService();
  const { mutateAsync: deleteService, isPending: isDeleting } =
    useDeleteGlobalAIService();
  const {
    testConnection,
    isPending: isTesting,
    status: testStatus,
    reset: resetTestStatus,
  } = useTestAIServiceConnection();
  const invalidateAiConfig = useAiConfigInvalidation();

  const loading = isCreating || isUpdating || isDeleting;

  const [newService, setNewService] =
    useState<CreateAiServiceSettingsFormInput>({
      service_name: '',
      service_type: 'openai',
      api_key: '',
      custom_url: '',
      system_prompt: '',
      is_active: true,
      model_name: '',
      showCustomModelInput: false,
      custom_model_name: '',
      chat_tool_profile: 'full',
      supports_audio_input: false,
    });

  const [editingService, setEditingService] = useState<string | null>(null);
  const [editData, setEditData] = useState<UpdateAiServiceSettingsFormInput>({
    api_key: '',
    showCustomModelInput: false,
    custom_model_name: '',
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  const handleAllowUserConfigChange = (checked: boolean) => {
    if (!globalSettings) return;

    const newSettings: GlobalSettings = {
      ...globalSettings,
      allow_user_ai_config: checked,
    };

    updateSettings(newSettings, {
      onSuccess: () => {
        // Invalidate the userAiConfigAllowed query so all users see the updated setting
        invalidateAiConfig();
        toast({
          title: t('settings.aiService.globalSettings.success'),
          description: t(
            'settings.aiService.globalSettings.successUpdatingConfig'
          ),
        });
      },
      onError: () => {
        toast({
          title: t('settings.aiService.globalSettings.error'),
          description: t(
            'settings.aiService.globalSettings.errorUpdatingConfig'
          ),
          variant: 'destructive',
        });
      },
    });
  };

  // Active global services are the only ones the server will resolve as a
  // vision default (it requires is_active AND is_public), so the dropdown lists
  // those. A stale pointer (service deactivated/deleted) falls back to "None".
  const activeGlobalServices = services.filter((s) => s.is_active);
  const visionDefaultId =
    activeGlobalServices.find(
      (s) => s.id === globalSettings?.default_vision_ai_service_id
    )?.id ?? null;

  const handleVisionDefaultChange = (value: string) => {
    if (!globalSettings) return;

    const newSettings: GlobalSettings = {
      ...globalSettings,
      default_vision_ai_service_id: value === GLOBAL_VISION_NONE ? null : value,
    };

    updateSettings(newSettings, {
      onSuccess: () => {
        toast({
          title: t('settings.aiService.globalSettings.success'),
          description: t(
            'settings.aiService.globalSettings.successUpdatingConfig'
          ),
        });
      },
      onError: () => {
        toast({
          title: t('settings.aiService.globalSettings.error'),
          description: t(
            'settings.aiService.globalSettings.errorUpdatingConfig'
          ),
          variant: 'destructive',
        });
      },
    });
  };

  const handleAddService = async () => {
    if (
      !newService.service_name ||
      (requiresApiKey(newService.service_type) && !newService.api_key)
    ) {
      toast({
        title: t('settings.aiService.globalSettings.error'),
        description: t('settings.aiService.globalSettings.fillRequiredFields'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const serviceData = createAiServiceSettingsFormSchema.parse(newService);
      await createService(serviceData);
      // Reset form
      setNewService({
        service_name: '',
        service_type: 'openai',
        api_key: '',
        custom_url: '',
        system_prompt: '',
        is_active: true,
        model_name: '',
        showCustomModelInput: false,
        custom_model_name: '',
        chat_tool_profile: 'full',
        supports_audio_input: false,
      });
      setShowAddForm(false);
      // Success toast is handled by the mutation meta
    } catch (error) {
      // Error toast is handled by the mutation meta
      console.error('Error adding global AI service:', error);
    }
  };

  const handleUpdateService = async (serviceId: string) => {
    const originalService = services.find((s) => s.id === serviceId);

    if (!originalService) {
      toast({
        title: t('settings.aiService.globalSettings.error'),
        description: t(
          'settings.aiService.globalSettings.errorOriginalNotFound'
        ),
        variant: 'destructive',
      });
      return;
    }

    const serviceToUpdate = updateAiServiceSettingsFormSchema.parse({
      ...editData,
      id: serviceId,
    });

    if (serviceToUpdate.api_key === '') {
      delete serviceToUpdate.api_key;
    }

    try {
      await updateService({ serviceId, serviceData: serviceToUpdate });
      setEditingService(null);
      setEditData({ showCustomModelInput: false, custom_model_name: '' });
      // Success toast is handled by the mutation meta
    } catch (error) {
      // Error toast is handled by the mutation meta
      console.error('Error updating global AI service:', error);
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      await deleteService(serviceToDelete);
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
      // Success toast is handled by the mutation meta
    } catch (error) {
      // Error toast is handled by the mutation meta
      console.error('Error deleting global AI service:', error);
    }
  };

  const startEditing = (service: AiServiceSettingsResponse) => {
    // Clear any prior service's test result so it never lingers on this form.
    resetTestStatus();
    setEditingService(service.id);
    const isCustomModel = service.model_name
      ? !getModelOptions(service.service_type ?? '').includes(
          service.model_name
        )
      : false;
    setEditData({
      service_name: service.service_name,
      service_type: service.service_type,
      api_key: '',
      custom_url: service.custom_url,
      system_prompt: service.system_prompt || '',
      is_active: service.is_active,
      model_name: isCustomModel ? '' : service.model_name || '',
      showCustomModelInput: isCustomModel,
      custom_model_name: service.model_name ?? '',
      chat_tool_profile: service.chat_tool_profile ?? 'full',
      reasoning_effort: service.reasoning_effort ?? 'medium',
      supports_audio_input: service.supports_audio_input,
    });
  };

  const cancelEditing = () => {
    resetTestStatus();
    setEditingService(null);
    setEditData({ showCustomModelInput: false, custom_model_name: '' });
  };

  const openDeleteDialog = (serviceId: string) => {
    setServiceToDelete(serviceId);
    setDeleteDialogOpen(true);
  };

  // PT AI uses the shared key only: once the admin saves it through the simple
  // form, per-user AI services are switched off (safe default; can be turned
  // back on under "Gelişmiş").
  const handlePtAiSaved = () => {
    if (globalSettings && globalSettings.allow_user_ai_config !== false) {
      updateSettings(
        { ...globalSettings, allow_user_ai_config: false },
        { onSuccess: () => invalidateAiConfig() }
      );
    }
  };

  const ptService = findPtAiService(services);
  const anyActive = services.find((s) => s.is_active);
  const statusLine = ptService?.is_active
    ? `Açık · ${claudeModelLabel(ptService.model_name ?? PT_AI_DEFAULT_MODEL)}`
    : anyActive
      ? `Açık · ${anyActive.service_name}`
      : 'Kapalı · Claude API anahtarını gir';

  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="global-ai-settings" className={SETTINGS_CARD}>
        <AccordionTrigger
          className="flex items-center gap-2 p-4 hover:no-underline"
          description={statusLine}
        >
          <Sparkles className="h-5 w-5" />
          PT AI (Claude)
        </AccordionTrigger>
        <AccordionContent className="min-w-0 space-y-4 p-4 pt-0">
          <PtAiKeySetup services={services} onSaved={handlePtAiSaved} />

          <Collapsible>
            <SettingsGroupToggle
              label="Gelişmiş"
              hint="Diğer AI hizmetleri ve kullanıcı izinleri"
              className="mb-0 border bg-transparent shadow-none dark:shadow-none"
            />
            <CollapsibleContent className="space-y-4 pt-4">
              {/* User AI Config Toggle */}
              {globalSettings && (
                <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor="allow_user_ai_config"
                      className="font-medium"
                    >
                      Arkadaşlar kendi AI anahtarını ekleyebilsin
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Kapalıyken (önerilen) herkes yukarıdaki ortak anahtarı
                      kullanır.
                    </p>
                  </div>
                  <Switch
                    id="allow_user_ai_config"
                    checked={globalSettings.allow_user_ai_config !== false}
                    onCheckedChange={handleAllowUserConfigChange}
                    disabled={settingsLoading}
                  />
                </div>
              )}

              {/* Allow Non-Admin Private Network AI Toggle */}
              {globalSettings && (
                <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor="allow_private_network_ai"
                      className="font-medium"
                    >
                      Yerel ağdaki AI sunucularına izin ver
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Yalnızca evde kendi AI sunucunu (ör. Ollama)
                      çalıştırıyorsan aç. Kapalı kalması önerilir.
                    </p>
                  </div>
                  <Switch
                    id="allow_private_network_ai"
                    checked={globalSettings.allow_private_network_ai === true}
                    onCheckedChange={(checked) => {
                      updateSettings({
                        ...globalSettings,
                        allow_private_network_ai: checked,
                      });
                    }}
                    disabled={settingsLoading}
                  />
                </div>
              )}

              {/* Global vision default: writes default_vision_ai_service_id, the
                  service the server routes vision tasks to for users who are on
                  the global default (no personal service configured). "None"
                  clears it so those users fall back to the global text default. */}
              {globalSettings && activeGlobalServices.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="global-vision-ai-service-select">
                    Fotoğraflar için hizmet
                  </Label>
                  <Select
                    value={visionDefaultId ?? GLOBAL_VISION_NONE}
                    onValueChange={handleVisionDefaultChange}
                  >
                    <SelectTrigger
                      id="global-vision-ai-service-select"
                      className="h-11 w-full"
                    >
                      <SelectValue
                        placeholder={t(
                          'settings.aiService.globalSettings.visionService',
                          'Global vision AI service'
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GLOBAL_VISION_NONE}>
                        Sohbetle aynı hizmet
                      </SelectItem>
                      {activeGlobalServices.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.service_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!showAddForm && (
                <Button
                  onClick={() => {
                    resetTestStatus();
                    setShowAddForm(true);
                  }}
                  variant="outline"
                  className="h-auto min-h-11 w-full whitespace-normal"
                >
                  <Plus className="mr-2 h-4 w-4 shrink-0" />
                  Başka bir AI hizmeti ekle
                </Button>
              )}

              {showAddForm && (
                <div className="rounded-xl border p-3">
                  <h3 className="mb-4 text-lg font-medium">
                    Başka bir AI hizmeti ekle
                  </h3>
                  <ServiceForm
                    formData={newService}
                    onFormDataChange={(data) =>
                      setNewService((prev) => ({ ...prev, ...data }))
                    }
                    onSubmit={handleAddService}
                    onCancel={() => {
                      resetTestStatus();
                      setShowAddForm(false);
                    }}
                    loading={loading}
                    translationPrefix="settings.aiService.globalSettings"
                    onTestConnection={(model) =>
                      testConnection({
                        service_type: newService.service_type,
                        api_key: newService.api_key,
                        custom_url: newService.custom_url ?? undefined,
                        model_name: model,
                      })
                    }
                    testing={isTesting}
                    testStatus={testStatus}
                  />
                </div>
              )}

              <ServiceList
                services={services}
                editingService={editingService}
                editData={editData}
                onEditDataChange={(data) =>
                  setEditData((prev) => ({ ...prev, ...data }))
                }
                onStartEdit={startEditing}
                onCancelEdit={cancelEditing}
                onUpdate={handleUpdateService}
                onDelete={openDeleteDialog}
                loading={loading}
                translationPrefix="settings.aiService.globalSettings"
                showGlobalBadge={true}
                onTestConnection={(serviceId, model) => {
                  const original = services.find((s) => s.id === serviceId);
                  testConnection({
                    id: serviceId,
                    service_type:
                      editData.service_type || original?.service_type || '',
                    api_key: editData.api_key,
                    custom_url: editData.custom_url ?? undefined,
                    model_name: model,
                  });
                }}
                testing={isTesting}
                testStatus={testStatus}
              />
            </CollapsibleContent>
          </Collapsible>

          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('settings.aiService.globalSettings.deleteConfirm')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('settings.aiService.globalSettings.deleteConfirm')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setServiceToDelete(null)}>
                  {t('settings.aiService.globalSettings.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteService}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('settings.aiService.globalSettings.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default GlobalAISettings;
