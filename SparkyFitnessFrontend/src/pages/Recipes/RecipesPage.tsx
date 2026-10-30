import { useState, type KeyboardEvent } from 'react';
import {
  BookmarkPlus,
  ChefHat,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatDateToYYYYMMDD } from '@/lib/utils';
import {
  useDeleteRecipe,
  useGenerateRecipe,
  useLogRecipe,
  useRecipes,
  useSaveRecipe,
  type Recipe,
  type RecipeKind,
  type RecipeRequest,
} from '@/hooks/Dgfit/useRecipes';

const KINDS: { value: RecipeKind; label: string; emoji: string }[] = [
  { value: 'shake', label: 'Shake', emoji: '🥤' },
  { value: 'kahvalti', label: 'Kahvaltı', emoji: '🍳' },
  { value: 'ana_yemek', label: 'Ana yemek', emoji: '🍗' },
  { value: 'salata', label: 'Salata', emoji: '🥗' },
  { value: 'atistirmalik', label: 'Atıştırmalık', emoji: '🥜' },
  { value: 'tatli', label: 'Tatlı', emoji: '🍫' },
];

const SWEETNESS = [
  { value: 'sekersiz', label: 'Şekersiz' },
  { value: 'az', label: 'Az tatlı' },
  { value: 'orta', label: 'Orta' },
  { value: 'cok', label: 'Çok tatlı' },
] as const;

const GOALS = [
  { value: 'kilo_ver', label: 'Kilo ver' },
  { value: 'koru', label: 'Koru' },
  { value: 'kas_kazan', label: 'Kas kazan' },
  { value: 'kilo_al', label: 'Kilo al' },
] as const;

