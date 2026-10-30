import { useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Trash2, Columns2, Film, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import {
  checkInPhotoFileUrl,
  useCheckInPhotoGallery,
  useCheckInPhotos,
  type PhotoType,
  type CheckInPhoto,
} from '@/hooks/CheckIn/useCheckInPhotos';
import { hasComparableAngle, PHOTO_ANGLES } from '@/utils/progressPhotos';
import { ProgressPhotoCompareDialog } from './ProgressPhotoCompareDialog';
import { ProgressPhotoTimelapseDialog } from './ProgressPhotoTimelapseDialog';

interface PhotoSlotProps {
  type: PhotoType;
  label: string;
  photo: CheckInPhoto | undefined;
  date: string;
  onUpload: (type: PhotoType, file: File) => void;
  onDelete: (id: string) => void;
  // True only while THIS slot's upload is in flight (drives the spinner).
  isUploading: boolean;
  // True while ANY slot is uploading — blocks interaction on every slot so a
  // second upload can't race the in-flight one.
  disabled: boolean;
}

const PhotoSlot = ({
  type,
  label,
  photo,
  date: _date,
  onUpload,
  onDelete,
  isUploading,
  disabled,
}: PhotoSlotProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onUpload(type, file);
        // Reset input so the same file can be re-selected after deletion
        e.target.value = '';
      }
    },
    [type, onUpload]
  );

  const photoUrl = photo ? checkInPhotoFileUrl(photo.id) : null;

  const uploadLabel = photo
    ? t('checkIn.photos.replace', 'Replace')
    : t('checkIn.photos.upload', 'Upload');

  return (
    // min-w-0: a grid item will not shrink below its content by default, so on
    // a phone the button row pushed the third slot out of the card.
    <div className="flex min-w-0 flex-col items-center gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>

      {/* The whole tile is the upload button: tap to add, tap again to
          replace. */}
      <button
        type="button"
        disabled={disabled}
        aria-label={`${label}: ${uploadLabel}`}
        className="relative w-full aspect-[3/4] rounded-xl border border-dashed border-border bg-raised overflow-hidden
                   flex items-center justify-center group disabled:cursor-default"
        onClick={() => fileInputRef.current?.click()}
      >
        {photoUrl ? (
          <>
            <img
              src={photoUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-8 w-8 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground pointer-events-none">
            <Camera className="h-8 w-8" />
            <span className="text-xs text-center px-2">
              {t('checkIn.photos.tapToUpload', 'Tap to upload')}
            </span>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>

      {/* Hidden file input — no capture attribute so mobile users can pick
          either the camera or an existing photo from the gallery. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {photo && (
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full gap-1.5 px-2 text-destructive hover:text-destructive"
          disabled={disabled}
          aria-label={`${label}: ${t('checkIn.photos.remove', 'Remove photo')}`}
          onClick={() => onDelete(photo.id)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-xs">Sil</span>
        </Button>
      )}
    </div>
  );
};

interface CheckInPhotosProps {
  selectedDate: string;
  /** Opens the measurements for a day, for a photo day without a weight. */
  onLogWeight?: (date: string) => void;
}

export const CheckInPhotos = ({
  selectedDate,
  onLogWeight,
}: CheckInPhotosProps) => {
  const { t } = useTranslation();
  const {
    photos,
    uploadPhoto,
    deletePhoto,
    isUploading,
    uploadingType,
    isDeleting,
  } = useCheckInPhotos(selectedDate);

  // The whole history backs the comparison and the time-lapse. Their buttons
  // only show once some angle has two days to work with.
  const { days: galleryDays } = useCheckInPhotoGallery();
  const canCompare = hasComparableAngle(galleryDays);
  const [compareOpen, setCompareOpen] = useState(false);
  const [timelapseOpen, setTimelapseOpen] = useState(false);
  const compareButtonRef = useRef<HTMLButtonElement>(null);
  const timelapseButtonRef = useRef<HTMLButtonElement>(null);

  // Logging a weight happens on the Measurements tab, so close whichever
  // dialog asked before switching there.
  const handleLogWeight = onLogWeight
    ? (date: string) => {
        setCompareOpen(false);
        setTimelapseOpen(false);
        onLogWeight(date);
      }
    : undefined;

  const photoMap = useMemo(
    () => new Map(photos.map((p) => [p.photo_type, p])),
    [photos]
  );

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>İlerleme fotoğrafları</CardTitle>
          {canCompare && (
            <div className="flex gap-2">
              <Button
                ref={compareButtonRef}
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setCompareOpen(true)}
              >
                <Columns2 className="h-4 w-4 mr-1.5" />
                {t('checkIn.photos.compare', 'Compare')}
              </Button>
              <Button
                ref={timelapseButtonRef}
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setTimelapseOpen(true)}
              >
                <Film className="h-4 w-4 mr-1.5" />
                {t('checkIn.photos.timelapse', 'Time-lapse')}
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Önden, arkadan ve yandan birer fotoğraf ekle; değişimi zamanla gör.
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Fotoğraflarını yalnızca sen görürsün.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {PHOTO_ANGLES.map(({ type, labelKey, defaultLabel }) => (
            <PhotoSlot
              key={type}
              type={type}
              label={t(labelKey, defaultLabel)}
              photo={photoMap.get(type)}
              date={selectedDate}
              onUpload={uploadPhoto}
              onDelete={setPendingDelete}
              isUploading={isUploading && uploadingType === type}
              disabled={isUploading || isDeleting}
            />
          ))}
        </div>
      </CardContent>
      <ConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Fotoğraf silinsin mi?"
        description="Silinen fotoğraf geri alınamaz."
        variant="destructive"
        confirmLabel="Sil"
        onConfirm={() => {
          const id = pendingDelete;
          setPendingDelete(null);
          if (id) deletePhoto(id);
        }}
      />
      <ProgressPhotoCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        days={galleryDays}
        onLogWeight={handleLogWeight}
        returnFocusRef={compareButtonRef}
      />
      <ProgressPhotoTimelapseDialog
        open={timelapseOpen}
        onOpenChange={setTimelapseOpen}
        days={galleryDays}
        onLogWeight={handleLogWeight}
        returnFocusRef={timelapseButtonRef}
      />
    </Card>
  );
};
