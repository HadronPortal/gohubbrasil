import { useCallback, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ImageCropDialogProps = {
  file: File | null;
  open: boolean;
  title: string;
  cropShape?: "rect" | "round";
  aspect?: number;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function cropImage(file: File, source: string, area: Area) {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");

  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  );

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Não foi possível recortar a imagem."))),
      outputType,
      0.9,
    );
  });
  const extension = outputType === "image/png" ? "png" : "jpg";
  const basename = file.name.replace(/\.[^.]+$/, "") || "imagem";
  return new File([blob], `${basename}-recortada.${extension}`, { type: outputType });
}

export function ImageCropDialog({
  file,
  open,
  title,
  cropShape = "rect",
  aspect = 1,
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!file) {
      setSource(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setSource(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const completeCrop = useCallback((_area: Area, croppedAreaPixels: Area) => {
    setPixels(croppedAreaPixels);
  }, []);

  const confirm = async () => {
    if (!file || !source || !pixels) return;
    setProcessing(true);
    try {
      onConfirm(await cropImage(file, source, pixels));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="w-[calc(100%-24px)] max-w-md rounded-[8px] bg-white p-4 text-[#172033]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative h-80 overflow-hidden rounded-[8px] bg-slate-950">
          {source && (
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={completeCrop}
            />
          )}
        </div>
        <div className="space-y-2 py-2">
          <p className="text-xs font-semibold text-slate-600">Zoom</p>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-10 w-full accent-[#3157D5]"
            aria-label="Zoom da imagem"
          />
          <p className="text-center text-xs text-slate-500">Arraste a imagem para ajustar o enquadramento.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="h-12 rounded-[8px] !border-[#CBD5E1] !bg-white !text-[#172033] hover:!bg-[#F1F5F9]" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" className="h-12 rounded-[8px] !bg-[#3157D5] !text-white hover:!bg-[#274AC0]" onClick={confirm} disabled={!pixels || processing}>
            {processing ? "Recortando..." : "Usar imagem"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
