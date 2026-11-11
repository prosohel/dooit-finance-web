import DragDrop from '../DragDop';
import { Button } from './button';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';

const CustomDropZone = ({
  file,
  setFile,
  children,
  disabled = false,
  loading = false,
  url = null,
  error = false,
  className = '',
  imageContainerClassName = '',
  handleChange = () => {},
  ...props
}) => {
  const hasUploadedFile = typeof url === 'string' && url.length > 0;
  const hasLocalFile = Boolean(file);

  const renderIcon = () => {
    if (loading) {
      return <Loader2 className="size-5 animate-spin" />;
    }

    if (error) {
      return <XCircle className="size-5" />;
    }

    if (hasUploadedFile) {
      return <CheckCircle2 className="size-5" />;
    }

    return <Upload className="size-5" />;
  };

  const iconBadgeClassName = cn(
    'flex shrink-0 items-center justify-center rounded-full p-3 transition-colors',
    loading &&
      'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    error && 'bg-destructive/10 text-destructive',
    hasUploadedFile &&
      !error &&
      'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    !loading && !error && !hasUploadedFile && 'bg-primary/10 text-primary'
  );

  const containerClassName = cn(
    'group relative z-2 w-full overflow-hidden rounded-xl border-2 border-dashed px-5 py-5 transition-all duration-200',
    disabled && 'cursor-not-allowed opacity-50',
    !disabled &&
      !hasUploadedFile &&
      !loading &&
      !error &&
      'cursor-pointer hover:border-primary/50 hover:bg-muted/30',
    hasUploadedFile &&
      !error &&
      'border-solid border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20',
    error && 'border-solid border-destructive/50 bg-destructive/5',
    loading &&
      'border-solid border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20',
    hasUploadedFile
      ? 'flex flex-row items-center justify-between gap-4'
      : 'flex flex-col items-center justify-center gap-3 min-h-[120px]',
    className
  );

  const renderStatusHint = () => {
    if (loading) {
      return (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
          Uploading...
        </p>
      );
    }

    if (error) {
      return (
        <p className="text-xs font-medium text-destructive">
          Upload failed. Please try again.
        </p>
      );
    }

    if (hasUploadedFile) {
      return (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          Upload complete
        </p>
      );
    }

    return null;
  };

  const renderContent = () => {
    if (children) {
      return (
        <div
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3',
            hasUploadedFile ? 'flex-row' : 'flex-col text-center'
          )}
        >
          <div className={iconBadgeClassName}>{renderIcon()}</div>
          <div className="min-w-0 space-y-1">
            <div>{children}</div>
            {renderStatusHint()}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={iconBadgeClassName}>{renderIcon()}</div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Drop your file here or click to upload
          </p>
          <p className="text-xs text-muted-foreground">Or click to browse</p>
          {renderStatusHint()}
        </div>
      </div>
    );
  };

  return (
    <DragDrop
      classes=""
      disabled={disabled}
      handleChange={handleChange}
      {...props}
    >
      <div className={containerClassName}>
        {renderContent()}

        {hasUploadedFile ? (
          <div
            className={cn(
              'relative shrink-0 overflow-hidden rounded-lg border border-border bg-background shadow-sm ring-1 ring-border/60',
              'h-[50px] aspect-4/3',
              imageContainerClassName
            )}
          >
            <img
              src={url}
              alt="Uploaded document preview"
              className="size-full object-contain"
            />
          </div>
        ) : hasLocalFile ? (
          <div className="mt-1 flex max-w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium text-foreground max-w-40">
              {file?.name}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setFile(null)}
              className="!size-6 shrink-0 rounded-md !p-0"
              aria-label="Remove file"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    </DragDrop>
  );
};

export default CustomDropZone;
