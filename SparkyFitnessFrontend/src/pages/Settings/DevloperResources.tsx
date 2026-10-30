import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'; // Import Accordion components
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const DeveloperResources = () => {
  const { t } = useTranslation();
  return (
    <AccordionItem
      value="developer-resources"
      className="mb-3 rounded-2xl border-0 bg-card shadow-[0_1px_3px_rgba(15,23,41,0.06),0_1px_2px_rgba(15,23,41,0.04)] dark:shadow-none"
    >
      <AccordionTrigger
        className="flex items-center gap-2 p-4 hover:no-underline"
        description={t(
          'settings.developerResources.description',
          'Access API documentation and resources'
        )}
      >
        <BookOpen className="h-5 w-5" />
        {t('settings.developerResources.title', 'Developer Resources')}
      </AccordionTrigger>
      <AccordionContent className="min-w-0 space-y-4 break-words p-4 pt-0">
        <div className="grid gap-4">
          <div className="flex flex-col space-y-2">
            <h4 className="font-medium">
              {t(
                'settings.developerResources.apiDocumentation',
                'API Documentation'
              )}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t(
                'settings.developerResources.exploreTheSparkyFitnessAPIDocumentation',
                'Explore the SparkyFitness API documentation to build integrations or understand the platform better.'
              )}
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-4">
              <Button variant="outline" className="h-11 whitespace-normal" asChild>
                <a
                  href="/api/api-docs/swagger"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(
                    'settings.developerResources.swaggerUIInteractive',
                    'Swagger UI (Interactive)'
                  )}
                </a>
              </Button>
              <Button variant="outline" className="h-11 whitespace-normal" asChild>
                <a
                  href="/api/api-docs/redoc"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(
                    'settings.developerResources.redocReadOnly',
                    'Redoc (Read-only)'
                  )}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
