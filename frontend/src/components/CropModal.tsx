import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, Check } from "./icons";
import { useT } from "../i18n";

interface CropModalProps {
  image: string;
  onCropComplete: (blob: Blob) => void;
  onCancel: () => void;
  aspect?: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

export default function CropModal({
  image,
  onCropComplete,
  onCancel,
  aspect = 1,
}: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useT();

  const handleConfirm = async () => {
    if (!pixels) return;
    setLoading(true);
    try {
      const blob = await getCroppedBlob(image, pixels);
      onCropComplete(blob);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={t("cropModal.title")}>
      <div className="modal-box w-full max-w-lg overflow-hidden flex flex-col p-0">
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <h3
            className="font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {t("cropModal.title")}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-(--bg-hover) transition-colors"
            aria-label={t("cropModal.cancel")}
          >
            <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="relative h-80 bg-black/90">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(__, a) => setPixels(a)}
          />
        </div>

        <div
          className="flex items-center justify-center gap-4 px-4 py-3 border-b"
          style={{
            background: "var(--bg-hover)",
            borderColor: "var(--border)",
          }}
        >
          <ZoomOut className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-40"
            aria-label={t("cropModal.zoom") || "Zoom level"}
            style={{ accentColor: "var(--accent)" }}
          />
          <ZoomIn className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        </div>

        <div
          className="flex justify-end gap-2 p-4"
          style={{ background: "var(--bg-card)" }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg text-sm transition-colors hover:bg-(--bg-hover)"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            {t("cropModal.cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !pixels}
            className="btn-primary py-2 px-4 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {loading ? t("common.processing") : t("cropModal.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
