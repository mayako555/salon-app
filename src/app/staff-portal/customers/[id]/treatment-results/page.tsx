"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCustomerById, Customer } from "@/lib/customers";
import { getKarteByCustomer, KarteRecord } from "@/lib/karte";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar, Sparkles, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function TreatmentResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [photos, setPhotos] = useState<{url: string, description: string, date: any}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      if (typeof id !== 'string') return;
      const [cData, kData] = await Promise.all([
        getCustomerById(id),
        getKarteByCustomer(id)
      ]);
      setCustomer(cData);
      
      // Extract all treatment photos across all kartes
      const allPhotos: {url: string, description: string, date: any}[] = [];
      kData.forEach(karte => {
        if (karte.treatment_photos && karte.treatment_photos.length > 0) {
          karte.treatment_photos.forEach(p => {
            allPhotos.push({
              ...p,
              date: karte.date
            });
          });
        }
      });
      
      // Sort by date (already sorted in getKarteByCustomer, but let's be sure)
      setPhotos(allPhotos);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white/50 animate-pulse">Loading...</div>;
  if (!customer) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Customer not found</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 selection:bg-amber-500/30">
      {/* Premium Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="text-white/50 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="text-amber-400" size={20} />
              TREATMENT PROGRESS
            </h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
              Presentation for {customer.name}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-12 space-y-12">
        {photos.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20">
              <ImageIcon size={40} />
            </div>
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No treatment photos found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {photos.map((photo, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
                onClick={() => setSelectedPhoto(i)}
              >
                <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-slate-900 border border-white/5 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
                  <img 
                    src={photo.url} 
                    className="w-full h-full object-cover" 
                    alt={photo.description}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 opacity-80">
                      <Calendar size={12} />
                      {format(photo.date?.toDate?.() || photo.date, "yyyy.MM.dd")}
                    </div>
                    <h3 className="text-lg font-bold leading-tight group-hover:text-amber-200 transition-colors">
                      {photo.description || "Treatment Result"}
                    </h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Overlay Gallery */}
      <AnimatePresence>
        {selectedPhoto !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
            onClick={() => setSelectedPhoto(null)}
          >
            <Button 
              className="absolute top-6 right-6 text-white/50 hover:text-white"
              variant="ghost"
              onClick={() => setSelectedPhoto(null)}
            >
              <X size={24} />
            </Button>

            <motion.div 
              layoutId={`photo-${selectedPhoto}`}
              className="relative max-w-full max-h-[70vh] aspect-[4/5]"
            >
              <img 
                src={photos[selectedPhoto].url} 
                className="w-full h-full object-contain rounded-2xl shadow-2xl"
              />
            </motion.div>

            <div className="mt-8 text-center space-y-2">
              <p className="text-amber-400 font-black tracking-widest text-[10px] uppercase">
                {format(photos[selectedPhoto].date?.toDate?.() || photos[selectedPhoto].date, "yyyy MMMM dd")}
              </p>
              <h2 className="text-2xl font-black">{photos[selectedPhoto].description || "Treatment Result"}</h2>
            </div>

            <div className="mt-12 flex gap-4">
              <Button 
                variant="outline" 
                className="rounded-full border-white/10 hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhoto(prev => (prev! > 0 ? prev! - 1 : photos.length - 1));
                }}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                className="rounded-full border-white/10 hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPhoto(prev => (prev! < photos.length - 1 ? prev! + 1 : 0));
                }}
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
