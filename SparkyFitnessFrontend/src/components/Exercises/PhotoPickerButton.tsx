import { useRef, type ChangeEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoPickerButtonProps {
  id?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  multiple?: boolean;
  /** What is picked now, e.g. "2 fotoğraf seçildi"; shown next to the button. */
  selectedLabel?: string | null;
  label?: string;
}

/**
 * Turkish photo picker. The browser's own file input reads "Choose Files /
 * No file chosen" in English whatever the page language is, so it is hidden
 * behind a normal button.
 */
const PhotoPickerButton = ({
  id,
  onChange,
  multiple = false,
  selectedLabel,
  label = 'Fotoğraf seç',
}: PhotoPickerButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        className="h-11 gap-2"
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="h-4 w-4" />
        {label}
      </Button>
      {selectedLabel && (
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          {selectedLabel}
        </span>
      )}
    </div>
  );
};

export default PhotoPickerButton;
