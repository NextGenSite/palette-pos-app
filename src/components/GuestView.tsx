import React from 'react';
import { FileText, MapPin } from 'lucide-react';

interface GuestViewProps {
  pdfMenu: string | null;
  menuImages: string[];
}

export const GuestView: React.FC<GuestViewProps> = ({ menuImages }) => {

  return (
    <div className="max-w-4xl mx-auto py-6 md:py-10 px-4">
      <div className="text-center mb-12">
        <h2 className="text-5xl font-black mb-4 tracking-tight text-[#4A3728]">PALETTE CAFÉ</h2>
        <p className="text-[#4A3728]/70 text-xl italic font-serif">Artisan Coffee & Craft Pastries</p>
      </div>

      <div className="space-y-12">
        <div className="bg-white p-4 md:p-8 rounded-[2rem] shadow-2xl border border-[#4A3728]/5">
          <div className="flex items-center gap-4 mb-10 border-b border-[#4A3728]/5 pb-6">
            <div className="bg-[#D97706]/10 p-3 rounded-2xl">
              <FileText size={32} className="text-[#D97706]" />
            </div>
            <div>
              <h3 className="text-3xl font-bold uppercase tracking-wide">Our Menu</h3>
              <p className="text-[#4A3728]/50 font-medium">Scroll down to explore</p>
            </div>
          </div>

          {menuImages.length === 0 ? (
            <div className="text-center text-[#4A3728]/60 py-10 border border-dashed border-[#4A3728]/20 rounded-2xl">
              No menu images uploaded yet. Admin can upload your exact menu photos in Admin / Digital Menu.
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {menuImages.map((src, index) => (
                <div key={index} className="w-full rounded-2xl overflow-hidden shadow-lg border border-[#4A3728]/10 bg-[#FDF8F3]">
                  <img
                    src={src}
                    alt={`Menu Page ${index + 1}`}
                    className="w-full h-auto object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-[#4A3728] text-[#FDF8F3] p-8 rounded-[2rem] shadow-xl">
              <h3 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4">Opening Hours</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium opacity-60">Mon - Fri</span>
                  <span className="font-bold">08:00 - 18:00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium opacity-60">Sat - Sun</span>
                  <span className="font-bold">09:00 - 19:00</span>
                </div>
              </div>
           </div>
           
           <div className="bg-[#D97706] text-white p-8 rounded-[2rem] shadow-xl flex flex-col justify-center items-center text-center">
              <MapPin size={40} className="mb-4" />
              <h3 className="text-2xl font-bold mb-2">Location</h3>
              <p className="font-medium opacity-90">Main Street 123, Coffee City</p>
              <p className="text-sm mt-4 opacity-70">Follow us @palette_coffee_shop</p>
           </div>
        </div>
      </div>
    </div>
  );
};
