import { Camera, Filter, MapPin, Plus, X } from "lucide-react";
import { useState } from "react";

const mockPhotos = [
  { id: 1, type: "Antes", date: "2026-05-29 08:15", location: "Rua das Acácias, 234", description: "Área antes da instalação", thumb: "" },
  { id: 2, type: "Depois", date: "2026-05-29 12:30", location: "Rua das Acácias, 234", description: "Armário instalado", thumb: "" },
  { id: 3, type: "Problema", date: "2026-05-29 08:20", location: "Rua das Acácias, 234", description: "Piso danificado na entrega", thumb: "" },
  { id: 4, type: "Antes", date: "2026-05-28 09:00", location: "Av. Brasil, 1500", description: "Medição inicial", thumb: "" },
  { id: 5, type: "Depois", date: "2026-05-28 17:00", location: "Av. Brasil, 1500", description: "Painel finalizado", thumb: "" },
  { id: 6, type: "Antes", date: "2026-05-28 09:10", location: "Av. Brasil, 1500", description: "Furação em andamento", thumb: "" },
  { id: 7, type: "Problema", date: "2026-05-27 10:00", location: "Rua das Palmeiras, 567", description: "Peça com risco", thumb: "" },
  { id: 8, type: "Depois", date: "2026-05-27 16:00", location: "Rua das Palmeiras, 567", description: "Resultado final", thumb: "" },
  { id: 9, type: "Antes", date: "2026-05-26 08:30", location: "Av. Central, 200", description: "Montagem inicial", thumb: "" },
];

const typeColors: Record<string, string> = {
  Antes: "bg-blue-100 text-blue-700",
  Depois: "bg-emerald-100 text-emerald-700",
  Problema: "bg-red-100 text-red-700",
};

const typeBgColors: Record<string, string> = {
  Antes: "bg-blue-500",
  Depois: "bg-emerald-500",
  Problema: "bg-red-500",
};

export default function FotosMontador() {
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [lightboxPhoto, setLightboxPhoto] = useState<number | null>(null);

  const filters = ["Todas", "Antes", "Depois", "Problema"];

  const filteredPhotos =
    activeFilter === "Todas"
      ? mockPhotos
      : mockPhotos.filter((p) => p.type === activeFilter);

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-blue-600 px-4 pt-6 pb-4 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">Fotos</h1>
            <p className="text-blue-200 text-sm mt-1">{filteredPhotos.length} fotos</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <Camera className="text-white w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeFilter === filter
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 shadow-sm"
              }`}
            >
              {filter !== "Todas" && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    filter === "Antes"
                      ? "bg-blue-400"
                      : filter === "Depois"
                      ? "bg-emerald-400"
                      : "bg-red-400"
                  }`}
                />
              )}
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Photo Grid */}
      <div className="px-4">
        <div className="grid grid-cols-3 gap-2">
          {filteredPhotos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightboxPhoto(photo.id)}
              className="aspect-square rounded-2xl overflow-hidden relative group bg-gray-200"
            >
              <div className={`absolute inset-0 ${typeBgColors[photo.type]} opacity-10`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className={`w-8 h-8 ${typeBgColors[photo.type].replace("bg-", "text-").replace("-500", "-400")}`} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <span className={`text-white text-xs font-semibold ${typeBgColors[photo.type].replace("-500", "-400")}`}>
                  {photo.type}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
        <Camera className="text-white w-6 h-6" />
      </button>

      {/* Lightbox Modal */}
      {lightboxPhoto !== null && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex flex-col"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="flex items-center justify-between p-4">
            <span className="text-white font-semibold">
              {mockPhotos.find((p) => p.id === lightboxPhoto)?.type}
            </span>
            <button
              onClick={() => setLightboxPhoto(null)}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="text-white w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-gray-200 border-2 border-dashed rounded-2xl w-64 h-64 flex items-center justify-center">
              <Camera className="w-16 h-16 text-gray-400" />
            </div>
          </div>
          <div className="p-4 bg-black/60">
            {(() => {
              const photo = mockPhotos.find((p) => p.id === lightboxPhoto);
              return (
                <div className="flex items-start gap-3">
                  <Filter className="text-white w-4 h-4 mt-0.5" />
                  <div>
                    <p className="text-white font-medium text-sm">{photo?.description}</p>
                    <p className="text-white/60 text-xs mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {photo?.location}
                    </p>
                    <p className="text-white/60 text-xs mt-0.5">{photo?.date}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}