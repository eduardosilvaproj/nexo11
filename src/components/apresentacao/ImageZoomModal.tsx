import { Dialog, DialogContent } from "@/components/ui/dialog";

export function ImageZoomModal({
  open, onOpenChange, src, alt,
}: { open: boolean; onOpenChange: (o: boolean) => void; src: string; alt: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-fit p-0 bg-[#0A0E1A]/95 backdrop-blur-2xl border-white/10">
        <img src={src} alt={alt} className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg" />
      </DialogContent>
    </Dialog>
  );
}
