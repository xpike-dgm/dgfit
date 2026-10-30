import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAiUsage } from '@/hooks/Dgfit/useAccount';

const fmt = (value: number | string) => Number(value).toLocaleString('tr-TR');

/** DG FIT admin card: who used PT AI and how much. */
const AiUsage = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAiUsage(days);
  const totalRequests = (data?.totals ?? []).reduce(
    (sum, row) => sum + row.requests,
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          PT AI Kullanımı
        </CardTitle>
        <CardDescription>
          Kişi başı mesaj ve token sayıları (sınır yok, yalnızca takip).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex rounded-xl bg-raised p-1">
          {[7, 30, 90].map((value) => (
            <Button
              key={value}
              size="sm"
              variant="ghost"
              className={`flex-1 rounded-lg ${
                days === value
                  ? 'bg-card text-foreground shadow-sm hover:bg-card'
                  : 'text-caption'
              }`}
              onClick={() => setDays(value)}
            >
              Son {value} gün
            </Button>
          ))}
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        ) : !data?.totals.length ? (
          <p className="text-sm text-muted-foreground">
            Bu dönemde PT AI kullanılmadı.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Toplam {fmt(totalRequests)} mesaj
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Kişi</th>
                    <th className="py-2 pr-3 text-right">Mesaj</th>
                    <th className="py-2 pr-3 text-right">Giriş token</th>
                    <th className="py-2 pr-3 text-right">Çıkış token</th>
                    <th className="py-2 text-right">Son</th>
                  </tr>
                </thead>
                <tbody>
                  {data.totals.map((row) => (
                    <tr key={row.user_id} className="border-t">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {row.models.join(', ')}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {fmt(row.requests)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {fmt(row.input_tokens)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {fmt(row.output_tokens)}
                      </td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {String(row.last_day).slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AiUsage;