const VOLUMES = [250, 350, 500, 750];
const CALORIE_PRESETS = [200, 300, 450, 600];
const SUGGESTED = [
  'muz',
  'yulaf',
  'süt',
  'yoğurt',
  'whey protein',
  'fıstık ezmesi',
  'yumurta',
  'tavuk göğsü',
  'pirinç',
  'kakao',
  'çilek',
  'bal',
];

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card hover:bg-muted'
    }`}
  >
    {children}
  </button>
);

const Macros = ({ recipe }: { recipe: Recipe }) => (
  <div className="grid grid-cols-4 gap-2 text-center">
    {[
      ['Kalori', `${Math.round(recipe.per_serving.calories)}`, 'kcal'],
      ['Protein', `${Math.round(recipe.per_serving.protein)}`, 'g'],
      ['Karb.', `${Math.round(recipe.per_serving.carbs)}`, 'g'],
      ['Yağ', `${Math.round(recipe.per_serving.fat)}`, 'g'],
    ].map(([label, value, unit]) => (
      <div key={label} className="rounded-xl bg-muted/50 py-2">
        <div className="text-lg font-bold">
          {value}
          <span className="text-xs font-normal text-muted-foreground">
            {' '}
            {unit}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    ))}
  </div>
);

const RecipeView = ({ recipe }: { recipe: Recipe }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-xl font-extrabold">{recipe.title}</h3>
      <p className="text-sm text-muted-foreground">{recipe.description}</p>
      <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {recipe.prep_minutes} dk
        </span>
        <span>{recipe.servings} porsiyon · değerler 1 porsiyon için</span>
      </p>
    </div>
    <Macros recipe={recipe} />
    <div>
      <h4 className="mb-2 font-semibold">Malzemeler</h4>
      <ul className="space-y-1 text-sm">
        {recipe.ingredients.map((item, i) => (
          <li key={i} className="flex justify-between gap-3 border-b pb-1">
            <span>{item.name}</span>
            <span className="text-muted-foreground">
              {item.amount}
              {item.grams ? ` (${Math.round(item.grams)} g)` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
    <div>
      <h4 className="mb-2 font-semibold">Hazırlanışı</h4>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm">
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
    {recipe.tips.length > 0 && (
      <div className="rounded-xl bg-primary/10 p-3 text-sm">
        {recipe.tips.map((tip, i) => (
          <p key={i}>💡 {tip}</p>
        ))}
      </div>
    )}
  </div>
);

const RecipesPage = () => {
  const [kind, setKind] = useState<RecipeKind>('shake');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [onlyThese, setOnlyThese] = useState(false);
  const [sweetness, setSweetness] = useState<RecipeRequest['sweetness']>();
  const [volume, setVolume] = useState<number | undefined>(350);
  const [calories, setCalories] = useState<string>('');
  const [goal, setGoal] = useState<RecipeRequest['goal']>();
  const [highProtein, setHighProtein] = useState(true);
  const [servings, setServings] = useState(1);
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<{
    recipe: Recipe;
    request: RecipeRequest;
  } | null>(null);
  const [openSaved, setOpenSaved] = useState<string | null>(null);

  const generate = useGenerateRecipe();
  const save = useSaveRecipe();
  const logRecipe = useLogRecipe();
  const remove = useDeleteRecipe();
  const { data: saved = [] } = useRecipes();
  const today = formatDateToYYYYMMDD(new Date());

  const addIngredient = (value: string) => {
    const name = value.trim().toLowerCase();
    if (name && !ingredients.includes(name) && ingredients.length < 25) {
      setIngredients([...ingredients, name]);
    }
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addIngredient(draft);
    }
  };

  const submit = () => {
    const pending = draft.trim() ? [draft.trim().toLowerCase()] : [];
    const all = [...new Set([...ingredients, ...pending])];
    if (pending.length) {
      setIngredients(all);
      setDraft('');
    }
    if (all.length === 0) return;
    const request: RecipeRequest = {
      kind,
      ingredients: all,
      only_these: onlyThese,
      sweetness: ['shake', 'tatli', 'kahvalti'].includes(kind)
        ? sweetness
        : undefined,
      volume_ml: kind === 'shake' ? volume : undefined,
      servings,
      target_calories: calories ? Number(calories) : undefined,
      goal,
      high_protein: highProtein,
      notes: notes.trim() || undefined,
    };
    generate.mutate(request, { onSuccess: (data) => setResult(data) });
  };

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <ChefHat className="h-6 w-6 text-primary" /> Tarifler
        </h2>
        <p className="text-sm text-muted-foreground">
          Elindeki malzemeleri yaz, PT AI hedefine uygun tarifi çıkarsın.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-4">
          <div className="space-y-2">
            <Label>Ne yapalım?</Label>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <Chip
                  key={k.value}
                  active={kind === k.value}
                  onClick={() => setKind(k.value)}
                >
                  {k.emoji} {k.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ingredient-input">Elindeki malzemeler</Label>
            <div className="flex gap-2">
              <Input
                id="ingredient-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="ör. muz, yulaf… (Enter ile ekle)"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => addIngredient(draft)}
                aria-label="Malzeme ekle"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ingredients.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-sm text-primary"
                  >
                    {item}
                    <button
                      type="button"
                      aria-label={`${item} çıkar`}
                      onClick={() =>
                        setIngredients(ingredients.filter((i) => i !== item))
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED.filter((s) => !ingredients.includes(s))
                .slice(0, 8)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addIngredient(s)}
                    className="rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    + {s}
                  </button>
                ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="only-these" className="font-normal">
                Sadece bu malzemeleri kullan
              </Label>
              <Switch
                id="only-these"
                checked={onlyThese}
                onCheckedChange={setOnlyThese}
              />
            </div>
          </div>

          {kind === 'shake' && (
            <div className="space-y-2">
              <Label>Miktar</Label>
              <div className="flex flex-wrap gap-2">
                {VOLUMES.map((v) => (
                  <Chip
                    key={v}
                    active={volume === v}
                    onClick={() => setVolume(v)}
                  >
                    {v} ml
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {['shake', 'tatli', 'kahvalti'].includes(kind) && (
            <div className="space-y-2">
              <Label>Tatlılık</Label>
              <div className="flex flex-wrap gap-2">
                {SWEETNESS.map((s) => (
                  <Chip
                    key={s.value}
                    active={sweetness === s.value}
                    onClick={() =>
                      setSweetness(sweetness === s.value ? undefined : s.value)
                    }
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="target-calories">
              Porsiyon başı hedef kalori (isteğe bağlı)
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {CALORIE_PRESETS.map((c) => (
                <Chip
                  key={c}
                  active={calories === String(c)}
                  onClick={() =>
                    setCalories(calories === String(c) ? '' : String(c))
                  }
                >
                  ~{c}
                </Chip>
              ))}
              <Input
                id="target-calories"
                type="number"
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="kcal"
                className="w-24"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amacın</Label>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <Chip
                  key={g.value}
                  active={goal === g.value}
                  onClick={() =>
                    setGoal(goal === g.value ? undefined : g.value)
                  }
                >
                  {g.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="high-protein" className="font-normal">
              Yüksek protein
            </Label>
            <Switch
              id="high-protein"
              checked={highProtein}
              onCheckedChange={setHighProtein}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label className="font-normal">Porsiyon</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setServings(Math.max(1, servings - 1))}
              >
                −
              </Button>
              <span className="w-6 text-center font-semibold">{servings}</span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setServings(Math.min(8, servings + 1))}
              >
                +
              </Button>
            </div>
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ek istek (ör. laktozsuz olsun, fırın yok)"
            className="min-h-16"
          />

          <Button
            className="h-12 w-full text-base font-semibold"
            onClick={submit}
            disabled={
              generate.isPending || (ingredients.length === 0 && !draft.trim())
            }
          >
            {generate.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> PT AI tarifini
                hazırlıyor…
              </>
            ) : (
              <>
                <ChefHat className="h-5 w-5" /> Tarif oluştur
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-primary/40">
          <CardContent className="space-y-4 p-4">
            <RecipeView recipe={result.recipe} />
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => save.mutate(result)}
                disabled={save.isPending}
              >
                <BookmarkPlus className="h-4 w-4" /> Kaydet
              </Button>
              <Button
                onClick={() =>
                  logRecipe.mutate({ recipe: result.recipe, date: today })
                }
                disabled={logRecipe.isPending}
              >
                <UtensilsCrossed className="h-4 w-4" /> Yedim
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  generate.mutate(result.request, {
                    onSuccess: (data) => setResult(data),
                  })
                }
                disabled={generate.isPending}
              >
                <RefreshCw className="h-4 w-4" /> Başka
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tariflerim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {saved.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Kaydettiğin tarifler burada görünür.
            </p>
          ) : (
            saved.map((item) => (
              <div key={item.id} className="rounded-xl border">
                <button
                  type="button"
                  onClick={() =>
                    setOpenSaved(openSaved === item.id ? null : item.id)
                  }
                  className="flex w-full items-center justify-between gap-3 p-3 text-left"
                >
                  <span className="font-semibold">
                    {KINDS.find((k) => k.value === item.kind)?.emoji}{' '}
                    {item.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(item.recipe.per_serving.calories)} kcal
                  </span>
                </button>
                {openSaved === item.id && (
                  <div className="space-y-3 border-t p-3">
                    <RecipeView recipe={item.recipe} />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() =>
                          logRecipe.mutate({ recipe: item.recipe, date: today })
                        }
                      >
                        <UtensilsCrossed className="h-4 w-4" /> Yedim
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Tarifi sil"
                        onClick={() => remove.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipesPage;
