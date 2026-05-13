import React from 'react';

const SWAG_ITEMS = [
  {
    id: 1,
    name: 'SpacePoint Keychain',
    description: 'A stylish 3D SpacePoint logo keychain to carry your orbit everywhere.',
    points: 500,
    image: '/images/keychain.png', // User will place image here
  },
  {
    id: 2,
    name: 'Mission Control Cap',
    description: 'Official black SpacePoint cap with violet logo embroidery.',
    points: 1200,
    image: '/images/cap.png',
  },
  {
    id: 3,
    name: 'Ambassador Polo',
    description: 'Premium black polo with the SpacePoint insignia and UAE flag patch.',
    points: 2500,
    image: '/images/polo.png',
  },
  {
    id: 4,
    name: 'SpacePoint Pin',
    description: 'Enamel pin for your jacket or backpack, showing your ambassador status.',
    points: 300,
    image: '/images/pin.png',
  }
];

export default function SwagCatalog() {
  return (
    <div className="min-h-screen bg-neutral p-md">
      <div className="max-w-6xl mx-auto">
        <header className="mb-lg">
          <h1 className="text-headline-display text-on-surface mb-xs">Swag Catalog</h1>
          <p className="text-body-lg text-secondary">Redeem your hard-earned points for official SpacePoint gear.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
          {SWAG_ITEMS.map((item) => (
            <div key={item.id} className="bg-tertiary rounded-lg border border-primary-90 overflow-hidden flex flex-col transition-transform hover:scale-[1.02] duration-300">
              <div className="h-48 bg-surface p-sm flex items-center justify-center">
                {/* Image placeholder - falls back to a div if not found */}
                <div className="w-full h-full relative group">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden absolute inset-0 bg-primary-90/50 flex-col items-center justify-center text-center p-sm rounded-md">
                    <span className="text-label-sm text-secondary">Image Missing</span>
                    <span className="text-xs text-on-surface mt-1">Save as {item.image}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-sm flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-headline-sm text-on-surface leading-tight">{item.name}</h3>
                  <span className="bg-primary-90 text-on-surface text-label-sm px-2 py-1 rounded-full whitespace-nowrap ml-2">
                    {item.points} pts
                  </span>
                </div>
                <p className="text-body-sm text-secondary mb-md flex-grow">
                  {item.description}
                </p>
                <button className="w-full bg-primary hover:bg-primary-60 text-on-surface text-label-md font-semibold py-3 rounded-full transition-colors mt-auto">
                  Redeem Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
