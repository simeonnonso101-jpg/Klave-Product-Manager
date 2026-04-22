import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { customFetch } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Upload } from "lucide-react";

const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB hard cap on what we'll let the browser even read.
const OUTPUT_SIZE = 512; // square px we render to before upload
const OUTPUT_MIME = "image/jpeg";
const OUTPUT_QUALITY = 0.9;

type Props = {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onUploaded: (objectPath: string, servingUrl: string) => void;
  onError: (msg: string) => void;
};

/**
 * Crop + upload modal for profile avatars.
 *
 * Flow:
 *   1. Read the picked file into an object URL for the cropper.
 *   2. User crops with react-easy-crop (1:1 aspect, zoomable).
 *   3. We rasterize the crop to a 512×512 JPEG in a canvas (keeps prod-side
 *      file sizes small and consistent).
 *   4. Request a presigned URL, PUT the blob directly to GCS, then hand the
 *      normalized objectPath back to the caller — the caller decides what to
 *      do with it (PATCH /users/me, set group cover, etc.).
 */
export function AvatarCropUploader({ open, file, onClose, onUploaded, onError }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPx, setCroppedAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  // Build/revoke the object URL whenever the source file changes. Without the
  // revoke we'd leak memory across multiple opens.
  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_: Area, areaPx: Area) => {
    setCroppedAreaPx(areaPx);
  }, []);

  const handleSave = useCallback(async () => {
    if (!file || !imageUrl || !croppedAreaPx) return;
    setBusy(true);
    try {
      const blob = await renderCroppedJpeg(imageUrl, croppedAreaPx);
      // Step 1: get a presigned URL from our API.
      const ticket = await customFetch<{ uploadURL: string; objectPath: string }>(
        "/api/storage/uploads/request-url",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
            size: blob.size,
            contentType: OUTPUT_MIME,
          }),
        },
      );
      // Step 2: PUT the bytes directly to GCS — bypasses our server entirely.
      const putRes = await fetch(ticket.uploadURL, {
        method: "PUT",
        headers: { "Content-Type": OUTPUT_MIME },
        body: blob,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }
      // The objectPath returned already starts with "/objects/...". The browser
      // can fetch it via /api/storage<objectPath>.
      const servingUrl = `/api/storage${ticket.objectPath}`;
      onUploaded(ticket.objectPath, servingUrl);
      onClose();
    } catch (err: any) {
      onError(err?.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [file, imageUrl, croppedAreaPx, onUploaded, onClose, onError]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="text-base font-bold">Position your photo</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[320px] bg-black">
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-[12px] font-semibold text-muted-foreground mb-2">Zoom</p>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(v) => setZoom(v[0] ?? 1)}
              disabled={busy}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={busy || !croppedAreaPx}
              className="rounded-full bg-gradient-to-r from-[#5A1DE6] to-[#3A0CA3] text-white border-0 hover:opacity-90 shadow-sm shadow-[#5A1DE6]/25"
            >
              {busy ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Uploading</>
              ) : (
                <><Upload className="h-4 w-4 mr-1.5" /> Save photo</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hidden file input wrapper. Renders nothing visible — the parent triggers it
 * via a ref.
 */
export function useAvatarFilePicker(onPick: (file: File) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const open = useCallback(() => ref.current?.click(), []);
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        // Reset the input so re-picking the same file still fires onChange.
        if (e.target) e.target.value = "";
        if (!f) return;
        if (f.size > MAX_INPUT_BYTES) {
          alert("That image is too large. Please pick one under 8 MB.");
          return;
        }
        onPick(f);
      }}
    />
  );
  return { open, input };
}

/**
 * Loads the source image, draws the cropped square into a 512×512 canvas, and
 * returns the resulting JPEG blob. We always JPEG-encode for predictable
 * file sizes and to strip metadata.
 */
async function renderCroppedJpeg(srcUrl: string, area: Area): Promise<Blob> {
  const img = await loadImage(srcUrl);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    area.x, area.y, area.width, area.height,
    0, 0, OUTPUT_SIZE, OUTPUT_SIZE,
  );
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, OUTPUT_MIME, OUTPUT_QUALITY),
  );
  if (!blob) throw new Error("Could not encode image");
  return blob;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}
